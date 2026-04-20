/**
 * ═══════════════════════════════════════════════════════════
 *  contourAnalyzer.js
 *  模式 A 下，对当前高亮等高面进行简化分析
 * ═══════════════════════════════════════════════════════════
 *
 *  地理学背景:
 *    等高面 = 两条相邻等高线之间的带状区域
 *    分析指标: 面积占比、平均坡度、地貌类型判定
 *
 *  [修复记录]
 *    - 去掉了文件被重复粘贴导致的 redeclare 错误
 *    - 坡度计算的水平距离换算系数从 *100 调整为 *1000
 *      原因: 1 世界单位 ≈ 1km (1000m)
 *      旧系数导致水平距离被低估 10 倍 → 梯度高估 → 全判为陡崖
 */

import { getHeight, TERRAIN_SIZE } from './terrainGenerator'

/**
 * 世界坐标到概念米的换算系数
 *
 * 地理学原理:
 *   在教学地形中，TERRAIN_SIZE 个世界单位通常代表一个
 *   数公里级的真实地理区域。取 1 世界单位 ≈ 1000m
 *   可使坡度计算结果落在合理的地貌分类区间内。
 *
 *   如果你的 terrainGenerator 代表更大/更小的区域，
 *   请相应调整此系数:
 *     - 1 世界单位 = 500m  → 设为 500
 *     - 1 世界单位 = 2000m → 设为 2000
 */
const WORLD_UNIT_TO_METERS = 1000

/**
 * 分析指定海拔区间的等高面特征
 *
 * @param {number} elevation     - 当前海拔
 * @param {number} interval      - 等高距
 * @param {number} [gridSize=80] - 分析网格密度
 * @returns {Object} 等高面统计
 */
export function analyzeContourBand(elevation, interval, gridSize = 80) {
  if (elevation < 0) {
    return {
      bandMin: 0,
      bandMax: 0,
      areaRatio: 0,
      avgSlope: 0,
      sampleCount: 0,
      landformType: '—',
      elevLabel: '—',
    }
  }

  const bandIndex = Math.floor(elevation / interval)
  const bandMin = bandIndex * interval
  const bandMax = bandMin + interval

  const halfSize = TERRAIN_SIZE / 2
  const step = TERRAIN_SIZE / gridSize

  let inBandCount = 0
  let totalCount = 0
  let slopeSum = 0

  // 在网格上逐点判断
  for (let ix = 0; ix < gridSize; ix++) {
    for (let iz = 0; iz < gridSize; iz++) {
      const x = -halfSize + (ix + 0.5) * step
      const z = -halfSize + (iz + 0.5) * step
      const h = getHeight(x, z)

      totalCount++

      if (h >= bandMin && h < bandMax) {
        inBandCount++

        // 计算局部坡度 (中心差分)
        const eps = step * 0.5
        const hx1 = getHeight(x + eps, z)
        const hx0 = getHeight(x - eps, z)
        const hz1 = getHeight(x, z + eps)
        const hz0 = getHeight(x, z - eps)

        // ★ 修复点：用正确的比例因子将世界坐标换算为概念米
        //   水平真实距离 = 2 * eps * WORLD_UNIT_TO_METERS (米)
        //   高程差单位本身就是米，无需换算
        const horizontalDist = 2 * eps * WORLD_UNIT_TO_METERS
        const dhx = (hx1 - hx0) / horizontalDist
        const dhz = (hz1 - hz0) / horizontalDist
        const slopeDeg = Math.atan(Math.sqrt(dhx * dhx + dhz * dhz)) * (180 / Math.PI)
        slopeSum += slopeDeg
      }
    }
  }

  const areaRatio = inBandCount / totalCount
  const avgSlope = inBandCount > 0 ? slopeSum / inBandCount : 0

  // 地貌类型简易判定
  let landformType = '缓坡'
  if (avgSlope > 35) landformType = '陡崖/急坡'
  else if (avgSlope > 20) landformType = '陡坡'
  else if (avgSlope > 10) landformType = '中坡'
  else if (avgSlope > 3) landformType = '缓坡'
  else landformType = '平地/台地'

  return {
    bandMin: Math.round(bandMin),
    bandMax: Math.round(bandMax),
    areaRatio: Math.round(areaRatio * 10000) / 100,  // %
    avgSlope: Math.round(avgSlope * 10) / 10,
    sampleCount: inBandCount,
    landformType,
    elevLabel: `${Math.round(bandMin)}–${Math.round(bandMax)} m`,
  }
}
