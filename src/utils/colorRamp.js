/**
 * ═══════════════════════════════════════════════════════════
 *  colorRamp.js
 *  地形分层设色 (Hypsometric Tinting) 工具
 * ═══════════════════════════════════════════════════════════
 *
 *  地理学中，地形图的分层设色遵循国际通用色谱：
 *  低海拔 → 绿色（植被）
 *  中海拔 → 黄褐色（裸露岩土）
 *  高海拔 → 棕色（高山带）
 *  极高   → 白色（雪线以上）
 */

/**
 * 颜色分段控制点（仿照 Natural Earth / ETOPO 色谱）
 * t: 归一化高程 [0, 1]
 * r, g, b: 颜色分量 [0, 1]
 */
const COLOR_STOPS = [
  { t: 0.00, r: 0.18, g: 0.42, b: 0.31 },  // #2D6B4F 深绿 — 低地/河谷
  { t: 0.12, r: 0.24, g: 0.55, b: 0.38 },  // #3D8D61 绿色 — 平原
  { t: 0.28, r: 0.52, g: 0.73, b: 0.40 },  // #85BA66 浅绿 — 丘陵
  { t: 0.42, r: 0.76, g: 0.80, b: 0.42 },  // #C2CD6B 黄绿 — 低山
  { t: 0.55, r: 0.85, g: 0.72, b: 0.42 },  // #D9B86B 土黄 — 中山
  { t: 0.68, r: 0.78, g: 0.55, b: 0.32 },  // #C78C52 黄褐 — 高山
  { t: 0.80, r: 0.60, g: 0.40, b: 0.22 },  // #996638 棕色 — 高山带
  { t: 0.90, r: 0.70, g: 0.62, b: 0.55 },  // #B39E8C 灰褐 — 裸岩
  { t: 1.00, r: 0.96, g: 0.96, b: 0.96 },  // #F5F5F5 雪白 — 雪线以上
]

/**
 * 线性插值 (lerp)
 */
function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * 根据归一化高程 t ∈ [0, 1] 返回色带颜色
 *
 * @param {number} t - 归一化高程值
 * @returns {{ r: number, g: number, b: number }} 颜色分量 [0, 1]
 */
export function getTerrainColor(t) {
  // 钳位到 [0, 1]
  const tc = Math.max(0, Math.min(1, t))

  // 找到 t 所在的区间 [stops[i], stops[i+1]]
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const s0 = COLOR_STOPS[i]
    const s1 = COLOR_STOPS[i + 1]

    if (tc >= s0.t && tc <= s1.t) {
      // 区间内归一化
      const localT = (tc - s0.t) / (s1.t - s0.t)
      return {
        r: lerp(s0.r, s1.r, localT),
        g: lerp(s0.g, s1.g, localT),
        b: lerp(s0.b, s1.b, localT),
      }
    }
  }

  // fallback: 返回最后一个色阶
  const last = COLOR_STOPS[COLOR_STOPS.length - 1]
  return { r: last.r, g: last.g, b: last.b }
}

/**
 * 将色带导出为 GLSL 可用的 vec3 数组字符串
 * (供 Step 3 的 shader 使用)
 */
export function getColorStopsForShader() {
  return COLOR_STOPS.map(s => ({
    t: s.t,
    color: [s.r, s.g, s.b],
  }))
}

export { COLOR_STOPS }
