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
  screenOrientation!: ScreenOrientationState;

  @Inject()
  stream: MediaStream;
  @Inject()
  settings: MediaTrackSettings | null;
  @Inject()
  loadCameraSuccess!: boolean;
  @Inject()
  simulCastConfigs!: SimulcastConfig[];

  @Watch('stream')
  async onStreamChanged(newStream: MediaStream) {
    if (newStream) {
      await this.updateVideoElement(newStream);
    }
  }

  async updateVideoElement(stream: MediaStream) {
    const video = this.videoRef!;
    video.srcObject = stream;
    await video.play();
  }

  async mounted() {

    // const simulcastConfigs = generateSimulcastConfigs(this.settings.width, this.settings.height, this.settings.frameRate);
    // console.log(simulcastConfigs);
  }
}
</script>

<template>
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
        class="device-info"
        v-if="settings"
        :class="screenOrientation.isPortrait ? 'device-info-portrait' : 'device-info-landscape'"
      >
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
          <span>{{ this.simulCastConfigs[0].bitrate }} bps</span>
        </div>
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
  flex-direction: column;
  position: relative;
  // overflow: hidden;

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
  }
}

.device-info-landscape {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  white-space: nowrap;
  color: white;

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
