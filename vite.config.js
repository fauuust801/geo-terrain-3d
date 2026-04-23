// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import path from 'path'

export default defineConfig({
base: '/geo-terrain-3d/',
  
  plugins: [
    react(),
    glsl(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.jsx', '.json', '.glsl'],
  },
  server: {
    hmr: {
      overlay: true,
    },
  },
})
