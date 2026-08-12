import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the local Laravel backend during development.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Split third-party code into stable vendor chunks so repeat visits and
    // app updates only re-download what actually changed (better HTTP cache
    // hits than one monolithic bundle).
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('lucide-vue-next')) return 'lucide'
          if (id.includes('vue') || id.includes('@vue')) return 'vue-vendor'
          return 'vendor'
        },
      },
    },
  },
})
