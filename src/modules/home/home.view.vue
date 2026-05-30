<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Preferences } from '@capacitor/preferences';
import { Inject, Provide, Watch } from 'vue-property-decorator';
import {
  ScreenOrientationState,
  Resolution,
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
  private orientationRefreshTimer: ReturnType<typeof setTimeout> | null = null;
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

  @Watch('screenOrientation.isPortrait')
  onScreenOrientationChange() {
    if (!this.loadCameraSuccess || !this.stream) return;

    if (this.orientationRefreshTimer) {
      clearTimeout(this.orientationRefreshTimer);
    }

    this.orientationRefreshTimer = setTimeout(() => {
      void this.refreshCameraSettingsAfterOrientationChange();
    }, 300);
  }

  @Provide()
  async changeReadyState() {
    this.isReady = !this.isReady;
    if (this.isReady) {
      this.show = false;
      let videoTrack = this.stream.getVideoTracks()[0];
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

      // Pre-produce the camera track so director-side consume requests cannot
      // race ahead of server-side producer registration.
      await this.webrtcManager.startBroadcaster(defaultTrack.trackId, this.stream);
    } else {
      await this.socketManager.handleCancelReady();
    }
  }

  /**
   * 设备设置状态 & 方法
   */
  @Provide()
  async handleResolutionChange(width: number, height: number) {
    if (this.isReady) return;
    await this.mediaDeviceManager.setResolution(width, height);
    this.settings = this.mediaDeviceManager.getCurrentSettings();
  }

  @Provide()
  async handleFrameRateChange(frameRate: number) {
    if (this.isReady) return;
    await this.mediaDeviceManager.setFrameRate(frameRate);
    this.settings = this.mediaDeviceManager.getCurrentSettings();
  }

  @Provide()
  async switchCamera(deviceId: string) {
    if (this.isReady) return;
    await this.mediaDeviceManager.switchCamera(deviceId);
    this.currentDevice = this.mediaDeviceManager.getCurrentDevice();
    this.capabilities = this.mediaDeviceManager.getCapabilities();
    this.settings = this.mediaDeviceManager.getCurrentSettings();
    this.resolutionList = this.mediaDeviceManager.getResolutionList();
  }

  @Provide()
  async onResolutionChange(height: number) {
    if (this.isReady) return;
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
    if (this.isReady) return;
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

  private async refreshCameraSettingsAfterOrientationChange() {
    try {
      await this.mediaDeviceManager.refreshSettings();
      this.capabilities = this.mediaDeviceManager.getCapabilities();
      this.settings = this.mediaDeviceManager.getCurrentSettings();
      this.resolutionList = this.mediaDeviceManager.getResolutionList();
    } catch (error) {
      console.error('Error refreshing camera settings after orientation change:', error);
      showNotify({
        type: 'danger',
        message: '摄像头设置刷新失败',
      });
    }
  }

  @Provide()
  async logout() {
    SocketManager.reset();
    await Preferences.remove({ key: 'loginState' });
    this.$router.push('/login');
  }

  @Provide()
  openDeviceSettings() {
    if (this.isReady) return;
    this.show = true;
  }

  showPopup() {
    if (this.isReady) return;
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
  <div
    class="home-view"
    :class="{
      'home-view-portrait': screenOrientation.isPortrait,
      'home-view-landscape': screenOrientation.isLandscape,
    }"
  >
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
      <Tabbar
        class="home-tabbar"
        unactive-color="#7d7e80"
        active-color="#1989fa"
        v-if="screenOrientation.isPortrait"
      >
        <TabbarItem label="Home">
          <template #icon="props">
            <Home :stroke-width="2" />
          </template>
        </TabbarItem>
        <TabbarItem label="Settings" :disabled="isReady" @click="showPopup">
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
  min-height: 100svh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-right: var(--app-safe-area-right);
  padding-left: var(--app-safe-area-left);

  .home-content {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}

.home-view-portrait {
  .home-content {
    padding-bottom: calc(var(--van-tabbar-height) + var(--app-safe-area-bottom) + 1rem);
  }
}

.home-view-landscape {
  padding-bottom: var(--app-safe-area-bottom);
}

:deep(.home-tabbar.van-tabbar) {
  right: var(--app-safe-area-right);
  left: var(--app-safe-area-left);
  width: auto;
  height: calc(var(--van-tabbar-height) + var(--app-safe-area-bottom));
  padding-bottom: var(--app-safe-area-bottom);
}
</style>
