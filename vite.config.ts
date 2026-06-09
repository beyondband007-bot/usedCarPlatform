import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), vueJsx(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3101',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3101',
        changeOrigin: true,
      },
      '/results': {
        target: 'http://localhost:3101',
        changeOrigin: true,
      },
      '/packages': {
        target: 'http://localhost:3101',
        changeOrigin: true,
      },
      '/scene-refs': {
        target: 'http://localhost:3101',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
