import { fileURLToPath, URL } from 'node:url';
// import mkcert from 'vite-plugin-mkcert'
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()], // 暂时禁用 mkcert
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'dev.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'dev.crt')),
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
