// src/utils/learningAnalytics.js
// 学习分析引擎 — 综合版
// 融合：旧版的精细分析逻辑 + 新版的结构化输出与防护

/* ================================================================
   知识点编码常量（供 UI 组件引用）
   ================================================================ */
export const KNOWLEDGE_POINTS = {
  K1: { id: 'K1', key: 'K1_ContourSpacing',   label: '等高线疏密与坡度', distractor: 'EXAGGERATE', desc: '理解垂直比例尺对剖面形态的影响' },
  K2: { id: 'K2', key: 'K2_RidgeValley',      label: '凸线方向与地形',   distractor: 'INVERT',     desc: '识别上下翻转的剖面图（凸高为谷，凸低为脊）' },
  K3: { id: 'K3', key: 'K3_Orientation',       label: '剖面方向判读',     distractor: 'REVERSE',    desc: '识别左右反转的剖面图' },
  K4: { id: 'K4', key: 'K4_Localization',      label: '地形特征定位',     distractor: 'SHIFT',      desc: '识别存在水平位移的剖面图' },
  K5: { id: 'K5', key: 'K5_Microtopography',   label: '微地貌识别',       distractor: 'SMOOTH',     desc: '识别过度平滑处理的剖面图' },
}

const KP_LIST = Object.values(KNOWLEDGE_POINTS)

/* ================================================================
   1. 特征提取（主函数）
   ================================================================ */
export function extractFeatures(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return null

  return {
    totalInteractions: logs.length,
    dwellTimeStats:    analyzeDwellTime(logs),
    quizPerformance:   analyzeQuizPerformance(logs),
    reactionTimeStats: analyzeReactionTime(logs),
    sessionDuration:   calculateSessionDuration(logs),
    learningPace:      calculateLearningPace(logs),
    modeSwitchCount:   logs.filter(l => l.eventType === 'MODE_SWITCH' || l.eventType === 'mode_switch').length,
  }
}

/* ---- 停留时间分析 ---- */
function analyzeDwellTime(logs) {
  const dwellLogs = logs.filter(l => l.eventType === 'FEATURE_DWELL_TIME')
  if (dwellLogs.length === 0) return { mean: 0, median: 0, total: 0, count: 0, distribution: {} }

  const durations = dwellLogs.map(log => {
    const raw = log.data?.duration
    if (typeof raw === 'number') return raw
    const match = String(raw).match(/([\d.]+)/)
    return match ? parseFloat(match[1]) : 0
  }).filter(d => d > 0)

  if (durations.length === 0) return { mean: 0, median: 0, total: 0, count: 0, distribution: {} }

  durations.sort((a, b) => a - b)
  return {
    mean:   durations.reduce((a, b) => a + b, 0) / durations.length,
    median: durations[Math.floor(durations.length / 2)],
    total:  durations.reduce((a, b) => a + b, 0),
    count:  durations.length,
    distribution: binDistribution(durations, [0, 2, 5, 10, 30]),
  }
}

/* ---- 答题表现分析 ---- */
function analyzeQuizPerformance(logs) {
  const quizLogs = logs.filter(l =>
    l.eventType === 'QUIZ_ANSWERED' || l.eventType === 'profile_quiz_answered'
  )

  if (quizLogs.length === 0) {
    return { totalQuizzes: 0, correctCount: 0, accuracy: 0, errorsByDistractor: {}, accuracyTrend: 0 }
  }

  const correctCount = quizLogs.filter(l => l.data?.isCorrect).length

  // 按干扰项类型统计错误（追踪学生具体选了哪种干扰项）
  const errorsByDistractor = {}
  quizLogs.forEach(log => {
    if (!log.data?.isCorrect) {
      const selectedType = getSelectedDistractorType(log)
      if (selectedType) {
        errorsByDistractor[selectedType] = (errorsByDistractor[selectedType] || 0) + 1
      }
    }
  })

  return {
    totalQuizzes:  quizLogs.length,
    correctCount,
    accuracy:      correctCount / quizLogs.length,
    errorsByDistractor,
    accuracyTrend: calculateTrend(quizLogs.map(l => l.data?.isCorrect ? 1 : 0)),
  }
}

