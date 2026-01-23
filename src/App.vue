<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Provide } from 'vue-property-decorator';
import { ConfigProvider } from 'vant';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ScreenOrientationState } from './typings/data';
import SocketManager from './service/socket-manager';
import { Preferences } from '@capacitor/preferences';

@Options({
  components: {
    ConfigProvider,
  },
})
export default class App extends Vue {
  theme = 'light';

  @Provide({ reactive: true })
  socketManager!: SocketManager;

  themeVars = {
    // navBarHeight: '0rem',
  };

  @Provide({ reactive: true })
  screenOrientation: ScreenOrientationState = {
    isPortrait: true,
    isLandscape: false,
  };

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
      this.socketManager = SocketManager.getInstance(localState.alias, localState.shotToken);
    }
  }

  async login(alias: string, token: string) {}

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
