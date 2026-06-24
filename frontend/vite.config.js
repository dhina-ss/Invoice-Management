import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7501,
    proxy: {
      // Forward all /api/* requests to Flask backend during development
      '/api': {
        target: 'http://localhost:7500',
        changeOrigin: true,
      }
    }
  }
})
