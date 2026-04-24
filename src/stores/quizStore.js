// src/stores/quizStore.js
// 剖面图答题系统状态管理 Profile Quiz State Management

import { create } from 'zustand'
import { sampleProfile } from '../utils/profileSampler'
import { generateDistractorOptions } from '../utils/distractorGenerator'
import telemetry from '../utils/telemetry'
import { getHeight } from '../utils/terrainGenerator'


/**
 * 答题流程状态机 Quiz Phase State Machine
 *
 *   idle → picking(1) → picking(2) → answering → result → idle
 */
export const useQuizStore = create((set, get) => ({
  /* ========== 状态 State ========== */
  phase: 'idle', // 'idle' | 'picking' | 'answering' | 'result'

  anchorPoints: [null, null], // [{x,z}, {x,z}] 两个3D场景坐标

  options: [], // 4个选项的曲线数据
  correctIndex: -1,
  selectedIndex: -1,
  isCorrect: null,
  distractorTypes: [],

  quizStartTime: null,

  /* ========== 动作 Actions ========== */

  setAnchor: (index, point) => {
    const state = get()
    if (index < 0 || index > 1) return

    const newAnchors = [...state.anchorPoints]
    newAnchors[index] = point

    set({ anchorPoints: newAnchors })

    // 两个点都放好 → 自动生成题目
    if (newAnchors[0] && newAnchors[1]) {
      get().generateQuiz()
    } else {
      set({ phase: 'picking' })
    }
  },

  generateQuiz: () => {
    const { anchorPoints } = get()
    const [p0, p1] = anchorPoints

    console.log('🗺️ p0 锚点:', p0, '→ getHeight:', getHeight(p0.x, p0.z))
    console.log('🗺️ p1 锚点:', p1, '→ getHeight:', getHeight(p1.x, p1.z))
 
    if (!p0 || !p1) {
      console.warn('[quizStore] generateQuiz: 锚点未完整放置')
      return
    }

    try {
      // 1. 采样真值剖面
      const truthCurve = sampleProfile(p0, p1, 200)

      if (!truthCurve || truthCurve.length < 2) {
        console.error('[quizStore] 采样失败')
        return
      }

      // 2. 生成干扰项
      const { options, correctIndex, distractorTypes } = generateDistractorOptions(
        truthCurve.map((p) => ({ distance: p.distanceM, elevation: p.elevation })),
        3
      )

      // 3. 进入答题状态
      set({
        phase: 'answering',
        options,
        correctIndex,
        distractorTypes,
        selectedIndex: -1,
        isCorrect: null,
        quizStartTime: Date.now(),
      })

      console.log('📊 [Quiz] 题目生成成功:', { correctIndex, distractorTypes })
    } catch (err) {
      console.error('[quizStore] generateQuiz 出错:', err)
    }
  },

  submitAnswer: (index) => {
    const state = get()
    if (state.phase !== 'answering') return
    if (index < 0 || index >= state.options.length) return

    const isCorrect = index === state.correctIndex
    const reactionTimeMs = Date.now() - state.quizStartTime

    set({
      phase: 'result',
      selectedIndex: index,
      isCorrect,
    })

    telemetry.record('profile_quiz_answered', {
      anchor1: state.anchorPoints[0],
      anchor2: state.anchorPoints[1],
      correctIndex: state.correctIndex,
      selectedIndex: index,
      isCorrect,
      reactionTimeMs,
      distractorTypes: state.distractorTypes,
    })

    console.log(isCorrect ? '✅ 答对了！' : '❌ 答错了', { reactionTimeMs })

    // 2秒后自动重置
    setTimeout(() => {
      get().resetQuiz()
    }, 2000)
  },

  resetQuiz: () => {
    set({
      phase: 'idle',
      anchorPoints: [null, null],
      options: [],
      correctIndex: -1,
      selectedIndex: -1,
      isCorrect: null,
      distractorTypes: [],
      quizStartTime: null,
    })
    console.log('🔄 [Quiz] 已重置')
  },
}))

export default useQuizStore
