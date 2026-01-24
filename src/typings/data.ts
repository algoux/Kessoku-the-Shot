import { Contest } from './srk';
import {
  TransportOptions,
  RtpCapabilities,
  MediaKind,
  RtpParameters,
  Producer,
} from 'mediasoup-client/types';

export enum HomePageIndexEnum {
  HOME = 0,
  PROFILE = 1,
}

export interface LoginState {
  alias: string;
  shotToken: string;
  shotName: string;
}

export interface HomeState {
  shotName: string;
  title: string;
}

export interface ScreenOrientationState {
  isPortrait: boolean;
  isLandscape: boolean;
}

export interface GetContestInfoResDTO {
  success: boolean;
  code: number;
  data: {
    alias: string;
    contest: Contest;
    serverTimestamp: number;
  };
}

export interface ConnectErrorResDTO {
  success: boolean;
  code: number;
  msg: string;
}

export interface VideoSettings {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}

export interface CameraCapabilities {
  maxWidth: number;
  maxHeight: number;
  maxFrameRate: number;
}

export interface Resolution {
  width: number;
  height: number;
}

type SimulcastRidType = 'origin' | 'low';

export interface SimulcastConfig {
  rid: SimulcastRidType;
  scaleResolutionDownBy: number;
  bitrate: number;
}

export type TrackType = 'video' | 'audio';

export interface GetConfirmReadyReqDTO {
  shotName: string;
  tracks: {
    trackId: string;
    name: string;
    type: TrackType;
  }[];
}

export interface GetConfirmReadyResDTO {
  transport: TransportOptions;
  routerRtpCapabilities: RtpCapabilities;
}

export interface RequestBroadcasterDTO {
  trackIds: string[];
}

export interface RequestStopBroadcastDTO {
  trackIds: string[];
}

export interface OnProduceReqDTO {
  trackId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
}

export interface OnProduceResDTO {
  producerId: string;
  type: Producer;
  appData: any;
}
