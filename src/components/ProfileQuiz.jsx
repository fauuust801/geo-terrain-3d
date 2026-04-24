// src/components/ProfileQuiz.jsx（或与你原文件相同路径）
import { useMemo } from 'react'
import { useQuizStore } from '../stores/quizStore'
import ProfileOptionChart from './ProfileOptionChart'
import './ProfileQuiz.css'

export default function ProfileQuiz() {
  const {
    phase, options, correctIndex, selectedIndex,
    isCorrect, submitAnswer, resetQuiz,
  } = useQuizStore()

  // ✅ 核心：遍历全部4个选项，求全局海拔极值，构造共享Y轴范围
  //    所有选项图表使用同一个 yDomain → 坐标系统一 → 修复 Bug①②
  const yDomain = useMemo(() => {
    if (!options || options.length === 0) return null

    let globalMin = Infinity
    let globalMax = -Infinity

    for (const curveData of options) {
      for (const pt of curveData) {
        if (pt.elevation < globalMin) globalMin = pt.elevation
        if (pt.elevation > globalMax) globalMax = pt.elevation
      }
    }

    if (!isFinite(globalMin)) return null

    // 上下留 12% padding，再取整到 10m，坐标轴刻度更美观
    const pad = Math.max((globalMax - globalMin) * 0.12, 20)
    return {
      min: Math.floor((globalMin - pad) / 10) * 10,
      max: Math.ceil( (globalMax + pad) / 10) * 10,
    }
  }, [options])

  if (phase !== 'answering' && phase !== 'result') return null

  return (
    <div className="profile-quiz-overlay">
      <div className="profile-quiz-panel">

        {/* 标题栏 */}
        <div className="quiz-header">
          <h3>📐 请选择正确的地形剖面图</h3>
          {phase === 'result' && (
            <div className={`result-badge ${isCorrect ? 'correct' : 'wrong'}`}>
              {isCorrect ? '✅ 答对了！' : '❌ 答错了'}
            </div>
          )}
        </div>

        {/* 2×2 网格 */}
        <div className="quiz-grid">
          {options.map((curveData, idx) => {
            let chartStatus = 'default'
            if (phase === 'result') {
              if (idx === correctIndex)                          chartStatus = 'correct'
              else if (idx === selectedIndex && !isCorrect)     chartStatus = 'wrong'
            } else if (selectedIndex === idx) {
              chartStatus = 'selected'
            }

            return (
              <div key={idx} className="quiz-option">
                <div className="option-label">选项 {String.fromCharCode(65 + idx)}</div>
                <ProfileOptionChart
                  data={curveData}
                  status={chartStatus}
                  yDomain={yDomain}
                  onClick={phase === 'answering' ? () => submitAnswer(idx) : undefined}
                />
              </div>
            )
          })}
        </div>

        {/* 底部按钮 */}
        {phase === 'result' && (
          <button className="reset-button" onClick={resetQuiz}>
            🔄 下一题
          </button>
        )}

      </div>
    </div>
  )
}
