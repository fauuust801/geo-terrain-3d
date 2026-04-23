// src/components/LearnerProfilePanel.jsx
// 学习者画像面板 — 综合版
// ECharts 雷达图 + 暗色抽屉 + 完整多维展示

import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { logger } from '../utils/telemetry'
import { generateLearnerProfile, KNOWLEDGE_POINTS } from '../utils/learningAnalytics'

const KP_LIST = Object.values(KNOWLEDGE_POINTS)

export default function LearnerProfilePanel() {
  const [profile, setProfile] = useState(null)
  const [isOpen, setIsOpen]   = useState(false)

  // 快捷键 Ctrl+Shift+P
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // 每次打开时重新生成画像
  useEffect(() => {
    if (isOpen) {
      const logs = Array.isArray(logger?.logs) ? logger.logs : []
      setProfile(generateLearnerProfile(logs))
    }
  }, [isOpen])

  // ── 关闭态：悬浮按钮 ──
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 w-12 h-12 bg-blue-600 hover:bg-blue-500
                   rounded-full shadow-lg flex items-center justify-center text-white
                   z-[9999] transition-all hover:scale-110"
        title="查看学习者画像 (Ctrl+Shift+P)"
      >
        👤
      </button>
    )
  }

  // ── 加载态 ──
  if (!profile) {
    return (
      <PanelShell onClose={() => setIsOpen(false)}>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-slate-400">正在生成画像...</span>
        </div>
      </PanelShell>
    )
  }

  // ── 空数据态 ──
  if (!profile.valid) {
    return (
      <PanelShell onClose={() => setIsOpen(false)}>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
          <span className="text-5xl">📭</span>
          <p className="text-sm">{profile.message}</p>
          <p className="text-xs">请先完成 3D 地形学习与测验</p>
        </div>
      </PanelShell>
    )
  }

  // ── 正常态 ──
  return (
    <PanelShell onClose={() => setIsOpen(false)} title={profile}>
      <Body profile={profile} />
    </PanelShell>
  )
}

/* ================================================================
   外壳（暗色抽屉，右侧滑入）
   ================================================================ */
