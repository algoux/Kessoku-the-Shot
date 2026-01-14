import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.algoux.kessokutheshot',
  appName: 'Kessoku the Shot',
  webDir: 'dist',
  android: {
    // 关闭 edge-to-edge，保留系统状态栏安全区
    // 需重新 sync：pnpm sync 或 npx cap sync android
    useLegacyBridge: false,
    backgroundColor: '#ffffff',
    edgeToEdge: false,
  },
};

export default config;
