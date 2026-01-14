<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { ScreenOrientationState } from '@/typings/data';
import { Inject } from 'vue-property-decorator';
import { Overlay, Loading } from 'vant';
import { Camera } from 'lucide-vue-next';

interface VideoSettings {
  deviceId: string;
  deviceLabel: string;
  width: number;
  height: number;
  frameRate: 30 | 60;
  bitrate: number;
}

interface CameraCapabilities {
  deviceId: string;
  label: string;
  maxWidth: number;
  maxHeight: number;
  maxFrameRate: number;
}

@Options({
  components: {
    Overlay,
    Loading,
    Camera,
  },
})
export default class VideoContainer extends Vue {
  videoRef: HTMLVideoElement | null = null;
  currentStream: MediaStream | null = null;

  cameras: CameraCapabilities[] = [];
  loadCameraSuccess: boolean = false;

  settings: VideoSettings = {
    deviceId: '',
    deviceLabel: '',
    width: 0,
    height: 0,
    frameRate: 30,
    bitrate: 0,
  };

  // 实际获得的参数
  actualWidth: number = 0;
  actualHeight: number = 0;
  actualFrameRate: number = 0;

  showOverlay = false;

  @Inject()
  screenOrientation!: ScreenOrientationState;

  // 获取摄像头能力
  async getCameraCapabilities(): Promise<void> {
    // 先请求一次基础的摄像头访问来触发权限请求和初始化 deviceId
    let permissionStream: MediaStream | null = null;
    try {
      permissionStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      console.log('摄像头权限已获取');
    } catch (error) {
      console.error('请求摄像头权限失败:', error);
      throw new Error('未获得摄像头权限');
    } finally {
      // 立即停止这个临时流
      if (permissionStream) {
        permissionStream.getTracks().forEach((track) => track.stop());
      }
    }

    // 权限获取后，重新枚举设备以获取真实的 deviceId
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === 'videoinput');

    console.log('枚举到的摄像头设备:', videoDevices);

    if (videoDevices.length === 0) {
      throw new Error('未找到任何摄像头设备');
    }

    this.cameras = [];

    for (const device of videoDevices) {
      try {
        // 请求设备的最大能力；如某些设备 ID 异常则跳过
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: device.deviceId },
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 60 },
          },
        });

        const track = testStream.getVideoTracks()[0];
        const actualSettings = track.getSettings();

        this.cameras.push({
          deviceId: device.deviceId,
          label: device.label || `摄像头 ${this.cameras.length + 1}`,
          maxWidth: actualSettings.width || 1920,
          maxHeight: actualSettings.height || 1080,
          maxFrameRate: actualSettings.frameRate || 30,
        });

        track.stop();
      } catch (err) {
        console.warn('跳过不可用摄像头:', device.deviceId, err);
        continue;
      }
    }

    if (this.cameras.length === 0) {
      throw new Error('未找到可用的摄像头流');
    }

    // 选择能力最高的摄像头
    const bestCamera = this.cameras.reduce((prev, current) => {
      return current.maxWidth * current.maxHeight > prev.maxWidth * prev.maxHeight ? current : prev;
    });

    // 设置初始值为设备最大能力
    this.settings = {
      deviceId: bestCamera.deviceId,
      deviceLabel: bestCamera.label,
      width: bestCamera.maxWidth,
      height: bestCamera.maxHeight,
      frameRate: Math.min(60, bestCamera.maxFrameRate) as 30 | 60,
      bitrate: this.calculateBitrate(
        bestCamera.maxWidth,
        bestCamera.maxHeight,
        Math.min(60, bestCamera.maxFrameRate),
      ),
    };
  }

  calculateBitrate(width: number, height: number, frameRate: number): number {
    return Math.round(width * height * frameRate * 0.000078125);
  }

  // 获取摄像头流（使用当前设置）
  async getCameraStream(): Promise<MediaStream | undefined> {
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: this.settings.deviceId ? { exact: this.settings.deviceId } : undefined,
        width: { ideal: this.settings.width },
        height: { ideal: this.settings.height },
        frameRate: { ideal: this.settings.frameRate },
      },
      audio: true,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  }

  async updateVideoElement(stream: MediaStream) {
    const video = this.videoRef!;
    video.srcObject = stream;
    await video.play();

    // 获取实际的视频轨道参数
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      this.actualWidth = settings.width || 0;
      this.actualHeight = settings.height || 0;
      this.actualFrameRate = settings.frameRate || 0;

      console.log('请求的参数:', {
        width: this.settings.width,
        height: this.settings.height,
        frameRate: this.settings.frameRate,
      });
      console.log('实际获得的参数:', {
        width: this.actualWidth,
        height: this.actualHeight,
        frameRate: this.actualFrameRate,
      });
    }
  }

  // 应用新设置
  async applySettings(): Promise<void> {
    try {
      // 停止当前流
      if (this.currentStream) {
        this.currentStream.getTracks().forEach((track) => track.stop());
      }

      // 获取新流
      const stream = await this.getCameraStream();
      if (stream) {
        this.currentStream = stream;
        await this.updateVideoElement(stream);
      }
    } catch (error) {
      console.error('应用设置失败:', error);
    }
  }

  async mounted() {
    try {
      this.showOverlay = true;
      await this.getCameraCapabilities();
      const stream = await this.getCameraStream();
      if (stream) {
        this.currentStream = stream;
        await this.updateVideoElement(stream);
      }
      this.loadCameraSuccess = true;
    } catch (error) {
      this.loadCameraSuccess = false;
    } finally {
      this.showOverlay = false;
    }
  }

  beforeUnmount() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
    }
  }
}
</script>