function PanelShell({ children, onClose, title }) {
  return (
    <div className="fixed top-0 right-0 w-[700px] h-full bg-slate-900/[0.98] backdrop-blur-lg
                    border-l border-slate-700 shadow-2xl z-[9999] flex flex-col text-slate-200
                    overflow-hidden">
      {/* 顶栏 */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 p-4 flex justify-between items-center
                      border-b border-blue-700/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center
                          border border-blue-500/30">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">学习者画像</h2>
            <p className="text-xs text-blue-200 mt-0.5">
              {title?.summary
                ? `基于 ${title.summary.totalInteractions} 条行为数据`
                : 'Ctrl + Shift + P 关闭'}
            </p>
          </div>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-lg bg-blue-700 hover:bg-blue-600
                     flex items-center justify-center text-lg transition-colors">
          ×
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

/* ================================================================
   主体内容
   ================================================================ */
function Body({ profile }) {
  const { summary, behavioral, cognitive, metacognitive, recommendations } = profile

  return (
    <div className="space-y-0">
      {/* 概览卡片 */}
      <div className="p-4 bg-slate-800/50 border-b border-slate-700">
        <div className="grid grid-cols-2 gap-3">
          <InfoCard label="总学习时长" value={summary.totalTime}         icon="⏱️" />
          <InfoCard label="总答题数"   value={summary.quizzesTaken}     icon="✍️" />
          <InfoCard label="综合正确率" value={summary.overallAccuracy}   icon="🎯" color="text-green-400" />
          <InfoCard label="综合评级"   value={summary.level}            icon="⭐" color="text-amber-400" />
        </div>
      </div>

      {/* 学习风格 */}
      <Section title="🎭 学习风格分析">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-blue-400 mb-2">{behavioral.style}</div>
          <div className="text-xs text-slate-400 space-y-1">
            <div>平均观察时间：{behavioral.avgDwellTime}</div>
            <div>学习节奏：{behavioral.learningPace}</div>
            <div>思维方式：{metacognitive.thinkingQuality}</div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Tag>{behavioral.exploration.label}</Tag>
            <Tag>{behavioral.engagement.label}</Tag>
            <Tag>{metacognitive.selfRegulation.label}</Tag>
          </div>
        </div>
      </Section>

      {/* 知识点雷达图 */}
      <Section title="📊 知识点掌握情况">
        <KnowledgeRadar knowledgePoints={cognitive.knowledgePoints} />
        <GapList gaps={cognitive.knowledgeGaps} />
      </Section>

      {/* 关键发现 */}
      <Section title="🎯 关键发现">
        <div className="space-y-2">
          {cognitive.weakestPoint && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="text-xs text-red-300 font-medium mb-1">⚠️ 薄弱知识点</div>
              <div className="text-sm text-white">{cognitive.weakestPoint.label}</div>
              <div className="text-xs text-slate-400 mt-1">
                掌握度：{cognitive.weakestPoint.mastery} 分 ·
                错误次数：{cognitive.weakestPoint.errorCount}
              </div>
            </div>
          )}
          {cognitive.strongestPoint && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="text-xs text-green-300 font-medium mb-1">✅ 优势知识点</div>
              <div className="text-sm text-white">{cognitive.strongestPoint.label}</div>
              <div className="text-xs text-slate-400 mt-1">
                掌握度：{cognitive.strongestPoint.mastery} 分
              </div>
            </div>
          )}
          {!cognitive.weakestPoint && !cognitive.strongestPoint && (
            <div className="text-sm text-slate-500 text-center py-4">
              完成答题后将显示关键发现
            </div>
          )}
        </div>
      </Section>

      {/* 个性化建议 */}
      {recommendations.length > 0 && (
        <Section title="💡 学习建议">
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <RecCard key={idx} rec={rec} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

/* ================================================================
   子组件
   ================================================================ */

function InfoCard({ label, value, icon, color = 'text-white' }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
      <div className="text-xs text-slate-400 mb-1">{icon} {label}</div>
      <div className={`text-lg font-bold ${color} font-mono`}>{value}</div>
    </div>
  )
}

function KnowledgeRadar({ knowledgePoints }) {
  const points = Object.values(knowledgePoints)

  // 全部 UNTESTED 时不渲染雷达
  if (points.every(p => p.status === 'UNTESTED')) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        完成答题后将生成知识雷达图
      </div>
    )
  }

  const option = {
    backgroundColor: 'transparent',
    radar: {
      indicator: points.map(p => ({
        name: p.label.length > 6 ? p.label.slice(0, 6) + '…' : p.label,
        max: 100,
      })),
      center: ['50%', '50%'],
      radius: '70%',
      splitArea: {
        areaStyle: { color: ['rgba(100,116,139,0.1)', 'rgba(100,116,139,0.05)'] },
      },
      axisLine:  { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: '#475569' } },
      axisName:  { color: '#94a3b8', fontSize: 11 },
    },
    series: [{
      type: 'radar',
      data: [{
        value: points.map(p => p.mastery ?? 0),
        name: '掌握度',
        areaStyle: { color: 'rgba(59,130,246,0.3)' },
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
      }],
    }],
  }

  return <ReactECharts option={option} style={{ height: '260px' }} />
}

function GapList({ gaps }) {
  const badge = {
    MASTERED:   { bg: 'bg-green-500/20',  text: 'text-green-300',  label: '已掌握' },
    DEVELOPING: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: '发展中' },
    WEAK:       { bg: 'bg-red-500/20',    text: 'text-red-300',    label: '薄弱' },
    UNTESTED:   { bg: 'bg-slate-700',     text: 'text-slate-400',  label: '未测试' },
  }

  return (
    <div className="space-y-1.5 mt-3">
      {gaps.map(g => {
        const b = badge[g.status]
        return (
          <div key={g.id}
            className={`flex items-center justify-between py-2 px-3 rounded-lg
                        ${g.status === 'WEAK' ? 'bg-red-500/10 ring-1 ring-red-500/30' : 'bg-slate-800'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${b.bg} ${b.text}`}>
                {b.label}
              </span>
              <span className="text-sm text-slate-200 font-medium truncate">{g.label}</span>
            </div>
            <span className="text-sm font-mono text-slate-400 shrink-0 ml-2">
              {g.mastery != null ? g.mastery : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RecCard({ rec }) {
  const styles = {
    high:   'bg-orange-500/10 border-orange-500/30 text-orange-200',
    medium: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
    low:    'bg-slate-700/50 border-slate-600 text-slate-300',
  }
  const icons = { high: '🔥 重要', medium: '📌 建议', low: '💬 提示' }

  return (
    <div className={`rounded-lg p-3 border ${styles[rec.priority]}`}>
      <div className="text-xs font-medium mb-1">{icons[rec.priority]}</div>
      <div className="text-sm">{rec.content}</div>
      {rec.action && <div className="text-xs text-slate-400 mt-1">→ {rec.action}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="p-4">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">{title}</h3>
      {children}
    </div>
  )
}

function Tag({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs border border-slate-600">
      {children}
    </span>
  )
}

import { supabase } from '../supabaseClient'

// 提交按钮的处理函数
const handleSubmitProfile = async () => {
  
  // 从你现有的 store 或 props 里取数据，字段名按你实际的来
  const { data, error } = await supabase
    .from('learner_profiles')
    .upsert({
      student_id: studentId,           // 学生学号
      quiz_accuracy: quizAccuracy,     // 答题正确率
      avg_reaction_time: avgReaction,  // 平均反应时间
      profile_data: fullProfileData,   // 完整画像 JSON
    }, { onConflict: 'student_id' })   // 同一学号重复提交则覆盖

  if (error) {
    console.error('提交失败：', error)
    alert('数据提交失败，请检查网络')
  } else {
    alert('画像数据已成功提交！')
  }
}
