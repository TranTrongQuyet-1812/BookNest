import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cấu hình Vite cho BookNest Frontend
// Proxy toàn bộ request /api về backend chạy ở port 5000 để tránh lỗi CORS trong môi trường phát triển
export default defineConfig({
  plugins: [react()],
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
