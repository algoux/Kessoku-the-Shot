<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Preferences } from '@capacitor/preferences';
import { Inject, Provide } from 'vue-property-decorator';
import {
  ScreenOrientationState,
  Resolution,
  SimulcastConfig,
  HomePageIndexEnum,
  HomeState,
} from '@/typings/data';
import MediaDeviceManager from '@/service/media-device-manager';
import WebRTCManager from '@/service/webrtc-manager';
import SocketManager from '@/service/socket-manager';

import { Button, Tabbar, TabbarItem, Popup, Overlay, Loading, showNotify } from 'vant';
import { User, Home, Settings } from 'lucide-vue-next';
import VideoContainer from '@/components/video-container.vue';
import GlobalSettings from '@/components/global-settings.vue';
import HomeNavBar from '@/components/home-nav-bar.vue';

@Options({
  components: {
    HomeNavBar,
    VideoContainer,
    GlobalSettings,
    Button,
    Tabbar,
    TabbarItem,
    Popup,
    Overlay,
    Loading,
    showNotify,
    User,
    Home,
    Settings,
  },
})
export default class HomeView extends Vue {
  show: boolean = false;
  showOverlay: boolean = false;
  @Inject()
  screenOrientation!: ScreenOrientationState;
  @Provide({ reactive: true })
  isReady: boolean = false;
  @Inject()
  homeState!: HomeState;
  @Inject() webrtcManager!: WebRTCManager;
  @Inject() socketManager!: SocketManager;

  /**
   * 媒体设备管理状态
   */
  mediaDeviceManager: MediaDeviceManager = new MediaDeviceManager();
  @Provide({ reactive: true })
  loadCameraSuccess: boolean = false;
  @Provide({ reactive: true })
  currentDevice: MediaDeviceInfo | null = null;
  @Provide({ reactive: true })
  stream: MediaStream | null = null;
  @Provide({ reactive: true })
  settings: MediaTrackSettings | null = null;
  @Provide({ reactive: true })
  capabilities: MediaTrackCapabilities | null = null;
  @Provide({ reactive: true })
  availableCameras: MediaDeviceInfo[] = [];
  @Provide({ reactive: true })
  resolutionList: Resolution[] = [];

  @Provide()
  async changeReadyState() {
    this.isReady = !this.isReady;
    if (this.isReady) {
      let videoTrack = this.stream.getVideoTracks()[0].clone();
      let defaultTrack = {
        trackId: 'camera_main',
        name: videoTrack.label,
        type: 'video' as 'video' | 'audio',
      };

      const { transport, routerRtpCapabilities } = await this.socketManager.handleConfirmReady({
        shotName: this.homeState.shotName,
        tracks: [defaultTrack],
      });
      await this.webrtcManager.loadMediasoupClientDevice(routerRtpCapabilities);
      await this.webrtcManager.createSendTransport(transport);
      const { cleanUpMediatransport, closeProducers } =
        this.webrtcManager.getEventListenerFunctions();

      this.socketManager.setupEventsListenerFunctions(
        cleanUpMediatransport,
        closeProducers,
        (trackId: string) => this.webrtcManager.startBroadcaster(trackId, this.stream),
      );
    } else {
      await this.socketManager.handleCancelReady();
    }
  }

  /**
   * 设备设置状态 & 方法
   */
  @Provide()
  async handleResolutionChange(width: number, height: number) {
    await this.mediaDeviceManager.setResolution(width, height);
    this.settings = this.mediaDeviceManager.getCurrentSettings();
  }

  @Provide()
  async handleFrameRateChange(frameRate: number) {
    await this.mediaDeviceManager.setFrameRate(frameRate);
    this.settings = this.mediaDeviceManager.getCurrentSettings();
  }

  @Provide()
  async switchCamera(deviceId: string) {
    await this.mediaDeviceManager.switchCamera(deviceId);
    this.currentDevice = this.mediaDeviceManager.getCurrentDevice();
    this.capabilities = this.mediaDeviceManager.getCapabilities();
    this.settings = this.mediaDeviceManager.getCurrentSettings();
    this.resolutionList = this.mediaDeviceManager.getResolutionList();
  }

