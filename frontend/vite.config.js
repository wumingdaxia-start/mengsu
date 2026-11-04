import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  server: {
    proxy: {
      '/account-service': { target: 'http://127.0.0.1:8000', changeOrigin: false },
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false },
      '/audio': 'http://127.0.0.1:8000'
    }
  },
  build: {
    outDir: 'dist'
  }
})
