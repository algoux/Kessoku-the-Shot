import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.algoux.kessokutheshot',
  appName: 'Kessoku the Shot',
  webDir: 'dist',

  ...(isDev && {
    server: {
      url: 'https://192.168.1.107:5173',
      cleartext: false,
      allowNavigation: ['*'],
    },
  }),
};

export default config;