  @Provide()
  async onResolutionChange(height: number) {
    try {
      const width = Math.round(this.settings.aspectRatio * height);
      await this.mediaDeviceManager.setResolution(width, height);
      this.settings = this.mediaDeviceManager.getCurrentSettings();
    } catch (error) {
      console.error('Error changing resolution:', error);
      showNotify({
        type: 'danger',
        message: '分辨率切换失败',
      });
    }
  }

  @Provide()
  async onFrameRateChange(frameRate: number) {
    try {
      await this.mediaDeviceManager.setFrameRate(frameRate);
      this.settings = this.mediaDeviceManager.getCurrentSettings();
    } catch (error) {
      console.error('Error changing frame rate:', error);
      showNotify({
        type: 'danger',
        message: '帧率切换失败',
      });
    }
  }

  @Provide({ reactive: true })
  get simulCastConfigs(): SimulcastConfig[] {
    return [
      {
        rid: 'origin',
        scaleResolutionDownBy: 1.0,
        bitrate: this.calulateBitrate(
          this.settings.width,
          this.settings.height,
          this.settings.frameRate,
          1.0,
        ),
      },
      {
        rid: 'low',
        scaleResolutionDownBy: 4.0,
        bitrate: this.calulateBitrate(
          this.settings.width,
          this.settings.height,
          this.settings.frameRate,
          4.0,
        ),
      },
    ];
  }

  private calulateBitrate(
    width: number,
    height: number,
    frameRate: number,
    scaleResolutionDownBy: number,
  ): number {
    const scaledWidth = width / scaleResolutionDownBy;
    const scaledHeight = height / scaleResolutionDownBy;
    return scaledWidth * scaledHeight * frameRate * 0.000078125 * 1000;
  }

  async mounted() {
    try {
      this.showOverlay = true;
      console.log('Initializing media devices...');
      await this.initializeMediaDevices();
      this.loadCameraSuccess = true;
    } catch (error) {
      console.error('Error initializing media devices:', error);
      this.loadCameraSuccess = false;
    } finally {
      this.showOverlay = false;
    }
  }

  private async initializeMediaDevices() {
    await this.mediaDeviceManager.init();
    this.availableCameras = this.mediaDeviceManager.getDevices();
    this.currentDevice = this.mediaDeviceManager.getCurrentDevice();
    this.stream = await this.mediaDeviceManager.start();
    this.capabilities = this.mediaDeviceManager.getCapabilities();
    this.settings = this.mediaDeviceManager.getCurrentSettings();
    this.resolutionList = this.mediaDeviceManager.getResolutionList();
  }

  @Provide()
  async logout() {
    await Preferences.remove({ key: 'loginState' });
    this.$router.push('/login');
  }

  @Provide()
  openDeviceSettings() {
    this.show = true;
  }

  showPopup() {
    this.show = true;
  }

  @Provide()
  onCameraSwitchError() {
    this.loadCameraSuccess = false;
  }
}
</script>

<template>
  <Overlay :show="showOverlay" style="display: flex; justify-content: center; align-items: center">
    <Loading type="spinner" size="24"> 加载设备... </Loading>
  </Overlay>
  <div class="home-view">
    <Popup v-model:show="show" position="bottom">
      <template #default>
        <GlobalSettings @close="show = false" />
      </template>
    </Popup>
    <HomeNavBar />
    <div class="home-content">
      <VideoContainer ref="videoContainer" />
    </div>
    <!-- <footer class="home-footer" v-if="screenOrientation.isPortrait"> -->
      <Tabbar unactive-color="#7d7e80" active-color="#1989fa" safe-area-inset-bottom v-if="screenOrientation.isPortrait">
        <TabbarItem label="Home">
          <template #icon="props">
            <Home :stroke-width="2" />
          </template>
        </TabbarItem>
        <TabbarItem label="Settings" @click="showPopup">
          <template #icon="props">
            <Settings :stroke-width="2" />
          </template>
        </TabbarItem>
      </Tabbar>
    <!-- </footer> -->
  </div>
</template>

<style lang="less" scoped>
.home-view {
  width: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-top: 2rem;

  .home-content {
    flex: 1;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
</style>
