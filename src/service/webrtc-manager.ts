import * as mediasoupClient from 'mediasoup-client';
import {
  ProducerOptions,
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
  private producers: Map<string, Producer[]> = new Map();
  private trackIdtoProducer: Map<string, Producer> = new Map();

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
    console.log('Creating send transport with options:', transport);
    this.sendTransport = this.device.createSendTransport(transport);

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.signal.connectTransport(dtlsParameters);
        callback();
      } catch (error) {
        errback(error);
      }
    });

    this.sendTransport.on(
      'produce',
      async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const { producerId } = await this.signal.produce({
            trackId: 'camera_main',
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

  async startBroadcaster(trackId:string, track: MediaStreamTrack, options?: ProducerOptions) {
    if (this.trackIdtoProducer.has(trackId)) return;
    const producer = await this.sendTransport.produce({
      track,
      ...options,
    });
    if (!this.producers.has(track.kind)) this.producers.set(track.kind, []);
    this.producers.get(track.kind)!.push(producer);
    this.trackIdtoProducer.set(trackId, producer);
  }

  closeProducers() {
    for (const producerList of this.producers.values()) {
      for (const producer of producerList) {
        producer.close();
      }
    }
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
