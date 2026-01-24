import * as mediasoupClient from 'mediasoup-client';
type SendTransportOptions = {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
};

type ProduceOptions = {
  encodings?: RTCRtpEncodingParameters[];
  codecOptions?: any;
  appData?: any;
};

export default class WebRTCManager {
  private device: mediasoupClient.types.Device;
  private sendTransport: mediasoupClient.types.Transport;
  private producers: Map<string, mediasoupClient.types.Producer[]>;
  constructor(
    // private readonly signal: {
    //   requestSendTransport: () => Promise<SendTransportOptions>;
    //   connectTransport: (params: any) => Promise<void>;
    //   produce: (params: any) => Promise<{ id: string }>;
    // },
  ) {}

  async loadMediasoupClientDevice(routerRtpCapabilities: mediasoupClient.types.RtpCapabilities) {
    this.device = new mediasoupClient.Device();
    await this.device.load({ routerRtpCapabilities });
  }

  async createSendTransport(transport: mediasoupClient.types.Transport) {
  }
}
