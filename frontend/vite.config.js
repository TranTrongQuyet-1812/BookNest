import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import fs from 'node:fs'

const thuMucDuAn = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const timDuongDanModule = (ten) => {
  const oFrontend = path.join(thuMucDuAn, 'frontend/node_modules', ten)
  if (fs.existsSync(oFrontend)) return oFrontend
  const oRoot = path.join(thuMucDuAn, 'node_modules', ten)
  if (fs.existsSync(oRoot)) return oRoot
  return ten
}

// Cấu hình Vite cho BookNest Frontend
// Proxy toàn bộ request /api về backend chạy ở port 5000 để tránh lỗi CORS trong môi trường phát triển
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: timDuongDanModule('react'),
      axios: timDuongDanModule('axios'),
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
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          if (id.includes('node_modules/gsap')) {
            return 'vendor-gsap';
          }
        }
      }
    }
  }
})
