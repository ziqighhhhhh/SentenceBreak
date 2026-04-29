import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.WEBAI2API_BASE_URL': JSON.stringify(env.WEBAI2API_BASE_URL),
      'process.env.WEBAI2API_API_KEY': JSON.stringify(env.WEBAI2API_API_KEY),
      'process.env.WEBAI2API_MODEL': JSON.stringify(env.WEBAI2API_MODEL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/webai': {
          target: env.WEBAI2API_BASE_URL || 'http://47.238.156.250:3000',
          changeOrigin: true,
          rewrite: urlPath => urlPath.replace(/^\/api\/webai/, ''),
        },
      },
    },
  };
});
