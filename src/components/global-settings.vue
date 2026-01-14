<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Inject, Ref } from 'vue-property-decorator';
import { ScreenOrientationState } from '@/typings/data';

import { Form, CellGroup, Field, Button, DropdownItem, DropdownMenu, Icon } from 'vant';
import { X } from 'lucide-vue-next';

interface CameraDevice {
  deviceId: string;
  label: string;
  maxWidth: number;
  maxHeight: number;
  maxFrameRate: number;
}

@Options({
  components: {
    Form,
    CellGroup,
    Field,
    Button,
    DropdownItem,
    DropdownMenu,
    Icon,
    X,
  },
})
export default class GlobalSettings extends Vue {
  @Inject()
  logout!: () => Promise<void>;

  @Inject()
  applyVideoSettings!: (settings: any) => Promise<void>;

  @Inject()
  screenOrientation!: ScreenOrientationState;

  // 摄像头设备列表
  cameras: CameraDevice[] = [];
  selectedCameraId = '';

  // 可选分辨率高度
  availableHeights = [2160, 1800, 1440, 1200, 1080, 900, 768, 720];

  // 当前设置
  selectedHeight = 1080;
  selectedFrameRate = 30;
  calculatedBitrate = 0;

  optionsFrameRate = [
    { text: '30 FPS', value: 30 },
    { text: '60 FPS', value: 60 },
  ];

  get optionsResolution() {
    return this.availableHeights.map((height) => ({
      text: `${Math.round((height * 16) / 9)}x${height} (${height}p)`,
      value: height,
    }));
  }

  get optionsCamera() {
    return this.cameras.map((camera) => ({
      text: `${camera.label}`,
      value: camera.deviceId,
    }));
  }

  // 获取当前摄像头
  get currentCamera(): CameraDevice | undefined {
    return this.cameras.find((c) => c.deviceId === this.selectedCameraId);
  }

  // 获取可用的分辨率选项（根据当前摄像头能力禁用）
  get optionsResolutionFiltered() {
    const maxHeight = this.currentCamera?.maxHeight || 1080;
    return this.optionsResolution.map((option) => ({
      ...option,
      disabled: option.value > maxHeight,
      text: option.value > maxHeight ? `${option.text} (不支持)` : option.text,
    }));
  }

  // 获取可用的帧率选项
  get optionsFrameRateFiltered() {
    const maxFrameRate = this.currentCamera?.maxFrameRate || 30;
    return this.optionsFrameRate.map((option) => ({
      ...option,
      disabled: option.value > maxFrameRate,
      text: option.value > maxFrameRate ? `${option.text} (不支持)` : option.text,
    }));
  }

  // 计算码率
  calculateBitrate(width: number, height: number, frameRate: number): number {
    return Math.round(width * height * frameRate * 0.000078125);
  }

