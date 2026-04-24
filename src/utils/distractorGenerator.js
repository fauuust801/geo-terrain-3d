// src/utils/distractorGenerator.js
// 干扰项生成器 Distractor Generator
// 目标：基于真值剖面曲线，生成高质量“认知误判型”错误选项

/** 变换类型常量 Transform type enum */
export const TRANSFORM_TYPES = {
  INVERT: 'INVERT',         // 垂直翻转：谷脊混淆
  REVERSE: 'REVERSE',       // 水平翻转：方向搞反
  EXAGGERATE: 'EXAGGERATE', // 振幅夸张/压缩：垂直比例误判
  SHIFT: 'SHIFT',           // 循环平移：地形定位偏移
  SMOOTH: 'SMOOTH',         // 过度平滑：忽略微地貌
}

/** 默认配置 Default options */
const DEFAULT_CONFIG = {
  distractorCount: 3,  // 生成3个错误项 + 1个正确项 = 4选1
  smoothWindow: 55,     // 平滑窗口（奇数更稳定）
  shiftRatio: 0.25,    // 循环平移比例（N * 0.25）
  exaggerateKPool: [1.6, 0.4], // 振幅系数池
}

/* =========================
 * 工具函数 Utilities
 * ========================= */

function deepCopyCurve(curve) {
  return curve.map((p) => ({ ...p }))
}

function fisherYatesShuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sampleWithoutReplacement(pool, k) {
  if (k >= pool.length) return fisherYatesShuffle(pool)
  const shuffled = fisherYatesShuffle(pool)
  return shuffled.slice(0, k)
}

/**
 * 统一曲线键名到 distance/elevation
 * Normalize shape: {d,h} OR {distance,elevation} -> {distance,elevation}
 */
function normalizeCurve(curve) {
  return curve.map((p, i) => {
    const distance = Number.isFinite(p.distance) ? p.distance : p.d
    const elevation = Number.isFinite(p.elevation) ? p.elevation : p.h
    if (!Number.isFinite(distance) || !Number.isFinite(elevation)) {
      throw new Error(`Invalid point at index ${i}: require {distance,elevation} or {d,h}`)
    }
    return { distance, elevation }
  })
}

/**
 * 按原输入格式回填键名
 * Restore output format to match input style
 */
function restoreCurveFormat(curve, format) {
  if (format === 'dh') {
    return curve.map((p) => ({ d: p.distance, h: p.elevation }))
  }
  return curve.map((p) => ({ distance: p.distance, elevation: p.elevation }))
}

function detectInputFormat(curve) {
  if (!curve || curve.length === 0) return 'distanceElevation'
  const p0 = curve[0]
  if ('d' in p0 || 'h' in p0) return 'dh'
  return 'distanceElevation'
}

function getMinMaxElev(curve) {
  let min = Infinity
  let max = -Infinity
  for (const p of curve) {
    if (p.elevation < min) min = p.elevation
    if (p.elevation > max) max = p.elevation
  }
  return { min, max }
}

function circularShift(arr, offset) {
  const n = arr.length
  if (n === 0) return []
  const k = ((offset % n) + n) % n
  if (k === 0) return [...arr]
  return arr.slice(n - k).concat(arr.slice(0, n - k))
}

/* =========================
 * 5种变换核心 Core transforms
 * ========================= */

/** INVERT: h' = hMax + hMin - h */
function transformInvert(curve) {
  const { min, max } = getMinMaxElev(curve)
  return curve.map((p) => ({
    distance: p.distance,
    elevation: max + min - p.elevation,
  }))
}

/** REVERSE: 水平反向（保持distance递增） */
function transformReverse(curve) {
  const reversedElev = [...curve].reverse().map((p) => p.elevation)
  return curve.map((p, i) => ({
    distance: p.distance,       // X轴距离保持不变，便于直接绘图
    elevation: reversedElev[i], // 只反转地形序列
  }))
}

/** EXAGGERATE: h' = hMean + k*(h-hMean) */
function transformExaggerate(curve, kPool) {
  const mean = curve.reduce((s, p) => s + p.elevation, 0) / curve.length
  const k = kPool[Math.floor(Math.random() * kPool.length)] // 1.6 or 0.4
  return curve.map((p) => ({
    distance: p.distance,
    elevation: mean + k * (p.elevation - mean),
  }))
}

