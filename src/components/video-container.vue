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
  availableCamera: MediaDeviceInfo;
  videoRef: HTMLVideoElement | null = null;
  currentStream: MediaStream | null = null;

  cameras: CameraCapabilities[] = [];
  selectedCamera: string = '';
  loadCameraSuccess: boolean = false;

  availableHeights = [2160, 1800, 1440, 1200, 1080, 900, 768, 720];

  settings: VideoSettings = {
    deviceId: '',
    deviceLabel: '',
    width: 1920,
    height: 1080,
    frameRate: 30,
    bitrate: 0,
  };

  showSettings = false;

  showOverlay = false;

  @Inject()
  screenOrientation!: ScreenOrientationState;

  // 获取所有摄像头设备及其能力
  async getCameraCapabilities(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');

      this.cameras = [];

      for (const device of videoDevices) {
        try {
          // 获取设备的最高能力
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: device.deviceId },
            },
          });

          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities() as any;

          this.cameras.push({
            deviceId: device.deviceId,
            label: device.label || `摄像头 ${this.cameras.length + 1}`,
            maxWidth: capabilities.width?.max || 1920,
            maxHeight: capabilities.height?.max || 1080,
            maxFrameRate: capabilities.frameRate?.max || 30,
          });

          // 停止临时流
          track.stop();
        } catch (error) {
          console.error(`无法获取设备 ${device.label} 的能力:`, error);
        }
      }

      // 选择能力最高的摄像头（按分辨率）
      if (this.cameras.length > 0) {
        const bestCamera = this.cameras.reduce((prev, current) => {
          const prevPixels = prev.maxWidth * prev.maxHeight;
          const currentPixels = current.maxWidth * current.maxHeight;
          return currentPixels > prevPixels ? current : prev;
        });

        this.selectedCamera = bestCamera.deviceId;

        // 设置初始分辨率为最接近最高能力的可用高度
        const bestHeight =
          this.availableHeights.find((h) => h <= bestCamera.maxHeight) ||
          this.availableHeights[this.availableHeights.length - 1];
        const aspectRatio = 16 / 9; // 假设16:9

        this.settings = {
          deviceId: bestCamera.deviceId,
          deviceLabel: bestCamera.label,
          width: Math.round(bestHeight * aspectRatio),
          height: bestHeight,
          frameRate: Math.min(60, bestCamera.maxFrameRate) as 30 | 60,
          bitrate: this.calculateBitrate(
            Math.round(bestHeight * aspectRatio),
            bestHeight,
            Math.min(60, bestCamera.maxFrameRate),
          ),
        };
      }
    } catch (error) {
      console.error('获取摄像头能力失败:', error);
      alert(`获取摄像头能力失败: ${error}`);
    }
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

      this.showSettings = false;
    } catch (error) {
      console.error('应用设置失败:', error);
    }
  }

  // 更改分辨率
  onHeightChange(height: number): void {
    const aspectRatio = 16 / 9;
    this.settings.height = height;
    this.settings.width = Math.round(height * aspectRatio);
    this.settings.bitrate = this.calculateBitrate(
      this.settings.width,
      this.settings.height,
      this.settings.frameRate,
    );
  }

  // 更改帧率
  onFrameRateChange(frameRate: 30 | 60): void {
    this.settings.frameRate = frameRate;
    this.settings.bitrate = this.calculateBitrate(
      this.settings.width,
      this.settings.height,
      this.settings.frameRate,
    );
  }

  // 更改摄像头
  onCameraChange(deviceId: string): void {
    const camera = this.cameras.find((c) => c.deviceId === deviceId);
    if (camera) {
      this.settings.deviceId = deviceId;
      this.settings.deviceLabel = camera.label;

      // 确保分辨率不超过设备能力
      if (this.settings.height > camera.maxHeight) {
        const bestHeight =
          this.availableHeights.find((h) => h <= camera.maxHeight) ||
          this.availableHeights[this.availableHeights.length - 1];
        this.onHeightChange(bestHeight);
      }

      // 确保帧率不超过设备能力
      if (this.settings.frameRate > camera.maxFrameRate) {
        this.onFrameRateChange(30);
      }
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
          <span class="info-value">{{ settings.width }}x{{ settings.height }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">帧率:</span>
          <span class="info-value">{{ settings.frameRate }} FPS</span>
        </div>
        <div class="info-item">
          <span class="info-label">码率:</span>
          <span class="info-value">{{ (settings.bitrate / 1024).toFixed(2) }} Mbps</span>
        </div>
      </div>

      <!-- 设置面板 -->
      <div v-if="showSettings" class="settings-panel">
        <div class="settings-content">
          <h3>摄像头设置</h3>

          <!-- 摄像头选择 -->
          <div class="setting-item">
            <label>摄像头:</label>
            <select v-model="selectedCamera" @change="onCameraChange(selectedCamera)">
              <option v-for="camera in cameras" :key="camera.deviceId" :value="camera.deviceId">
                {{ camera.label }} (最高: {{ camera.maxWidth }}x{{ camera.maxHeight }}@{{
                  camera.maxFrameRate
                }}fps)
              </option>
            </select>
          </div>

          <!-- 分辨率选择 -->
          <div class="setting-item">
            <label>分辨率高度:</label>
            <select
              :value="settings.height"
              @change="onHeightChange(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="height in availableHeights" :key="height" :value="height">
                {{ Math.round((height * 16) / 9) }}x{{ height }} ({{ height }}p)
              </option>
            </select>
          </div>

          <!-- 帧率选择 -->
          <div class="setting-item">
            <label>帧率:</label>
            <div class="radio-group">
              <label>
                <input
                  type="radio"
                  :value="30"
                  :checked="settings.frameRate === 30"
                  @change="onFrameRateChange(30)"
                />
                30 FPS
              </label>
              <label>
                <input
                  type="radio"
                  :value="60"
                  :checked="settings.frameRate === 60"
                  @change="onFrameRateChange(60)"
                />
                60 FPS
              </label>
            </div>
          </div>

          <!-- 码率显示 -->
          <div class="setting-item">
            <label>推流码率:</label>
            <span class="bitrate-value">{{ settings.bitrate }} kbps</span>
          </div>

          <!-- 当前设置摘要 -->
          <div class="settings-summary">
            <p>当前设置: {{ settings.width }}x{{ settings.height }}@{{ settings.frameRate }}fps</p>
            <p>
              预估码率: {{ settings.bitrate }} kbps ({{ (settings.bitrate / 1024).toFixed(2) }}
              Mbps)
            </p>
          </div>

          <!-- 按钮 -->
          <div class="settings-actions">
            <button class="apply-btn" @click="applySettings">应用设置</button>
            <button class="cancel-btn" @click="showSettings = false">取消</button>
          </div>
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
        <span class="info-value">{{ settings.width }}x{{ settings.height }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">帧率:</span>
        <span class="info-value">{{ settings.frameRate }} FPS</span>
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

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

    .info-label {
      color: rgba(0, 0, 0, 0.6);
    }

    .info-value {
      color: #000;
    }
  }
}

.portrait {
  aspect-ratio: 16 / 9;
  padding: .5rem;
}

.landscape {
  height: 100vh;
}

// 设置面板
.settings-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.settings-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;

  h3 {
    margin: 0 0 20px 0;
    font-size: 20px;
    color: #333;
  }
}

.setting-item {
  margin-bottom: 20px;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #555;
  }

  select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: #4caf50;
    }
  }
}

.radio-group {
  display: flex;
  gap: 20px;

  label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-weight: normal;
    margin: 0;

    input[type='radio'] {
      cursor: pointer;
    }
  }
}

.bitrate-value {
  display: inline-block;
  padding: 8px 12px;
  background: #f0f0f0;
  border-radius: 6px;
  font-weight: 600;
  color: #333;
}

.settings-summary {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  margin: 20px 0;

  p {
    margin: 8px 0;
    color: #666;
    font-size: 14px;
  }
}

.settings-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;

  button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .apply-btn {
    background: #4caf50;
    color: white;

    &:hover {
      background: #45a049;
    }
  }

  .cancel-btn {
    background: #f0f0f0;
    color: #333;

    &:hover {
      background: #e0e0e0;
    }
  }
}

// 移动端适配
@media (max-width: 600px) {
  .settings-content {
    padding: 16px;

    h3 {
      font-size: 18px;
    }
  }

  .setting-item {
    margin-bottom: 16px;

    label {
      font-size: 14px;
    }

    select {
      font-size: 13px;
    }
  }

  .settings-actions {
    flex-direction: column;

    button {
      width: 100%;
    }
  }
}
</style>
