import { io, Socket } from 'socket.io-client';
import { GetContestInfoResDTO } from '@/typings/data';
import { v4 as uuidv4 } from 'uuid';
import {
  GetConfirmReadyReqDTO,
  GetConfirmReadyResDTO,
  OnProduceReqDTO,
  OnProduceResDTO,
  OnStopBroadcastReqDTO,
  RequestStartBroadcastDTO
} from '@/typings/data';
import { DtlsParameters } from 'mediasoup-client/types';

export default class SocketManager {
  private static instance: SocketManager | null = null;
  private socket: Socket;
  private onConnectErrorCallback?: (error: Error) => void;
  private cleanUpMediatransport: Function;
  private closeProducers: Function;
  private startBroadcaster: (trackId: string) => Promise<void>;

  private constructor(alias: string, shotToken: string, onConnectError?: (error: Error) => void) {
    this.onConnectErrorCallback = onConnectError;
    console.log(alias, shotToken);
    this.socket = io('https://rl-broadcast-hub.algoux.cn/shot', {
      transports: ['websocket'],
      path: undefined,
      query: {
        uca: alias,
      },
      auth: {
        id: `s-${uuidv4().substring(0, 18)}`,
        shotToken: shotToken,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('socket connected:', this.socket.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('socket connect_error:', err.message);
      this.onConnectErrorCallback(err);
    });

    this.socket.on('disconnect', (reason) => {
      this.cleanUpMediatransport();
    });

    this.socket.on('requestStartBroadcast', (data: RequestStartBroadcastDTO) => {
      this.handleRequestStartBroadcast(data.trackIds);
    })

    this.socket.on('requestStopBroadcast', (data, callback) => {
      console.log('resolve requestStopBroadcast')
      this.closeProducers();
      callback(); // 发送空 callback 
    })
  }

  public static getInstance(
    alias: string,
    shotToken: string,
    onConnectError?: (error: Error) => void,
  ) {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager(alias, shotToken, onConnectError);
    }
    return SocketManager.instance;
  }

  public getSocket(): Socket {
    return this.socket;
  }

  public disconnect() {
    this.socket.disconnect();
  }

  public static reset() {
    SocketManager.instance?.disconnect();
    SocketManager.instance = null;
  }

  public async getContestInfo(): Promise<GetContestInfoResDTO> {
    const contestInfo = await this.socket.emitWithAck('getContestInfo');
    return contestInfo;
  }

  public async handleConfirmReady(data: GetConfirmReadyReqDTO): Promise<GetConfirmReadyResDTO> {
    const res = await this.socket.emitWithAck('confirmReady', data);
    return res.data;
  }

  setupEventsListenerFunctions(cleanUpMediatransport: Function, closeProducers: Function, startBroadcaster: (trackId: string) => Promise<void>) {
    this.cleanUpMediatransport = cleanUpMediatransport;
    this.closeProducers = closeProducers;
    this.startBroadcaster = startBroadcaster;
  }

  public async handleCancelReady() {
    await this.socket.emitWithAck('cancelReady');
    this.cleanUpMediatransport();
  }

  public async handleCompleteConnectTransport(dtlsParameters: DtlsParameters): Promise<void> {
    console.log('Completing transport connection with DTLS parameters:', dtlsParameters);
    await this.socket.emitWithAck('completeConnectTransport', { dtlsParameters });
  }

  public async handleRequestStartBroadcast(trackIds: string[]) {
    // 先默认只推送 camera_main
    const trackId = trackIds.find(id => id === 'camera_main');
    await this.startBroadcaster(trackId);
  }

  async handleProduce(data: OnProduceReqDTO): Promise<OnProduceResDTO> {
    const res = await this.socket.emitWithAck('produce', data);
    return res.data;
  }
}
