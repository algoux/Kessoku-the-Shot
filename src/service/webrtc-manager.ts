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
  private sendTransportConnectionState: RTCPeerConnectionState = 'new';
  private sendTransportStatsTimer?: number;
  private producers: Map<string, Producer> = new Map();
  private trackIdtoProducer: Map<string, Producer[]> = new Map();
  private producerStatsTimers: Map<string, number> = new Map();

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
    console.log(
      'Send transport ICE candidates:',
      JSON.stringify(
        transport.iceCandidates?.map((candidate) => ({
          foundation: candidate.foundation,
          ip: candidate.ip,
          port: candidate.port,
          protocol: candidate.protocol,
          type: candidate.type,
          tcpType: candidate.tcpType,
        })),
        null,
        2,
      ),
    );
    this.sendTransport = this.device.createSendTransport(transport);
    this.startSendTransportStatsLog();

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
      console.log('Send transport connection state:', connectionState);
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

  async startBroadcaster(trackId: string, stream: MediaStream, options?: ProducerOptions) {
    const existingProducer = this.trackIdtoProducer.get(trackId) || [];
    const hasActiveProducer =
      this.sendTransportConnectionState !== 'failed' &&
      existingProducer.some((producer) => !producer.closed);
    if (hasActiveProducer) {
      console.log(`Producer for trackId ${trackId} already exists and is active`);
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
      ...options,
    });
    this.producers.set(producer.id, producer);
    const trackIdtoProducers = this.trackIdtoProducer.get(trackId) || [];
    trackIdtoProducers.push(producer);
    this.trackIdtoProducer.set(trackId, trackIdtoProducers);
    this.startProducerStatsLog(trackId, producer);
    console.log(`Started broadcaster for trackId ${trackId} with producerId ${producer.id}`);
  }

  closeProducers() {
    console.log('close producer');
    for (const [producerId, producer] of this.producers.entries()) {
      if (!producer.closed) {
        producer.close();
      }
      const timer = this.producerStatsTimers.get(producerId);
      if (timer) {
        window.clearInterval(timer);
      }
    }
    this.producers.clear();
    this.trackIdtoProducer.clear();
    this.producerStatsTimers.clear();
  }

  closeSendTransport() {
    if (this.sendTransport) {
      this.sendTransport.close();
    }
    if (this.sendTransportStatsTimer) {
      window.clearInterval(this.sendTransportStatsTimer);
      this.sendTransportStatsTimer = undefined;
    }
  }

  getEventListenerFunctions() {
    return {
      closeProducers: this.closeProducers.bind(this),
      cleanUpMediatransport: this.closeSendTransport.bind(this),
    };
  }

  private startProducerStatsLog(trackId: string, producer: Producer) {
    const timer = window.setInterval(async () => {
      if (producer.closed) {
        window.clearInterval(timer);
        this.producerStatsTimers.delete(producer.id);
        return;
      }

      const stats = await producer.getStats();
      stats.forEach((report) => {
        if (report.type === 'outbound-rtp' && !report.isRemote) {
          console.log('Producer outbound stats:', {
            trackId,
            producerId: producer.id,
            bytesSent: report.bytesSent,
            framesEncoded: report.framesEncoded,
            packetsSent: report.packetsSent,
            qualityLimitationReason: report.qualityLimitationReason,
          });
        }
      });
    }, 3000);

    this.producerStatsTimers.set(producer.id, timer);
  }

  private startSendTransportStatsLog() {
    if (this.sendTransportStatsTimer) {
      window.clearInterval(this.sendTransportStatsTimer);
    }

    this.sendTransportStatsTimer = window.setInterval(async () => {
      if (!this.sendTransport || this.sendTransport.closed) {
        return;
      }

      const stats = await this.sendTransport.getStats();
      const reports = Array.from(stats.values()) as any[];
      const localCandidates = reports.filter((report) => report.type === 'local-candidate');
      const remoteCandidates = reports.filter((report) => report.type === 'remote-candidate');
      const candidatePairs = reports.filter((report) => report.type === 'candidate-pair');
      const selectedPair =
        candidatePairs.find((report) => report.selected) ||
        candidatePairs.find((report) => report.nominated && report.state === 'succeeded') ||
        candidatePairs.find((report) => report.state === 'in-progress');

      console.log(
        'Send transport ICE stats:',
        JSON.stringify(
          {
            connectionState: this.sendTransportConnectionState,
            selectedPair: this.parseCandidatePairStats(selectedPair),
            candidatePairs: candidatePairs.map((candidatePair) =>
              this.parseCandidatePairStats(candidatePair),
            ),
            localCandidates: localCandidates.map((candidate) => this.parseCandidateStats(candidate)),
            remoteCandidates: remoteCandidates.map((candidate) =>
              this.parseCandidateStats(candidate),
            ),
          },
          null,
          2,
        ),
      );
    }, 3000);
  }

  private parseCandidateStats(candidate: any) {
    return {
      id: candidate.id,
      address: candidate.address || candidate.ip,
      port: candidate.port,
      protocol: candidate.protocol,
      candidateType: candidate.candidateType,
      relayProtocol: candidate.relayProtocol,
      tcpType: candidate.tcpType,
    };
  }

  private parseCandidatePairStats(candidatePair?: any) {
    if (!candidatePair) return undefined;

    return {
      id: candidatePair.id,
      state: candidatePair.state,
      nominated: candidatePair.nominated,
      selected: candidatePair.selected,
      localCandidateId: candidatePair.localCandidateId,
      remoteCandidateId: candidatePair.remoteCandidateId,
      bytesSent: candidatePair.bytesSent,
      bytesReceived: candidatePair.bytesReceived,
      requestsSent: candidatePair.requestsSent,
      responsesReceived: candidatePair.responsesReceived,
      consentRequestsSent: candidatePair.consentRequestsSent,
      availableOutgoingBitrate: candidatePair.availableOutgoingBitrate,
    };
  }
}
