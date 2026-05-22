import './index.less';
import 'vant/lib/index.css';
import '@vant/touch-emulator';

import { createApp } from 'vue';
import App from './App.vue';
import { router } from './routes';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

const root = document.documentElement;
const setSafeAreaFallback = (name: string, value: string) => {
  root.style.setProperty(`--app-safe-area-${name}-fallback`, value);
};

if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform();
  root.classList.add('app-native', `app-${platform}`);

  await Camera.requestPermissions({
    permissions: ['camera'],
  });

  if (platform === 'android') {
    await StatusBar.setOverlaysWebView({ overlay: false });
    const statusBarInfo = await StatusBar.getInfo().catch(() => undefined);
    const statusBarOverlaysWebView = statusBarInfo?.overlays === true;

    root.classList.toggle('app-statusbar-overlay', statusBarOverlaysWebView);
    setSafeAreaFallback('top', statusBarOverlaysWebView ? '24px' : '0px');
    setSafeAreaFallback('bottom', '16px');
  } else {
    await StatusBar.setOverlaysWebView({ overlay: true });
  }
}

createApp(App).use(router).mount('#app');
