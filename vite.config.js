// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'  // ✅ 新增
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    glsl(),  // ✅ 新增：让 Vite 能识别 .glsl 文件
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.js', '.jsx', '.json', '.glsl'],  // ✅ 加上 .glsl
  },
  server: {
    hmr: {
      overlay: true,
    },
  },
})
