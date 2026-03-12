import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/p_parade_react/',
  server: {
    proxy: {
      '/gas-api': {
        target: 'https://script.google.com',
        changeOrigin: true,
        rewrite: () => '/macros/s/AKfycbyhZ8PUsciHHMgff651G6tjlMjeZRfoo-yeIaq0e3jCdaZ_WSA52e2xcbUJqR50VXe6/exec',
      },
    },
  },
})
