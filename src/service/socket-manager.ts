import { io, Socket } from 'socket.io-client';
import { LoginState, GetContestInfoResDTO, ConnectErrorResDTO } from '@/typings/data';

export default class SocketManager {
  private static instance: SocketManager | null = null;
  private socket: Socket;
  private onConnectErrorCallback?: (error: Error) => void;

  private constructor(alias: string, shotToken: string, onConnectError?: (error: Error) => void) {
    this.onConnectErrorCallback = onConnectError;
    
    this.socket = io('https://rl-broadcast-hub.algoux.cn/shot', {
      transports: ['websocket'],
      path: undefined,
      extraHeaders: {
        'X-UCA': alias,
      },
      auth: {
        token: shotToken,
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
}