/* ---- 反应时间分析 ---- */
function analyzeReactionTime(logs) {
  const quizLogs = logs.filter(l =>
    (l.eventType === 'QUIZ_ANSWERED' || l.eventType === 'profile_quiz_answered')
    && typeof l.data?.reactionTimeMs === 'number'
  )

  if (quizLogs.length === 0) return { mean: 0, median: 0, min: 0, max: 0, reasonableRatio: 0 }

  const times = quizLogs.map(l => l.data.reactionTimeMs).sort((a, b) => a - b)
  return {
    mean:   times.reduce((a, b) => a + b, 0) / times.length,
    median: times[Math.floor(times.length / 2)],
    min:    times[0],
    max:    times.at(-1),
    // 合理范围：3~60 秒之间的比例
    reasonableRatio: times.filter(t => t > 3000 && t < 60000).length / times.length,
  }
}

/* ---- 会话时长（分钟）---- */
function calculateSessionDuration(logs) {
  if (logs.length < 2) return 0
  const first = new Date(logs[0].timestamp).getTime()
  const last  = new Date(logs.at(-1).timestamp).getTime()
  return (last - first) / 60000
}

/* ---- 学习节奏（次/小时）---- */
function calculateLearningPace(logs) {
  if (logs.length < 2) return 0
  const hours = calculateSessionDuration(logs) / 60
  return hours > 0 ? logs.length / hours : 0
}

/* ---- 识别学生选择的干扰类型 ---- */
function getSelectedDistractorType(log) {
  const { correctIndex, selectedIndex, distractorTypes } = log.data || {}
  if (selectedIndex == null || correctIndex == null) return null
  if (selectedIndex === correctIndex) return null
  if (!Array.isArray(distractorTypes) || distractorTypes.length === 0) return null

  const distractorIndex = selectedIndex < correctIndex ? selectedIndex : selectedIndex - 1
  return distractorTypes[distractorIndex] || 'UNKNOWN'
}

/* ---- 分桶统计 ---- */
function binDistribution(values, bins) {
  const result = {}
  bins.forEach((bin, i) => {
    const next = bins[i + 1] ?? Infinity
    result[`${bin}-${next === Infinity ? '+' : next}`] = values.filter(v => v >= bin && v < next).length
  })
  return result
}

/* ---- 趋势（线性回归斜率）---- */
function calculateTrend(values) {
  if (values.length < 2) return 0
  const n = values.length
  const sumX  = (n * (n - 1)) / 2
  const sumY  = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((s, y, x) => s + x * y, 0)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
  const denom = n * sumX2 - sumX * sumX
  return denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0
}

/* ================================================================
   2. 知识薄弱点诊断
   ================================================================ */
export function diagnoseKnowledgeGaps(features) {
  if (!features) return { knowledgePoints: {}, gaps: [], overallLevel: '—', recommendations: [] }

  const { quizPerformance, reactionTimeStats, dwellTimeStats } = features
  const total  = quizPerformance.totalQuizzes
  const errors = quizPerformance.errorsByDistractor

  const knowledgePoints = {}
  const gaps = []

  for (const kp of KP_LIST) {
    const errorCount = errors[kp.distractor] || 0

    // ── 未答题 ──
    if (total === 0) {
      const point = { ...kp, mastery: null, status: 'UNTESTED', errorCount: 0,
                       message: `尚未测试「${kp.label}」` }
      knowledgePoints[kp.key] = point
      gaps.push(point)
      continue
    }

    // ── 正确率维度（0-100）──
    const errorRate = errorCount / total
    const accScore  = (1 - errorRate) * 100

    // ── 反应时间维度（0-100）：5s→100, 20s→0 线性映射 ──
    const avgRTms  = reactionTimeStats.mean || 0
    const rtScore  = avgRTms > 0
      ? Math.max(0, Math.min(100, (20000 - avgRTms) / 150))
      : 50 // 无数据时给中间值

    // ── 加权掌握度 ──
    const mastery = Math.round(accScore * 0.7 + rtScore * 0.3)

    const status = mastery >= 80 ? 'MASTERED'
                 : mastery >= 50 ? 'DEVELOPING'
                 : 'WEAK'

    const point = {
      ...kp,
      mastery,
      masteryNorm: mastery / 100,    // 0~1 归一化（给雷达图用）
      status,
      errorCount,
      errorRate,
      message: status === 'WEAK'      ? `「${kp.label}」掌握薄弱，建议重点复习：${kp.desc}`
             : status === 'DEVELOPING' ? `「${kp.label}」正在发展中，继续练习可巩固`
             : `「${kp.label}」已掌握`,
    }
    knowledgePoints[kp.key] = point
    gaps.push(point)
  }

  // 按掌握度升序（薄弱的在前）
  gaps.sort((a, b) => (a.mastery ?? -1) - (b.mastery ?? -1))

  // ── 综合评级 ──
  const acc = quizPerformance.accuracy
  const overallLevel = acc >= 0.85 ? '优秀（A）'
                     : acc >= 0.70 ? '良好（B）'
                     : acc >= 0.60 ? '及格（C）'
                     : total === 0 ? '暂无数据'
                     : '需要加强（D）'

  // ── 个性化建议 ──
  const recommendations = buildRecommendations(features, gaps)

  return { knowledgePoints, gaps, overallLevel, recommendations }
}

