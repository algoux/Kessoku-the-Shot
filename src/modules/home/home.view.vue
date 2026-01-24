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

import { Button, Tabbar, TabbarItem, Popup, Overlay, Loading } from 'vant';
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
    User,
    Home,
    Settings,
  },
})
export default class HomeView extends Vue {
  show: boolean = false;
  showOverlay: boolean = false;
  currentPageIndex: HomePageIndexEnum = HomePageIndexEnum.HOME;
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
      console.log(this.stream.getTracks());
      let videoTrack = this.stream.getVideoTracks()[0].clone();
      let defaultTrack = {
        trackId: 'camera_main',
        name: videoTrack.label,
        type: 'video' as 'video' | 'audio',
      };

      console.log('Sending confirmReady with track:', defaultTrack);

      const { transport, routerRtpCapabilities } = await this.socketManager.handleConfirmReady({
        shotName: this.homeState.shotName,
        tracks: [defaultTrack],
      });

      console.log(
        'Received transport and router RTP capabilities:',
        transport,
        routerRtpCapabilities,
      );

      // let tracks = this.stream?.getVideoTracks();
      // const res = this.socketManager.handleConfirmReady({
      //   shotName: this.homeState.shotName,
      // })
    } else {
      // todo
      // 取消就绪状态，并且清理 tranport produce 等信息
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
    this.settings = this.mediaDeviceManager.getCurrentSettings();
    this.currentDevice = this.mediaDeviceManager.getCurrentDevice();
  }

  @Provide()
  async onResolutionChange(height: number) {
    const width = Math.round(this.settings.aspectRatio * height);
    await this.mediaDeviceManager.setResolution(width, height);
    this.settings = this.mediaDeviceManager.getCurrentSettings();
  }

  @Provide()
  async onFrameRateChange(frameRate: number) {
    await this.mediaDeviceManager.setFrameRate(frameRate);
    this.settings = this.mediaDeviceManager.getCurrentSettings();
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
    } finally {
      this.showOverlay = false;
    }
  }

  private async initializeMediaDevices() {
    try {
      await this.mediaDeviceManager.init();
      this.availableCameras = this.mediaDeviceManager.getDevices();
      this.currentDevice = this.mediaDeviceManager.getCurrentDevice();
      this.stream = await this.mediaDeviceManager.start();
      this.capabilities = this.mediaDeviceManager.getCapabilities();
      this.settings = this.mediaDeviceManager.getCurrentSettings();
      this.resolutionList = this.mediaDeviceManager.getResolutionList();
    } catch (error) {
      console.log(error);
    }
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
      <VideoContainer ref="videoContainer" v-if="this.currentPageIndex === 0" />
    </div>
    <footer class="home-footer" v-if="screenOrientation.isPortrait">
      <Tabbar unactive-color="#7d7e80" active-color="#1989fa">
        <TabbarItem label="Home">
          <template #icon="props">
            <Home :stroke-width="1" />
          </template>
        </TabbarItem>
        <TabbarItem label="Settings" @click="showPopup">
          <template #icon="props">
            <Settings :stroke-width="1" />
          </template>
        </TabbarItem>
      </Tabbar>
    </footer>
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

  .home-footer {
    width: 100%;
    flex-shrink: 0;
  }
}
</style>
