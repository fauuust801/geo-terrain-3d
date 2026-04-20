// src/components/ProfileAnchorPicker.jsx
// 剖面锚点拾取器 Profile Anchor Picker
// 功能：在3D地形上点击时放置两个锚点，触发出题

import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useQuizStore } from '../stores/quizStore'

/**
 * 锚点可视化标记 Anchor Marker Sphere
 */
function AnchorMarker({ position, color }) {
  return (
    <mesh position={[position.x, position.y || 0, position.z]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  )
}

/**
 * 锚点连线 Anchor Line
 */
function AnchorLine({ p0, p1 }) {
  const points = [
    [p0.x, p0.y || 0, p0.z],
    [p1.x, p1.y || 0, p1.z],
  ]

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array(points.flat())}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00ffff" linewidth={2} />
    </line>
  )
}

/**
 * 主组件：拾取器 + 可视化
 */
export default function ProfileAnchorPicker() {
  const { camera, raycaster, scene } = useThree()
  const terrainRef = useRef()

  const { phase, anchorPoints, setAnchor } = useQuizStore()

  /**
   * 处理地形点击 Handle terrain click
   */
  const handleTerrainClick = (event) => {
    // 只在 idle 或 picking 阶段响应点击
    if (phase !== 'idle' && phase !== 'picking') return

    event.stopPropagation()

    // 从 R3F 事件中获取交点
    const intersect = event
    if (!intersect || !intersect.point) return

    const { x, z } = intersect.point
    const y = intersect.point.y // 保留高度用于可视化

    // 判断当前要放第几个锚点
    const anchorIndex = anchorPoints[0] === null ? 0 : 1

    console.log(`📍 [Anchor ${anchorIndex + 1}] 已放置:`, { x, z })

    setAnchor(anchorIndex, { x, z, y })
  }

  return (
    <group>
      {/* 透明交互层覆盖整个地形（接收点击） */}
      <mesh
        ref={terrainRef}
        onClick={handleTerrainClick}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false} // 不可见，仅用于接收射线检测
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* 锚点标记 */}
      {anchorPoints[0] && <AnchorMarker position={anchorPoints[0]} color="#ff4444" />}
      {anchorPoints[1] && <AnchorMarker position={anchorPoints[1]} color="#4444ff" />}

      {/* 连线 */}
      {anchorPoints[0] && anchorPoints[1] && <AnchorLine p0={anchorPoints[0]} p1={anchorPoints[1]} />}
    </group>
  )
}
