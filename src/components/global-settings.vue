<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Inject } from 'vue-property-decorator';
import { Resolution, SimulcastConfig, ScreenOrientationState } from '@/typings/data';

import { Form, CellGroup, Field, Button, DropdownItem, DropdownMenu, Icon } from 'vant';
import { X } from 'lucide-vue-next';

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
  protected PRE_SET_FRAME_RATE_LIST: number[] = [60, 30, 24, 15];
  @Inject()
  logout!: () => Promise<void>;
  @Inject()
  screenOrientation!: ScreenOrientationState;
  @Inject()
  availableCameras!: MediaDeviceInfo[];
  @Inject()
  currentDevice!: MediaDeviceInfo | null;
  @Inject()
  settings!: MediaTrackSettings | null;
  @Inject()
  capabilities!: MediaTrackCapabilities | null;
  @Inject()
  resolutionList!: Resolution[];
  @Inject()
  switchCamera!: (deviceId: string) => Promise<void>;
  @Inject()
  onResolutionChange!: (width: number, height: number) => Promise<void>;
  @Inject()
  onFrameRateChange!: (frameRate: number) => Promise<void>;
  @Inject()
  simulCastConfigs!: SimulcastConfig[];

  get optionsCamera() {
    return this.availableCameras.map((device) => ({
      text: device.label || `默认摄像头`,
      value: device.deviceId,
    }));
  }

  get optionsResolution() {
    const filterResolutions = this.resolutionList.filter(
      (r) => r.height <= this.capabilities.height.max,
    );
    if (this.settings.height > this.capabilities.height.max) {
      filterResolutions.push({
        width: this.settings.width,
        height: this.settings.height,
      });
    }
    console.log('Filtered Resolutions:', filterResolutions);
    return filterResolutions.map((res) => ({
      text: `${res.width} x ${res.height}`,
      value: res.height,
    }));
  }

  get optionsFramerate() {
    const filterFrameRates = this.PRE_SET_FRAME_RATE_LIST.filter(
      (rate) => rate <= this.capabilities.frameRate.max,
    );
    return filterFrameRates.map((rate) => ({
      text: `${rate} fps`,
      value: rate,
    }));
  }

  private parseBitrate(bitrate: number) {
    return Math.round(bitrate / 1e6);
  }

  mounted(): void {
    console.log(this.optionsResolution);
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
        <CellGroup v-if="availableCameras.length > 0">
          <DropdownMenu
            :direction="screenOrientation.isPortrait ? 'up' : 'down'"
            style="width: 20rem"
          >
            <DropdownItem
              title="摄像头"
              v-model="currentDevice.deviceId"
              :options="optionsCamera"
              @change="switchCamera"
            />
            <DropdownItem
              title="分辨率"
              v-model="settings.height"
              :options="optionsResolution"
              @change="onResolutionChange"
            />
            <DropdownItem
              title="帧率"
              v-model="settings.frameRate"
              :options="optionsFramerate"
              @change="onFrameRateChange"
            />
          </DropdownMenu>
        </CellGroup>
        <div class="bitrate-info" v-if="availableCameras.length">
          <span class="bitrate-label">推流码率: {{ parseBitrate(simulCastConfigs[0].bitrate) }} Mbps</span>
        </div>
        <div v-else class="bitrate-info">摄像头检测失败</div>
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
      font-size: var(--title-font-size);
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
    font-size: var(--text-font-size);
    color: gray;
  }
}

.tip {
  color: gray;
}
</style>
