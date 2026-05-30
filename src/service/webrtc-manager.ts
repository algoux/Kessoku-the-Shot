import * as mediasoupClient from 'mediasoup-client';
import {
  Device,
  Transport,
  Producer,
  TransportOptions,
  RtpCapabilities,
  DtlsParameters,
} from 'mediasoup-client/types';
import { OnProduceReqDTO, OnProduceResDTO, TrackType } from '@/typings/data';

export default class WebRTCManager {
  private device: Device;
  private sendTransport: Transport;
  private sendTransportConnectionState: RTCPeerConnectionState = 'new';
  private producers: Map<string, Producer> = new Map();
  private trackIdtoProducer: Map<string, Producer[]> = new Map();

  constructor(
    private readonly signal: {
      connectTransport: (dtlsParameters: DtlsParameters) => Promise<void>;
      produce: (params: OnProduceReqDTO) => Promise<OnProduceResDTO>;
    },
  ) {}

  async loadMediasoupClientDevice(routerRtpCapabilities: RtpCapabilities) {
    this.device = new mediasoupClient.Device();
    await this.device.load({ routerRtpCapabilities });
  }

  async createSendTransport(transport: TransportOptions) {
    this.sendTransport = this.device.createSendTransport(transport);

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.signal.connectTransport(dtlsParameters);
        callback();
      } catch (error) {
        errback(error);
      }
    });

    this.sendTransport.on('connectionstatechange', (connectionState) => {
      this.sendTransportConnectionState = connectionState;
      if (connectionState === 'failed' || connectionState === 'closed') {
        this.closeProducers();
      }
    });

    this.sendTransport.on(
      'produce',
      async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const trackId = appData.trackId;
          if (typeof trackId !== 'string') {
            throw new Error('Missing trackId in producer appData');
          }
          const { producerId } = await this.signal.produce({
            trackId,
            kind: kind as TrackType,
            rtpParameters,
          });
          callback({ id: producerId });
        } catch (error) {
          errback(error);
        }
      },
    );
  }

  async startBroadcaster(trackId: string, stream: MediaStream) {
    const existingProducer = this.trackIdtoProducer.get(trackId) || [];
    const hasActiveProducer =
      this.sendTransportConnectionState !== 'failed' &&
      existingProducer.some((producer) => !producer.closed);
    if (hasActiveProducer) {
      return;
    }
    if (this.sendTransportConnectionState === 'failed') {
      throw new Error('Send transport is failed. Check ICE candidates and network reachability.');
    }
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error(`No video track available for trackId ${trackId}`);
    }
    if (videoTrack.readyState !== 'live') {
      throw new Error(`Video track for trackId ${trackId} is not live`);
    }
    const producer = await this.sendTransport.produce({
      track: videoTrack,
      stopTracks: false,
      appData: { trackId },
    });
    this.producers.set(producer.id, producer);
    const trackIdtoProducers = this.trackIdtoProducer.get(trackId) || [];
    trackIdtoProducers.push(producer);
    this.trackIdtoProducer.set(trackId, trackIdtoProducers);
  }

  closeProducers() {
    for (const producer of this.producers.values()) {
      if (!producer.closed) {
        producer.close();
      }
    }
    this.producers.clear();
    this.trackIdtoProducer.clear();
  }

  closeSendTransport() {
    if (this.sendTransport) {
      this.sendTransport.close();
    }
  }

  getEventListenerFunctions() {
    return {
      closeProducers: this.closeProducers.bind(this),
      cleanUpMediatransport: this.closeSendTransport.bind(this),
    };
  }
}
