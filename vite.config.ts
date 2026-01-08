import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // 代理配置：将 /api 请求代理到后端服务器
        proxy: {
          '/api': {
            target: env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:9090',
            changeOrigin: true,
            secure: false,
            // 确保代理路径正确
            rewrite: (path) => path
          }
        }
      },
      plugins: [react()],
      define: {
        // API 配置通过环境变量注入
        // 如果设置了环境变量则使用，否则使用代理（相对路径）
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || '/api'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
