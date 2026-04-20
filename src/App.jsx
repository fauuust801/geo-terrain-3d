// src/App.jsx
import React from 'react'
import Layout from './components/Layout'
import ProfileBridge from './components/ProfileBridge'
import ProfileQuiz from './components/ProfileQuiz'
import LearnerProfilePanel from './components/LearnerProfilePanel'

export default function App() {
  return (
    <>
      <ProfileBridge />
      <Layout />

      {/* 答题面板（HTML层，覆盖在3D场景上方） */}
      <ProfileQuiz />

      {/* 学习者画像面板（Ctrl+Shift+P 或右下角按钮） */}
      <LearnerProfilePanel />
    </>
  )
}
