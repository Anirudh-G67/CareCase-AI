import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://carecase-ai-j4wy.onrender.com',
        changeOrigin: true,
        secure: false,
        // Optional: if your FastAPI endpoints do not include '/api' prefix, rewrite it:
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
})