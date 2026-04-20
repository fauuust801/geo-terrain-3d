/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        terrain: {
          low:  '#2d6a4f',   // 低海拔：深绿
          mid:  '#d4a373',   // 中海拔：黄褐
          high: '#8b4513',   // 高海拔：棕色
          peak: '#f5f5f5',   // 峰顶：雪白
        },
        panel: {
          bg:   '#0f172a',   // 面板背景：深蓝黑
          card: '#1e293b',   // 卡片背景
          text: '#e2e8f0',   // 文字颜色
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    }
  },
  plugins: []
}
