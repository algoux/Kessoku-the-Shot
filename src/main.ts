import './index.less';
import 'vant/lib/index.css';
import '@vant/touch-emulator';

import { createApp } from 'vue';
import App from './App.vue';
import { router } from './routes';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform();
  await Camera.requestPermissions({
    permissions: ['camera'],
  });
  if (platform === 'android') {
    // Android：关闭覆盖，留出状态栏安全区
    await StatusBar.setOverlaysWebView({ overlay: false });
  } else {
    // iOS：使用安全区，由 safe-area 生效
    await StatusBar.setOverlaysWebView({ overlay: true });
  }
}

createApp(App).use(router).mount('#app');
