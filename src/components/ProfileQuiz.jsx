// src/components/ProfileQuiz.jsx
// 剖面图答题面板 Profile Quiz Panel (2×2 Grid)

import { useQuizStore } from '../stores/quizStore'
import ProfileChart from './ProfileOptionChart'  // ✅ 用你已有的测验组件
import './ProfileQuiz.css' // 样式文件见下方

export default function ProfileQuiz() {
  const { phase, options, correctIndex, selectedIndex, isCorrect, submitAnswer, resetQuiz } = useQuizStore()

  // 只在 answering 或 result 阶段显示面板
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
              if (idx === correctIndex) chartStatus = 'correct'
              else if (idx === selectedIndex) chartStatus = 'wrong'
            } else if (selectedIndex === idx) {
              chartStatus = 'selected'
            }

            return (
              <div key={idx} className="quiz-option">
                <div className="option-label">选项 {String.fromCharCode(65 + idx)}</div>
                <ProfileChart
                  data={curveData}
                  status={chartStatus}
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
