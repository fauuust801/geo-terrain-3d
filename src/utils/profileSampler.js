/**
 * ═══════════════════════════════════════════════════════════
 *  profileSampler.js
 *  沿剖面线采样高程数据
 * ═══════════════════════════════════════════════════════════
 *
 *  数学原理:
 *
 *    给定两个端点 P₀(x₀, z₀) 和 P₁(x₁, z₁)，
 *    沿线段进行 N 次等距采样：
 *
 *      Pᵢ = P₀ + (i/N) · (P₁ - P₀),   i = 0, 1, ..., N
 *
 *    每个采样点的水平距离（累计弧长）:
 *
 *      dᵢ = i · ‖P₁ - P₀‖ / N
 *
 *    采样数 N 的选择:
 *      取 max(200, ‖P₁-P₀‖ / 地形网格分辨率 × 2)
 *      确保采样密度 ≥ 地形网格密度的 2 倍 (Nyquist 准则)
 *
 *  在地理学中，这等价于在 1:25000 地形图上沿直线
 *  量取各等高线交点的海拔，然后绘制到方格纸上。
 * ═══════════════════════════════════════════════════════════
 */

import { getHeight, TERRAIN_SIZE } from './terrainGenerator'

/**
 * 沿剖面线采样高程数据
 *
 * @param {{ x: number, z: number }} p0 - 起点
 * @param {{ x: number, z: number }} p1 - 终点
 * @param {number} [sampleCount=200]    - 采样点数
 * @returns {Array<{
 *   distance: number,   // 到起点的水平距离 (场景单位)
 *   distanceM: number,  // 换算后的"概念米" (×100)
 *   elevation: number,  // 海拔高度 (m)
 *   x: number,          // 采样点 X 坐标
 *   z: number,          // 采样点 Z 坐标
 *   slope: number,      // 该段坡度 (°)
 *   index: number       // 采样序号
 * }>}
 */
export function sampleProfile(p0, p1, sampleCount = 200) {
  const dx = p1.x - p0.x
  const dz = p1.z - p0.z
  const totalDist = Math.sqrt(dx * dx + dz * dz)

  if (totalDist < 0.001) return []

  const result = []
  let prevH = null

  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount
    const x = p0.x + dx * t
    const z = p0.z + dz * t
    const distance = totalDist * t
    const elevation = getHeight(x, z)

    // 计算局部坡度 (与前一个采样点的高差 / 水平距)
    let slope = 0
    if (prevH !== null && i > 0) {
      const segDist = totalDist / sampleCount
      // 概念距离：场景 1 单位 = 100 m
      const segDistM = segDist * 100
      const dh = elevation - prevH
      slope = Math.atan2(Math.abs(dh), segDistM) * (180 / Math.PI)
    }

    result.push({
      distance,
      distanceM: distance * 100,  // 场景单位 → 概念米
      elevation: Math.round(elevation * 10) / 10,
      x,
      z,
      slope: Math.round(slope * 10) / 10,
      index: i,
    })

    prevH = elevation
  }

  return result
}

/**
 * 计算剖面统计信息
 *
 * @param {Array} profileData - sampleProfile() 的返回值
 * @returns {Object} 统计数据
 */
export function computeProfileStats(profileData) {
  if (!profileData || profileData.length === 0) {
    return {
      totalDistance: 0,
      minElevation: 0,
      maxElevation: 0,
      elevationGain: 0,
      elevationLoss: 0,
      avgSlope: 0,
      maxSlope: 0,
      relief: 0,
    }
  }

  let minElev = Infinity
  let maxElev = -Infinity
  let totalGain = 0
  let totalLoss = 0
  let maxSlope = 0
  let slopeSum = 0

  for (let i = 0; i < profileData.length; i++) {
    const p = profileData[i]
    minElev = Math.min(minElev, p.elevation)
    maxElev = Math.max(maxElev, p.elevation)
    maxSlope = Math.max(maxSlope, p.slope)
    slopeSum += p.slope

    if (i > 0) {
      const dh = p.elevation - profileData[i - 1].elevation
      if (dh > 0) totalGain += dh
      else totalLoss += Math.abs(dh)
    }
  }

  const lastPoint = profileData[profileData.length - 1]

  return {
    totalDistance: Math.round(lastPoint.distanceM),
    minElevation: Math.round(minElev),
    maxElevation: Math.round(maxElev),
    relief: Math.round(maxElev - minElev),
    elevationGain: Math.round(totalGain),
    elevationLoss: Math.round(totalLoss),
    avgSlope: Math.round(slopeSum / profileData.length * 10) / 10,
    maxSlope: Math.round(maxSlope * 10) / 10,
  }

  
}

