import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const thuMucDuAn = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Cấu hình Vite cho BookNest Frontend
// Proxy toàn bộ request /api về backend chạy ở port 5000 để tránh lỗi CORS trong môi trường phát triển
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.join(thuMucDuAn, 'frontend/node_modules/react'),
      axios: path.join(thuMucDuAn, 'frontend/node_modules/axios'),
      '@booknest/shared/api': path.join(thuMucDuAn, 'packages/shared/src/api.js'),
      '@booknest/shared/auth': path.join(thuMucDuAn, 'packages/shared/src/context/AuthContext.jsx')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