/* ---- 生成建议 ---- */
function buildRecommendations(features, gaps) {
  const recs = []
  const { quizPerformance, dwellTimeStats, reactionTimeStats, modeSwitchCount } = features

  const weak     = gaps.filter(g => g.status === 'WEAK')
  const untested = gaps.filter(g => g.status === 'UNTESTED')

  if (weak.length > 0) {
    recs.push({
      priority: 'high', category: '知识薄弱点',
      content: `重点复习：${weak.map(w => w.label).join('、')}`,
      action: '在 3D 视图中反复观察对应变换效果，建立直觉认知。',
    })
  }

  if (untested.length > 0 && untested.length < KP_LIST.length) {
    recs.push({
      priority: 'medium', category: '覆盖率',
      content: `尚未测试：${untested.map(u => u.label).join('、')}`,
      action: '继续完成更多测验以获得全面评估。',
    })
  }

  if (dwellTimeStats.mean > 0 && dwellTimeStats.mean < 3) {
    recs.push({
      priority: 'medium', category: '观察深度',
      content: '观察时间偏短（平均不足 3 秒）',
      action: '建议在 3D 地形上多停留，仔细观察等高线形态。',
    })
  }

  if (reactionTimeStats.reasonableRatio > 0 && reactionTimeStats.reasonableRatio < 0.5) {
    recs.push({
      priority: 'low', category: '答题节奏',
      content: '部分题目思考时间过短或过长',
      action: '建议保持稳定的答题节奏（3~60 秒为宜）。',
    })
  }

  if (quizPerformance.totalQuizzes > 0 && quizPerformance.totalQuizzes < 5) {
    recs.push({
      priority: 'medium', category: '练习量',
      content: `仅完成 ${quizPerformance.totalQuizzes} 题，画像可能不够准确`,
      action: '建议至少完成 10 道题目。',
    })
  }

  if ((modeSwitchCount || 0) < 3 && dwellTimeStats.count < 3) {
    recs.push({
      priority: 'low', category: '探索深度',
      content: '3D 地形探索较少',
      action: '尝试切换视角、调整垂直夸大，深入理解地形三维结构。',
    })
  }

  // 正向反馈
  if (quizPerformance.accuracy >= 0.85 && quizPerformance.totalQuizzes >= 5) {
    recs.push({
      priority: 'low', category: '✨ 表扬',
      content: '答题表现优秀！',
      action: '继续保持，可以尝试更复杂的地形。',
    })
  }

  if (quizPerformance.accuracyTrend > 0.05) {
    recs.push({
      priority: 'low', category: '📈 趋势',
      content: '正确率呈上升趋势，学习效果良好',
      action: '继续保持当前的学习节奏。',
    })
  }

  return recs
}

/* ================================================================
   3. 生成完整学习者画像
   ================================================================ */