/** SHIFT: 循环平移 N/4 */
function transformShift(curve, shiftRatio) {
  const n = curve.length
  const shiftSteps = Math.max(1, Math.round(n * shiftRatio))
  const elev = curve.map((p) => p.elevation)
  const shifted = circularShift(elev, shiftSteps)
  return curve.map((p, i) => ({
    distance: p.distance,
    elevation: shifted[i],
  }))
}

/** SMOOTH: 大窗口移动平均 */
function transformSmooth(curve, windowSize = 9) {
  const n = curve.length
  const w = Math.max(3, windowSize | 1) // 强制奇数，最小3
  const half = Math.floor(w / 2)

  const out = []
  for (let i = 0; i < n; i++) {
    let sum = 0
    let cnt = 0
    for (let j = i - half; j <= i + half; j++) {
      const jj = Math.min(n - 1, Math.max(0, j)) // 边界夹取
      sum += curve[jj].elevation
      cnt++
    }
    out.push({
      distance: curve[i].distance,
      elevation: sum / cnt,
    })
  }
  return out
}

/**
 * 对单条曲线应用变换
 * @param {Array<{distance:number,elevation:number}>} curve
 * @param {'INVERT'|'REVERSE'|'EXAGGERATE'|'SHIFT'|'SMOOTH'} type
 * @param {object} cfg
 */
export function applyTransform(curve, type, cfg = DEFAULT_CONFIG) {
  switch (type) {
    case TRANSFORM_TYPES.INVERT:
      return transformInvert(curve)
    case TRANSFORM_TYPES.REVERSE:
      return transformReverse(curve)
    case TRANSFORM_TYPES.EXAGGERATE:
      return transformExaggerate(curve, cfg.exaggerateKPool)
    case TRANSFORM_TYPES.SHIFT:
      return transformShift(curve, cfg.shiftRatio)
    case TRANSFORM_TYPES.SMOOTH:
      return transformSmooth(curve, cfg.smoothWindow)
    default:
      throw new Error(`Unknown transform type: ${type}`)
  }
}

/**
 * 生成四选一选项（1真 + 3假）
 *
 * @param {Array<{distance:number,elevation:number}>|Array<{d:number,h:number}>} truthCurve
 * @param {number} [count=3] - 错误选项个数
 * @param {{
 *   smoothWindow?: number,
 *   shiftRatio?: number,
 *   exaggerateKPool?: number[]
 * }} [options]
 *
 * @returns {{
 *   options: Array<Array<{distance:number,elevation:number}>|Array<{d:number,h:number}>>,
 *   correctIndex: number,
 *   distractorTypes: string[]
 * }}
 */
export function generateDistractorOptions(truthCurve, count = 3, options = {}) {
  if (!Array.isArray(truthCurve) || truthCurve.length < 2) {
    throw new Error('generateDistractorOptions: truthCurve must be an array with at least 2 points')
  }

  const inputFormat = detectInputFormat(truthCurve)
  const normalizedTruth = normalizeCurve(truthCurve)
  const cfg = { ...DEFAULT_CONFIG, ...options }

  const allTypes = Object.values(TRANSFORM_TYPES)
  const useCount = Math.min(Math.max(1, count), allTypes.length)

  // 关键约束：不重复类型
  const pickedTypes = sampleWithoutReplacement(allTypes, useCount)

  // 生成假曲线
  const fakeCurves = pickedTypes.map((type) => applyTransform(normalizedTruth, type, cfg))

  // 合并并洗牌
  const tagged = [
    { curve: deepCopyCurve(normalizedTruth), isTruth: true, type: 'TRUTH' },
    ...fakeCurves.map((c, i) => ({ curve: c, isTruth: false, type: pickedTypes[i] })),
  ]

  const shuffled = fisherYatesShuffle(tagged)
  const correctIndex = shuffled.findIndex((x) => x.isTruth)

  // 回填格式（保持与输入一致）
  const optionsOut = shuffled.map((item) => restoreCurveFormat(item.curve, inputFormat))
  const distractorTypes = pickedTypes

  return {
    options: optionsOut,
    correctIndex,
    distractorTypes,
  }
}

export default generateDistractorOptions

