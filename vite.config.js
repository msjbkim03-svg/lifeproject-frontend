import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 임시 공개 터널(카톡 공유 테스트) 접속 허용 + 외부 주소의 /api 요청을 로컬 백엔드(80)로 전달
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:80',
    },
  },
  preview: {
    allowedHosts: true,
    // HTTPS 임시 터널(trycloudflare.com)에서 api.js 의 http:// 요청을 자동으로 https:// 로 올려 Mixed Content 차단 방지
    headers: {
      'Content-Security-Policy': 'upgrade-insecure-requests',
    },
    proxy: {
      '/api': 'http://localhost:80',
    },
  },
})
