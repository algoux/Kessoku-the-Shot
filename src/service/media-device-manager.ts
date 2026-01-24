import { Resolution, SimulcastConfig } from '@/typings/data';

export default class MediaDeviceManager {
  protected MAX_FRAME_RATE: number = 60;
  protected PRESET_HEIGHT_LIST: number[] = [2160, 1800, 1440, 1200, 1080, 900, 768, 720];
  private devices: MediaDeviceInfo[] = [];
  private currentDeviceId: string | null = null;
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private capabilities: MediaTrackCapabilities | null = null;
  private settings: MediaTrackSettings | null = null;
  private constraints: MediaTrackConstraints = {
    height: { ideal: this.PRESET_HEIGHT_LIST[0] },
    frameRate: { ideal: this.MAX_FRAME_RATE },
  };
  // deviceId -> simulcast configs
  private cameraSimulcastConfigs: Map<string, SimulcastConfig[]> = new Map();
  private resolutionList: Resolution[] = null;

  constructor() {
    navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
  }

  /** 初始化并选择默认摄像头 */
  async init() {
    await this.updateDeviceList();

    if (this.devices.length === 0) {
      throw new Error('未检测到摄像头设备');
    }

    this.currentDeviceId = this.devices[0].deviceId;
  }

  genResolutionList(settings: MediaTrackSettings) {
    const aspectRatio = settings.aspectRatio;
    this.resolutionList = this.PRESET_HEIGHT_LIST.map((height) => ({
      width: Math.round(aspectRatio * height),
      height: height,
    }));
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
        ...this.constraints,
      },
    });

    this.videoTrack = this.stream.getVideoTracks()[0];
    this.capabilities = this.videoTrack.getCapabilities();
    this.settings = this.videoTrack.getSettings();
    this.genResolutionList(this.settings);
    this.updateSimulcastConfig();
    return this.stream;
  }

  /** 切换摄像头 */
  async switchCamera(deviceId: string) {
    if (deviceId === this.currentDeviceId) return;

    this.currentDeviceId = deviceId;

    if (this.videoTrack) {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          ...this.constraints,
        },
      });

      const newTrack = newStream.getVideoTracks()[0];

      this.stream?.removeTrack(this.videoTrack);
      this.videoTrack.stop();

      this.stream?.addTrack(newTrack);
      this.videoTrack = newTrack;
    }
  }

  /** 应用新的摄像头设置（不重启流） */
  async applySettings(settings: MediaTrackConstraints) {
    this.constraints = { ...this.constraints, ...settings };

    if (this.videoTrack) {
      await this.videoTrack.applyConstraints(this.constraints);
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
    await this.updateDeviceList();

    // 当前设备被拔出，自动切换到第一个
    if (this.currentDeviceId && !this.devices.some((d) => d.deviceId === this.currentDeviceId)) {
      this.currentDeviceId = this.devices[0]?.deviceId || null;
      if (this.currentDeviceId) {
        await this.switchCamera(this.currentDeviceId);
      }
    }
  };

  private async updateDeviceList() {
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

  async setResolution(width: number, height: number) {
    const newConstraints: MediaTrackConstraints = {
      width: { exact: width },
      height: { exact: height },
    };
    console.log('Applying new resolution constraints:', newConstraints);
    await this.videoTrack.applyConstraints(newConstraints);
    this.settings = this.videoTrack.getSettings();
    this.updateSimulcastConfig();
  }

  async setFrameRate(frameRate: number) {
    await this.videoTrack.applyConstraints({
      frameRate: { exact: frameRate },
    });

    this.settings = this.videoTrack.getSettings();
    this.updateSimulcastConfig();
  }

  private calculateBitrate(width: number, height: number, frameRate: number): number {
    return Math.round(width * height * frameRate * 0.000078125);
  }

  private buildSimulcastConfigs(
    width: number,
    height: number,
    frameRate: number,
  ): SimulcastConfig[] {
    const base = this.calculateBitrate(width, height, frameRate);

    return [
      {
        rid: 'origin',
        scaleResolutionDownBy: 1,
        bitrate: base,
      },
      {
        rid: 'low',
        scaleResolutionDownBy: 4,
        bitrate: Math.round(base / 4),
      },
    ];
  }

  private updateSimulcastConfig() {
    if (!this.settings || !this.currentDeviceId) return;

    const { width, height, frameRate } = this.settings;

    if (!width || !height || !frameRate) return;

    const configs = this.buildSimulcastConfigs(width, height, frameRate);
    this.cameraSimulcastConfigs.set(this.currentDeviceId, configs);
  }

  getSimulcastConfigs(): SimulcastConfig[] {
    if (!this.currentDeviceId) return [];
    return this.cameraSimulcastConfigs.get(this.currentDeviceId) || [];
  }
}
