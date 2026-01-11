import './index.less';
import 'vant/lib/index.css';
import '@vant/touch-emulator';

import { createApp } from 'vue';
import App from './App.vue';
import { router } from './routes';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
if (Capacitor.isNativePlatform()) await StatusBar.setOverlaysWebView({ overlay: true });

createApp(App).use(router).mount('#app');
