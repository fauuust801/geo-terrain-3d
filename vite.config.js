// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import path from 'path'

export default defineConfig({
  // ✅ 新增这一行，把 your-repo-name 换成你的 GitHub 仓库名
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
