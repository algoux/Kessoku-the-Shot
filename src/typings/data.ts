export enum HomePageIndexEnum {
    HOME = 0,
    PROFILE = 1,
}

export interface LoginState {
    userId: string;
    token: string;
}

export interface HomeState {
    userId: string;
}

export interface ScreenOrientationState {
    isPortrait: boolean;
    isLandscape: boolean;
}