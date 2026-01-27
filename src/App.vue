<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Provide } from 'vue-property-decorator';
import { ConfigProvider, showNotify } from 'vant';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ScreenOrientationState } from './typings/data';
import SocketManager from './service/socket-manager';
import { Preferences } from '@capacitor/preferences';
import { HomeState } from './typings/data';
import WebRTCManager from './service/webrtc-manager';

@Options({
  components: {
    ConfigProvider,
    showNotify,
  },
})
export default class App extends Vue {
  theme = 'light';
  @Provide({ reactive: true })
  loading: boolean = false;

  @Provide({ reactive: true })
  socketManager!: SocketManager;

  @Provide({ reactive: true })
  webrtcManager: WebRTCManager;

  themeVars = {
    // navBarHeight: '0rem',
  };

  @Provide({ reactive: true })
  screenOrientation: ScreenOrientationState = {
    isPortrait: true,
    isLandscape: false,
  };

  @Provide({ reactive: true })
  homeState: HomeState = {
    shotName: '',
    title: '',
  };

  handleConnectError(error: Error) {
    console.error('Socket connection error:', error);
    showNotify({
      type: 'danger',
      message: `服务器连接错误`,
    });
    this.loading = false;
    SocketManager.reset();
  }

  async mounted() {
    await this.initTheme();
    const localState = await Preferences.get({ key: 'loginState' }).then((res) =>
      JSON.parse(res.value || '{}'),
    );
    console.log('Retrieved local login state:', localState);
    if (!localState.shotName || !localState.contest || !localState.alias) {
      console.log('No valid login state found, redirecting to login page.');
      this.$router.push('/login');
      return;
    } else {
      this.socketManager = SocketManager.getInstance(
        localState.alias,
        localState.shotToken,
        this.handleConnectError.bind(this),
      );
      this.homeState = {
        shotName: localState.shotName,
        title: localState.contest.title,
      };
      this.webrtcManager = new WebRTCManager({
        connectTransport: this.socketManager.handleCompleteConnectTransport.bind(this.socketManager),
        produce: this.socketManager.handleProduce.bind(this.socketManager),
      });
      this.$router.push('/');
    }
  }
  @Provide()
  async login(alias: string, shotName: string, token: string) {
    try {
      this.socketManager = SocketManager.getInstance(alias, token, this.handleConnectError.bind(this));
      const contestInfo = await this.socketManager.getContestInfo();
      console.log('Contest Info:', contestInfo);
      await Preferences.set({
        key: 'loginState',
        value: JSON.stringify({
          shotName: shotName,
          alias: contestInfo.data.alias,
          contest: contestInfo.data.contest,
          serverTimestamp: contestInfo.data.serverTimestamp,
          shotToken: token,
        }),
      });
      this.homeState = {
        shotName: shotName,
        title: String(contestInfo.data.contest.title),
      };
      this.$router.push('/');
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  async initTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.theme = isDark ? 'dark' : 'light';

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.theme = e.matches ? 'dark' : 'light';
    });

    const orientation = await ScreenOrientation.orientation();
    const isPortrait = orientation.type.startsWith('portrait');
    const isLandscape = orientation.type.startsWith('landscape');
    this.screenOrientation = { isPortrait, isLandscape };

    ScreenOrientation.addListener('screenOrientationChange', (event) => {
      const isPortrait = event.type.startsWith('portrait');
      const isLandscape = event.type.startsWith('landscape');
      this.screenOrientation = { isPortrait, isLandscape };
    });
  }
}
</script>

<template>
  <ConfigProvider :theme="theme" :theme-vars="themeVars">
    <router-view />
  </ConfigProvider>
</template>
