import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash]-v17.js',
        entryFileNames: 'assets/[name]-[hash]-v17.js',
        assetFileNames: 'assets/[name]-[hash]-v17.[ext]',
      },
    },
  },
})
