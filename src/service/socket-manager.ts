import { io, Socket } from 'socket.io-client';
import { LoginState, GetContestInfoResDTO, ConnectErrorResDTO } from '@/typings/data';

export default class SocketManager {
  private static instance: SocketManager | null = null;
  private socket: Socket;
  private onConnectErrorCallback?: (error: Error) => void;

  private constructor(
    alias: string,
    userId: string,
    broadcasterToken: string,
    onConnectError?: (error: Error) => void,
  ) {
    this.onConnectErrorCallback = onConnectError;
    console.log({
        alias,
        userId,
        broadcasterToken,
    })
    this.socket = io('https://rl-broadcast-hub.algoux.cn/broadcaster', {
      transports: ['websocket'],
      path: undefined,
      auth: {
        alias,
        userId,
        broadcasterToken,
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
  }

  public static getInstance(
    alias: string,
    userId: string,
    broadcasterToken: string,
    onConnectError?: (error: Error) => void,
  ) {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager(alias, userId, broadcasterToken, onConnectError);
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
}
