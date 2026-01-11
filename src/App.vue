<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { ConfigProvider } from 'vant';
import { Camera } from '@capacitor/camera';

@Options({
  components: {
    ConfigProvider,
  },
})
export default class App extends Vue {
  theme = 'light';

  themeVars = {
    navBarHeight: '1rem',
  };

  async mounted() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.theme = isDark ? 'dark' : 'light';
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.theme = e.matches ? 'dark' : 'light';
    });
    
    await Camera.requestPermissions({
      permissions: ['camera'],
    });
  }
}
</script>

<template>
  <ConfigProvider :theme="theme" :theme-vars="themeVars">
    <router-view />
  </ConfigProvider>
</template>
