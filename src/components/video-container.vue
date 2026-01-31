<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { ScreenOrientationState, SimulcastConfig } from '@/typings/data';
import { Inject, Watch } from 'vue-property-decorator';

import { Camera } from 'lucide-vue-next';

@Options({
  components: {
    Camera,
  },
})
export default class VideoContainer extends Vue {
  videoRef: HTMLVideoElement | null = null;
  showOverlay = false;
  @Inject()
  isReady!: boolean;
  @Inject()
  screenOrientation!: ScreenOrientationState;
  @Inject()
  stream: MediaStream;
  @Inject()
  settings: MediaTrackSettings | null;
  @Inject()
  loadCameraSuccess!: boolean;
  @Inject()
  simulCastConfigs!: SimulcastConfig[];
  @Inject()
  onCameraSwitchError!: () => void;

  @Watch('stream')
  async onStreamChanged(newStream: MediaStream) {
    try {
      await this.updateVideoElement(newStream);
    } catch (_) {
      this.onCameraSwitchError();
    }
  }

  async updateVideoElement(stream: MediaStream) {
    const video = this.videoRef!;
    video.srcObject = stream;
    await video.play();
  }

  // 将码率转换为 Mbps 单位
  private parseBitrate(bitrate: number) {
    return Math.round(bitrate / 1e6);
  }

  async mounted() {
    console.log(this.loadCameraSuccess);
  }
}
</script>

<template>
  <div class="video-wrapper" :class="screenOrientation.isPortrait ? 'video-wrapper-portrait' : ''">
    <div class="video-container" :class="screenOrientation.isPortrait ? 'portrait' : 'landscape'">
      <video ref="videoRef" autoplay playsinline muted id="localVideo" v-show="loadCameraSuccess" />
      <div class="camera-icon" v-if="!loadCameraSuccess">
        <Camera size="48" />
      </div>
      <div class="device-info" :class="screenOrientation.isLandscape ? 'device-info-landscape' : ''" v-if="settings">
        <div class="info-item">
          <span class="info-label">分辨率:</span>
          <span class="info-value">{{ settings.width }}x{{ settings.height }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">帧率:</span>
          <span class="info-value">{{ settings.frameRate.toFixed(1) }} FPS</span>
        </div>
        <div class="info-item">
          <span class="info-label">码率:</span>
          <span>{{ this.parseBitrate(this.simulCastConfigs[0].bitrate) }} Mbps</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.ready-state {
  opacity: 0.5;
}

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

.video-wrapper-portrait {
  height: 100%;
  position: relative;
}

.video-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;

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
  position: absolute;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  white-space: nowrap;
  color: white;

  .info-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
}

.device-info-landscape {
  bottom: 1rem;
}

.portrait {
  // aspect-ratio: 16 / 9;
  height: 100%;
  // padding: 0.5rem;
}

.landscape {
  height: 100vh;
  position: absolute;
  top: 0;
}
</style>
