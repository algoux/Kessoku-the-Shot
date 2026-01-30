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

  async startBroadcaster(trackId: string, stream: MediaStream, options?: ProducerOptions) {
    const existingProducer = this.trackIdtoProducer.get(trackId) || [];
    const hasActiveProducer = existingProducer.some((producer) => !producer.closed);
    if (hasActiveProducer) {
      console.log(`Producer for trackId ${trackId} already exists and is active`);
      return;
    }
    const producer = await this.sendTransport.produce({
      track: stream.getTracks()[0].clone(),
      ...options,
    });
    this.producers.set(producer.id, producer);
    const trackIdtoProducers = this.trackIdtoProducer.get(trackId) || [];
    trackIdtoProducers.push(producer);
    this.trackIdtoProducer.set(trackId, trackIdtoProducers);
    console.log(`Started broadcaster for trackId ${trackId} with producerId ${producer.id}`);
  }

  closeProducers() {
    console.log('close producer');
    for (const [producerId, producer] of this.producers.entries()) {
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
