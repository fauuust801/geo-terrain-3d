// src/components/Scene/TerrainScene.jsx
import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Stars } from '@react-three/drei'
import TerrainMesh from './TerrainMesh'
import PickingMarker from './PickingMarker'
import FeatureLabels from './FeatureLabels'
import ProfileLine from './ProfileLine'
import WireframeOverlay from './WireframeOverlay'
import ProfileAnchorPicker from '../ProfileAnchorPicker' // ✅ 新增

function SceneContent() {
  return (
    <>
      {/* 灯光 (辅助物体用) */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[-5, 8, -5]} intensity={0.8} />

      {/* 地形 (自定义 Shader) */}
      <TerrainMesh />

      {/* 线框叠加 */}
      <WireframeOverlay />

      {/* 交互元素 */}
      <PickingMarker />
      <FeatureLabels />
      <ProfileLine />
      
      {/* ✅ 新增：剖面锚点拾取器（四选一答题用） */}
      <ProfileAnchorPicker />

      {/* 参考网格 */}
      <Grid
        position={[0, -0.01, 0]}
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={20}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* 星空背景 */}
      <Stars
        radius={50}
        depth={40}
        count={1500}
        factor={3}
        saturation={0.2}
        fade
        speed={0.5}
      />

      {/* 相机控制 */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={25}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0.5, 0]}
      />
    </>
  )
}

export default function TerrainScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: 3,
        toneMappingExposure: 1.0,
      }}
      camera={{
        fov: 45,
        near: 0.1,
        far: 100,
        position: [8, 6, 8],
      }}
    >
      <color attach="background" args={['#0a0e17']} />
      <fog attach="fog" args={['#0a0e17', 18, 30]} />

      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  )
}