export function generateLearnerProfile(logs) {
  const features = extractFeatures(logs)

  if (!features) {
    return { valid: false, message: '暂无学习数据，请先完成一些学习活动。' }
  }

  const diagnosis = diagnoseKnowledgeGaps(features)
  const style     = classifyLearningStyle(features)

  return {
    valid: true,
    timestamp: Date.now(),

    summary: {
      totalTime:         `${features.sessionDuration.toFixed(1)} 分钟`,
      totalInteractions: features.totalInteractions,
      quizzesTaken:      features.quizPerformance.totalQuizzes,
      overallAccuracy:   `${(features.quizPerformance.accuracy * 100).toFixed(1)}%`,
      level:             diagnosis.overallLevel,
    },

    behavioral: {
      avgDwellTime:  `${features.dwellTimeStats.mean.toFixed(2)} 秒`,
      learningPace:  `${features.learningPace.toFixed(1)} 次/小时`,
      style,
      exploration:   classifyExploration(features),
      engagement:    classifyEngagement(features),
    },

    cognitive: {
      knowledgePoints: diagnosis.knowledgePoints,   // { K1_xxx: {...}, ... }
      knowledgeGaps:   diagnosis.gaps,              // 排序后的数组
      weakestPoint:    findExtremePoint(diagnosis.knowledgePoints, 'min'),
      strongestPoint:  findExtremePoint(diagnosis.knowledgePoints, 'max'),
    },

    metacognitive: {
      avgReactionTime: `${(features.reactionTimeStats.mean / 1000).toFixed(1)} 秒`,
      thinkingQuality: features.reactionTimeStats.reasonableRatio > 0.7
        ? '深思熟虑型' : features.reactionTimeStats.mean === 0
        ? '—' : '冲动型',
      selfRegulation: classifySelfRegulation(features),
    },

    recommendations: diagnosis.recommendations,
    rawFeatures:     features,
  }
}

/* ---- 学习风格分类 ---- */
function classifyLearningStyle(features) {
  const { dwellTimeStats, quizPerformance, learningPace } = features

  const isFast = dwellTimeStats.mean < 4 && learningPace > 20
  const isDeep = dwellTimeStats.mean > 8 && learningPace < 10
  const isAccurate = quizPerformance.accuracy > 0.8

  if (quizPerformance.totalQuizzes === 0) return '探索型'
  if (isFast && isAccurate)  return '快速精准型'
  if (isFast && !isAccurate) return '冲动尝试型'
  if (isDeep && isAccurate)  return '深思熟虑型'
  if (isDeep && !isAccurate) return '谨慎探索型'
  return '均衡型'
}

function classifyExploration({ modeSwitchCount = 0, dwellTimeStats }) {
  const t = modeSwitchCount + dwellTimeStats.count
  if (t >= 20) return { level: 'HIGH',   label: '高探索性' }
  if (t >= 8)  return { level: 'MEDIUM', label: '中等探索性' }
  return { level: 'LOW', label: '低探索性' }
}

function classifyEngagement({ sessionDuration, totalInteractions }) {
  if (sessionDuration >= 10 && totalInteractions >= 20) return { level: 'HIGH',   label: '高参与度' }
  if (sessionDuration >= 3  || totalInteractions >= 8)  return { level: 'MEDIUM', label: '中等参与度' }
  return { level: 'LOW', label: '低参与度' }
}

function classifySelfRegulation({ quizPerformance, reactionTimeStats }) {
  const acc = quizPerformance.accuracy
  const rt  = reactionTimeStats.mean

  if (acc >= 0.8 && rt > 0 && rt < 10000)
    return { level: 'HIGH',   label: '强自我调节', desc: '准确率高且反应迅速' }
  if (acc >= 0.5)
    return { level: 'MEDIUM', label: '中等自我调节', desc: '有一定策略意识，仍有提升空间' }
  if (quizPerformance.totalQuizzes === 0)
    return { level: 'UNKNOWN', label: '—', desc: '暂无答题数据' }
  return { level: 'LOW', label: '待发展', desc: '建议放慢节奏，仔细观察后再作答' }
}

/* ---- 找极值知识点 ---- */
function findExtremePoint(knowledgePoints, mode) {
  let result = null
  let target = mode === 'min' ? Infinity : -Infinity

  Object.entries(knowledgePoints).forEach(([key, point]) => {
    if (point.mastery == null) return
    const better = mode === 'min' ? point.mastery < target : point.mastery > target
    if (better) {
      target = point.mastery
      result = { key, ...point }
    }
  })

  return result
}
