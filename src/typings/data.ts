import { Contest, User } from './srk';

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
}

export interface ScreenOrientationState {
  isPortrait: boolean;
  isLandscape: boolean;
}

export interface GetContestInfoResDTO {
  alias: string;
  contest: Contest;
  serverTimestamp: number;
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