  // 获取摄像头设备能力
  async getCameraCapabilities(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');

      this.cameras = [];

      for (const device of videoDevices) {
        // 请求最高能力，获取实际支持的参数
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
      }

      // 选择能力最高的摄像头
      if (this.cameras.length > 0) {
        const bestCamera = this.cameras.reduce((prev, current) => {
          const prevPixels = prev.maxWidth * prev.maxHeight;
          const currentPixels = current.maxWidth * current.maxHeight;
          return currentPixels > prevPixels ? current : prev;
        });

        this.selectedCameraId = bestCamera.deviceId;
        this.selectedHeight = bestCamera.maxHeight;
        this.selectedFrameRate = Math.min(60, bestCamera.maxFrameRate) as 30 | 60;

        this.updateBitrate();
      }
    } catch (error) {
      console.error('获取摄像头能力失败:', error);
      throw error;
    }
  }

  // 更新码率
  updateBitrate(): void {
    const width = Math.round((this.selectedHeight * 16) / 9);
    this.calculatedBitrate = this.calculateBitrate(
      width,
      this.selectedHeight,
      this.selectedFrameRate,
    );
  }

  // 应用设置
  async applySettings(): Promise<void> {
    const camera = this.cameras.find((c) => c.deviceId === this.selectedCameraId);
    if (!camera) return;

    const width = Math.round((this.selectedHeight * 16) / 9);
    const settings = {
      deviceId: this.selectedCameraId,
      deviceLabel: camera.label,
      width,
      height: this.selectedHeight,
      frameRate: this.selectedFrameRate,
      bitrate: this.calculatedBitrate,
    };

    await this.applyVideoSettings(settings);
  }

  // 监听分辨率变化
  onResolutionChange(): void {
    const maxHeight = this.currentCamera?.maxHeight;
    if (this.selectedHeight > maxHeight) {
      alert(`该摄像头不支持 ${this.selectedHeight}p 分辨率，最大支持 ${maxHeight}p`);
      this.selectedHeight = maxHeight;
    }
    this.updateBitrate();
    this.applySettings()
  }

  // 监听帧率变化
  onFrameRateChange(): void {
    const maxFrameRate = this.currentCamera?.maxFrameRate;
    if (this.selectedFrameRate > maxFrameRate) {
      alert(`该摄像头不支持 ${this.selectedFrameRate}fps，最大支持 ${maxFrameRate}fps`);
      this.selectedFrameRate = 30;
    }
    this.updateBitrate();
    this.applySettings();
  }

  // 监听摄像头变化
  async onCameraChange(): Promise<void> {
    const camera = this.cameras.find((c) => c.deviceId === this.selectedCameraId);
    if (!camera) return;

    // 重新测试摄像头能力
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: this.selectedCameraId },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 60 },
        },
      });

      const track = testStream.getVideoTracks()[0];
      const actualSettings = track.getSettings();
      track.stop();

      // 更新该摄像头的实际最大能力
      camera.maxWidth = actualSettings.width || camera.maxWidth;
      camera.maxHeight = actualSettings.height || camera.maxHeight;
      camera.maxFrameRate = actualSettings.frameRate || camera.maxFrameRate;

      // 调整设置为设备最大能力
      this.selectedHeight = camera.maxHeight;
      this.selectedFrameRate = Math.min(60, camera.maxFrameRate) as 30 | 60;

      this.updateBitrate();
    } catch (error) {
      console.error('测试摄像头能力失败:', error);
    }
  }

  async mounted() {
    await this.getCameraCapabilities();
  }
}
</script>

<template>
  <div class="global-settings">
    <div class="header">
      <p class="title">全局配置</p>
      <button class="close-btn" @click="$emit('close')">
        <X :size="24" />
      </button>
    </div>
    <div class="form-container">
      <!-- 设备设置 -->
      <Form class="form">
        <p class="tip">设备设置</p>
        <CellGroup v-if="cameras.length > 0">
          <DropdownMenu
            :direction="screenOrientation.isPortrait ? 'up' : 'down'"
            style="width: 20rem"
          >
            <DropdownItem
              title="摄像头"
              v-model="selectedCameraId"
              :options="optionsCamera"
              @change="onCameraChange"
            />
            <DropdownItem
              title="分辨率"
              v-model="selectedHeight"
              :options="optionsResolutionFiltered"
              @change="onResolutionChange"
            />
            <DropdownItem
              title="帧率"
              v-model="selectedFrameRate"
              :options="optionsFrameRateFiltered"
              @change="onFrameRateChange"
            />
          </DropdownMenu>
        </CellGroup>
        <div class="bitrate-info" v-if="cameras.length">
          <span class="bitrate-label">推流码率:</span>
          <span class="bitrate-value">
            {{ calculatedBitrate }} kbps ({{ (calculatedBitrate / 1024).toFixed(2) }} Mbps)
          </span>
        </div>
        <div v-else class="bitrate-info">摄像头检测失败</div>
        <!-- <Button type="primary" round size="small" :disabled="cameras.length === 0" plain @click="applySettings">应用设置</Button> -->
      </Form>

      <!-- 登录设置 -->
      <Form class="form">
        <p class="tip">登录设置</p>
        <Button type="danger" round size="small" @click="logout" plain>退出登录</Button>
      </Form>
    </div>
  </div>
</template>

<style lang="less" scoped>
.global-settings {
  width: 100%;
  height: 100%;
  padding: 2rem 1rem;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;

    .title {
      font-size: 1.5rem;
      font-weight: bold;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.3s;

      &:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      &:active {
        background: rgba(0, 0, 0, 0.15);
      }
    }
  }

  & .form-container {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;

    & .form {
      display: flex;
      flex-direction: column;
      align-items: start;
      gap: 1rem;
    }
  }

  .bitrate-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    color: gray;
  }
}

.tip {
  color: gray;
}
</style>
