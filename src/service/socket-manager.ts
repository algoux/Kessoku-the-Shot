import { io, Socket } from 'socket.io-client';
import { GetContestInfoResDTO } from '@/typings/data';
import { v4 as uuidv4 } from 'uuid';
import { GetConfirmReadyReqDTO, GetConfirmReadyResDTO } from '@/typings/data';

export default class SocketManager {
  private static instance: SocketManager | null = null;
  private socket: Socket;
  private onConnectErrorCallback?: (error: Error) => void;

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

    // todo
    // this.socket.on('disconnect', () => {
    //   this.socket.emit('cancelReady')
    // })
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
    return await this.socket.emitWithAck('confirmReady', data);
  }

  public async handleCcompleteConnectTransport({dtlsParameters }): Promise<void> {
    await this.socket.emitWithAck('completeConnectTransport', { dtlsParameters });
  }

  public async handleRequestStartBroadcast() {

  }

  public async handleCancelReady() {
    await this.socket.emitWithAck('cancelReady');
  }


}
