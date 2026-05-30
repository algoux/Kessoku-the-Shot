import { Resolution } from '@/typings/data';

export default class MediaDeviceManager {
  protected MAX_FRAME_RATE: number = 60;
  protected DEFAULT_WIDTH: number = 1280;
  protected DEFAULT_HEIGHT: number = 720;
  protected DEFAULT_FRAME_RATE: number = 30;
  protected PRESET_HEIGHT_LIST: number[] = [2160, 1800, 1440, 1200, 1080, 900, 768, 720];
  private devices: MediaDeviceInfo[] = [];
  private currentDeviceId: string | null = null;
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private capabilities: MediaTrackCapabilities | null = null;
  private settings: MediaTrackSettings | null = null;
  private desiredResolution: Resolution | null = null;
  private desiredFrameRate: number | null = null;
  private constraints: MediaTrackConstraints = {
    width: { ideal: this.DEFAULT_WIDTH },
    height: { min: 720, ideal: this.DEFAULT_HEIGHT },
    aspectRatio: { ideal: 16 / 9 },
    frameRate: { ideal: this.DEFAULT_FRAME_RATE },
  };
  private resolutionList: Resolution[] = null;

  constructor() {
    navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
  }

  /** 初始化并选择默认摄像头 */
  async init() {
    const permissionStream = await navigator.mediaDevices.getUserMedia({
      video: this.constraints,
    });
    permissionStream.getTracks().forEach((track) => track.stop());

    await this.updateCameraList();

    if (this.devices.length === 0) {
      throw new Error('未检测到摄像头设备');
    }

    this.currentDeviceId = this.devices[0].deviceId;
  }

  genResolutionList(settings: MediaTrackSettings) {
    const width = settings.width;
    const currentHeight = settings.height;

    if (!width || !currentHeight) {
      this.resolutionList = [];
      return;
    }

    const aspectRatio = settings.aspectRatio || width / currentHeight;
    let resolutionList = this.PRESET_HEIGHT_LIST.map((height) => {
      if (height <= currentHeight) {
        return {
          width: Math.round(height * aspectRatio),
          height: height,
        };
      }
    }).filter(Boolean) as Resolution[];
    if (
      !resolutionList.some((res) => res.width === width && res.height === currentHeight)
    ) {
      resolutionList.unshift({ width, height: currentHeight });
    }
    this.resolutionList = resolutionList;
  }

  getResolutionList(): Resolution[] {
    return this.resolutionList;
  }

  /** 获取所有摄像头 */
  getDevices() {
    return this.devices;
  }

  /** 获取当前摄像头 */
  getCurrentDevice() {
    return this.devices.find((d) => d.deviceId === this.currentDeviceId) || null;
  }

  /** 开启摄像头 */
  async start(): Promise<MediaStream> {
    if (!this.currentDeviceId) {
      throw new Error('未选择摄像头设备');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: this.currentDeviceId },
        ...this.getVideoConstraints(),
      },
    });

    this.videoTrack = this.stream.getVideoTracks()[0];
    this.updateTrackState();
    this.rememberCurrentResolution();
    return this.stream;
  }

  /** 切换摄像头 */
  async switchCamera(deviceId: string) {
    console.log('Switching camera to deviceId:', deviceId);
    if (deviceId === this.currentDeviceId) return;

    this.currentDeviceId = deviceId;

    if (this.videoTrack) {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          ...this.getVideoConstraints(),
        },
      });

      const newTrack = newStream.getVideoTracks()[0];

      this.stream?.removeTrack(this.videoTrack);
      this.videoTrack.stop();

      this.stream?.addTrack(newTrack);
      this.videoTrack = newTrack;
      this.updateTrackState();
    }
  }

  /** 应用新的摄像头设置（不重启流） */
  async applySettings(settings: MediaTrackConstraints) {
    this.constraints = { ...this.constraints, ...settings };

    if (this.videoTrack) {
      await this.videoTrack.applyConstraints(this.getVideoConstraints());
      this.updateTrackState();
    }
  }

  stop() {
    this.videoTrack?.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.videoTrack = null;
  }

  /** 更新设备列表 */
  private handleDeviceChange = async () => {
    await this.updateCameraList();

    // 当前设备被拔出，自动切换到第一个
    if (this.currentDeviceId && !this.devices.some((d) => d.deviceId === this.currentDeviceId)) {
      this.currentDeviceId = this.devices[0]?.deviceId || null;
      if (this.currentDeviceId) {
        await this.switchCamera(this.currentDeviceId);
      }
    } else {
      throw new Error('未检测到摄像头设备');
    }
  };

  private async updateCameraList() {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    console.log('All media devices:', allDevices);
    this.devices = allDevices.filter((d) => d.kind === 'videoinput');
  }

  getCapabilities(): MediaTrackCapabilities | null {
    return this.capabilities;
  }

  getCurrentSettings(): MediaTrackSettings | null {
    return this.settings;
  }

  private getVideoConstraints(): MediaTrackConstraints {
    return {
      ...this.constraints,
      ...(this.desiredResolution
        ? {
            width: { exact: this.desiredResolution.width },
            height: { exact: this.desiredResolution.height },
          }
        : {}),
      ...(this.desiredFrameRate ? { frameRate: { exact: this.desiredFrameRate } } : {}),
    };
  }

  private updateTrackState() {
    if (!this.videoTrack) return;

    this.capabilities = this.videoTrack.getCapabilities();
    this.settings = this.videoTrack.getSettings();

    if (this.settings.width && this.settings.height) {
      this.genResolutionList(this.settings);
    }
  }

  private rememberCurrentResolution() {
    if (!this.settings?.width || !this.settings?.height) return;

    this.desiredResolution = {
      width: this.settings.width,
      height: this.settings.height,
    };
  }

  async refreshSettings() {
    if (!this.videoTrack) return;

    console.log('Reapplying camera constraints after orientation change:', this.getVideoConstraints());
    await this.videoTrack.applyConstraints(this.getVideoConstraints());
    this.updateTrackState();
  }

  async setResolution(width: number, height: number) {
    this.desiredResolution = { width, height };
    console.log('Applying new resolution constraints:', this.getVideoConstraints());
    await this.videoTrack.applyConstraints(this.getVideoConstraints());
    this.updateTrackState();
  }

  async setFrameRate(frameRate: number) {
    this.desiredFrameRate = frameRate;
    await this.videoTrack.applyConstraints(this.getVideoConstraints());
    this.updateTrackState();
  }
}
