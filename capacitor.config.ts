import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.algoux.kessokutheshot',
  appName: 'Kessoku the Shot',
  webDir: 'dist',
};

export default config;
