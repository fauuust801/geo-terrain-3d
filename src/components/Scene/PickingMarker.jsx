/**
 * PickingMarker.jsx
 * 鼠标悬停点的 3D 指示器
 *
 * 在鼠标所指的地形表面渲染一个发光小球 + 垂直参考线，
 * 帮助学生直观感受"高程"概念。
 */
import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import useTerrainStore from '../../stores/useTerrainStore'

export default function PickingMarker() {
  const hoveredPosition = useTerrainStore(s => s.hoveredPosition)
  const markerRef = useRef()
  const lineRef = useRef()

  // 呼吸动效：球体脉动
  useFrame(({ clock }) => {
    if (markerRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 4) * 0.15
      markerRef.current.scale.setScalar(scale)
    }
  })

  if (!hoveredPosition) return null

  const { x, y, z, rawHeight } = hoveredPosition

  // 垂直参考线：从基底 (y=0) 到当前点
  const linePoints = [x, 0, z, x, y, z]

  return (
    <group>
      {/* 悬停点球体 */}
      <mesh ref={markerRef} position={[x, y + 0.06, z]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#ff6b6b" transparent opacity={0.9} />
      </mesh>

      {/* 发光光圈 */}
      <mesh position={[x, y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.14, 32]} />
        <meshBasicMaterial
          color="#ff6b6b"
          transparent
          opacity={0.5}
          side={2}
        />
      </mesh>

      {/* 垂直参考线：展示从基底到地表的高度 */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array(linePoints)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#ff6b6b"
          transparent
          opacity={0.4}
          linewidth={1}
        />
      </line>

      {/* 高程数值标签 */}
      <Html
        position={[x, y + 0.25, z]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div className="bg-panel-card/90 backdrop-blur-sm text-panel-text 
                        px-2 py-1 rounded text-xs font-mono whitespace-nowrap
                        border border-slate-600/50 shadow-lg">
          <span className="text-red-400 font-bold">
            {Math.round(rawHeight)}
          </span>
          <span className="text-slate-400"> m</span>
        </div>
      </Html>
    </group>
  )
}
