import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://10.0.0.179:8200',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  }
})
