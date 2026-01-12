<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Provide } from 'vue-property-decorator';
import { ConfigProvider } from 'vant';
import { Camera } from '@capacitor/camera';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ScreenOrientationState } from './typings/data';

@Options({
  components: {
    ConfigProvider,
  },
})
export default class App extends Vue {
  theme = 'light';

  themeVars = {
    navBarHeight: '0rem',
  };

  @Provide({ reactive: true })
  screenOrientation: ScreenOrientationState = {
    isPortrait: true,
    isLandscape: false,
  };

  async mounted() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.theme = isDark ? 'dark' : 'light';
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.theme = e.matches ? 'dark' : 'light';
    });

    const orientation = await ScreenOrientation.orientation()
    const isPortrait = orientation.type.startsWith('portrait');
    const isLandscape = orientation.type.startsWith('landscape');
    this.screenOrientation = { isPortrait, isLandscape };

    ScreenOrientation.addListener('screenOrientationChange', (event) => {
      const isPortrait = event.type.startsWith('portrait');
      const isLandscape = event.type.startsWith('landscape');
      this.screenOrientation = { isPortrait, isLandscape };
    });

    // await Camera.requestPermissions({
    //   permissions: ['camera'],
    // });
  }
}
</script>

<template>
  <ConfigProvider :theme="theme" :theme-vars="themeVars">
    <router-view />
  </ConfigProvider>
</template>
