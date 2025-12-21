import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.algoux.kessokutheshot',
  appName: 'Kessoku the Shot',
  webDir: 'dist',

  server: {
    url: 'http://192.168.1.107:5173',
    cleartext: true,
  },
};

export default config;
