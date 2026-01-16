import { Contest, User } from "./srk";

export enum HomePageIndexEnum {
    HOME = 0,
    PROFILE = 1,
}

export interface LoginState {
    userId: string;
    broadcasterToken: string;
    alias: string;
}


export interface HomeState {
    userName: string;
}

export interface ScreenOrientationState {
    isPortrait: boolean;
    isLandscape: boolean;
}

export interface GetContestInfoResDTO {
    alias: string;
    contest: Contest;
    user: User;
    serverTimestamp: number;
}

export interface ConnectErrorResDTO {
    success: boolean;
    code: number;
    msg: string;
}