/* ======================================================================
 * ✅ 扩展区（不影响原有函数）
 * 目标：兼容“UV输入 + heightData采样”的新接口契约
 * ====================================================================== */
/**
 * Clamp helper / 数值钳制
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}
/**
 * 场景坐标 (x,z) → 归一化 UV
 * Scene coords -> normalized UV
 *
 * 约定：地形范围约为 [-TERRAIN_SIZE/2, +TERRAIN_SIZE/2]
 * @param {{x:number, z:number}} p
 * @returns {{u:number, v:number}}
 */
export function sceneToUV(p) {
  const half = TERRAIN_SIZE / 2
  const u = (p.x + half) / TERRAIN_SIZE
  const v = (p.z + half) / TERRAIN_SIZE
  return { u: clamp(u, 0, 1), v: clamp(v, 0, 1) }
}
/**
 * 归一化 UV → 场景坐标 (x,z)
 * normalized UV -> scene coords
 * @param {{u:number, v:number}} uv
 * @returns {{x:number, z:number}}
 */
export function uvToScene(uv) {
  const half = TERRAIN_SIZE / 2
  return {
    x: uv.u * TERRAIN_SIZE - half,
    z: uv.v * TERRAIN_SIZE - half,
  }
}
/**
 * 从 heightData 做双线性插值
 * Bilinear sample on height map array
 *
 * @param {Float32Array|number[]} heightData
 * @param {number} mapSize
 * @param {number} u - [0,1]
 * @param {number} v - [0,1]
 * @param {{flipV?: boolean}} [options]
 * @returns {number}
 */
export function bilinearSampleHeight(heightData, mapSize, u, v, options = {}) {
  if (!heightData || !mapSize || mapSize < 2) return 0
  const { flipV = true } = options
  const uu = clamp(u, 0, 1)
  const vv = clamp(v, 0, 1)
  const vUsed = flipV ? 1 - vv : vv
  const x = uu * (mapSize - 1)
  const y = vUsed * (mapSize - 1)
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, mapSize - 1)
  const y1 = Math.min(y0 + 1, mapSize - 1)
  const tx = x - x0
  const ty = y - y0
  const idx = (xx, yy) => yy * mapSize + xx
  const h00 = heightData[idx(x0, y0)] ?? 0
  const h10 = heightData[idx(x1, y0)] ?? 0
  const h01 = heightData[idx(x0, y1)] ?? 0
  const h11 = heightData[idx(x1, y1)] ?? 0
  const h0 = h00 * (1 - tx) + h10 * tx
  const h1 = h01 * (1 - tx) + h11 * tx
  return h0 * (1 - ty) + h1 * ty
}
/**
 * 新接口：按 UV 端点在 heightData 上采样剖面
 *
 * 输入（写在注释里，避免 JS 语法报错）:
 *   p1, p2: {u, v}
 *   heightData: Float32Array
 *   mapSize: number
 *   sampleCount: number
 *
 * 输出:
 *   Array<{ distance: number, elevation: number }>
 *
 * @param {{u:number,v:number}} p1
 * @param {{u:number,v:number}} p2
 * @param {Float32Array|number[]} heightData
 * @param {number} mapSize
 * @param {number} [sampleCount=64]
 * @param {{flipV?: boolean}} [options]
 * @returns {Array<{distance:number,elevation:number}>}
 */
export function sampleProfileUV(
  p1,
  p2,
  heightData,
  mapSize,
  sampleCount = 64,
  options = {}
) {
  const n = Math.max(2, Math.floor(sampleCount))
  const du = p2.u - p1.u
  const dv = p2.v - p1.v
  const totalDist = Math.sqrt(du * du + dv * dv) * (mapSize - 1)
  if (totalDist < 1e-9) return []
  const curve = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const u = p1.u + du * t
    const v = p1.v + dv * t
    const elevation = bilinearSampleHeight(heightData, mapSize, u, v, options)
    curve.push({
      distance: totalDist * t,
      elevation: Math.round(elevation * 10) / 10,
    })
  }
  return curve
}
/**
 * 估算建议采样数（可选工具函数，不影响旧逻辑）
 * Recommend sample count by Nyquist-style heuristic
 *
 * @param {{x:number,z:number}} p0
 * @param {{x:number,z:number}} p1
 * @param {number} [gridResolution=256]
 * @param {number} [minSamples=200]
 * @returns {number}
 */
export function recommendSampleCount(p0, p1, gridResolution = 256, minSamples = 200) {
  const dx = p1.x - p0.x
  const dz = p1.z - p0.z
  const dist = Math.sqrt(dx * dx + dz * dz)
  const gridSize = TERRAIN_SIZE / gridResolution
  const nyquistSamples = Math.ceil((dist / gridSize) * 2)
  return Math.max(minSamples, nyquistSamples)
}