<template>
  <Overlay :show="showOverlay" style="display: flex; justify-content: center; align-items: center">
    <Loading type="spinner" size="24"> 加载设备... </Loading>
  </Overlay>
  <div class="video-wrapper">
    <div class="video-container" :class="screenOrientation.isPortrait ? 'portrait' : 'landscape'">
      <video
        ref="videoRef"
        autoplay
        playsinline
        muted
        id="localVideo"
        v-show="loadCameraSuccess"
      ></video>
      <div class="camera-icon" v-if="!loadCameraSuccess">
        <Camera size="48" />
      </div>

      <!-- 设备参数预览（横屏时在video内部） -->
      <div
        class="device-info device-info-landscape"
        v-if="!screenOrientation.isPortrait && loadCameraSuccess && settings.deviceId"
      >
        <div class="info-item">
          <span class="info-label">分辨率:</span>
          <span class="info-value">{{ actualWidth }}x{{ actualHeight }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">帧率:</span>
          <span class="info-value">{{ actualFrameRate.toFixed(1) }} FPS</span>
        </div>
        <div class="info-item">
          <span class="info-label">码率:</span>
          <span class="info-value">{{ (settings.bitrate / 1024).toFixed(2) }} Mbps</span>
        </div>
      </div>
    </div>

    <!-- 设备参数预览（竖屏时在video外部） -->
    <div
      class="device-info device-info-portrait"
      v-if="screenOrientation.isPortrait && loadCameraSuccess && settings.deviceId"
    >
      <div class="info-item">
        <span class="info-label">分辨率:</span>
        <span class="info-value">{{ actualWidth }}x{{ actualHeight }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">帧率:</span>
        <span class="info-value">{{ actualFrameRate.toFixed(1) }} FPS</span>
      </div>
      <div class="info-item">
        <span class="info-label">码率:</span>
        <span class="info-value">{{ (settings.bitrate / 1024).toFixed(2) }} Mbps</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.camera-icon {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(128, 128, 128, 0.711);
}

.video-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.video-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;

  & video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.device-info {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  border-radius: 2rem;
  padding: 12px 20px;
  display: flex;
  gap: 20px;
  align-items: center;

  .info-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;

    .info-label {
      color: rgba(255, 255, 255, 0.7);
    }

    .info-value {
      color: #fff;
    }
  }
}

.device-info-landscape {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  white-space: nowrap;

  .info-item {
    font-size: 12px;
  }
}

.device-info-portrait {
  width: 95%;
  background: none;
  backdrop-filter: none;
  box-shadow: none;
  padding: 12px 0;
  flex-direction: column;
  gap: 8px;
  align-items: center;

  .info-item {
    font-size: 14px;
  }
}

.portrait {
  aspect-ratio: 16 / 9;
  padding: 0.5rem;
}

.landscape {
  height: 100vh;
  position: absolute;
  top: 0;
}
</style>
