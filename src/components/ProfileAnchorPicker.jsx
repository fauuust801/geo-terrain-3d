// src/components/ProfileAnchorPicker.jsx
import { useMemo } from 'react'
import { useQuizStore } from '../stores/quizStore'
import useTerrainStore from '../stores/useTerrainStore'
import { getHeight, heightToSceneY } from '../utils/terrainGenerator'

/**
 * 锚点球标记 —— Y 高度从 getHeight 实时计算，不受 y=0 平面影响
 */
function AnchorMarker({ position, color }) {
  const ve = useTerrainStore(s => s.verticalExaggeration)
  // ✅ 用 getHeight + VE 算出标记在地形表面的真实 Y
  const y = heightToSceneY(getHeight(position.x, position.z), ve)

  return (
    <mesh position={[position.x, y + 0.12, position.z]}>
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.12}
      />
    </mesh>
  )
}

/**
 * 锚点连线 —— 同样贴地形表面
 */
function AnchorLine({ p0, p1 }) {
  const ve = useTerrainStore(s => s.verticalExaggeration)
  const y0 = heightToSceneY(getHeight(p0.x, p0.z), ve) + 0.08
  const y1 = heightToSceneY(getHeight(p1.x, p1.z), ve) + 0.08

  const arr = useMemo(
    () => new Float32Array([p0.x, y0, p0.z, p1.x, y1, p1.z]),
    [p0.x, p0.z, p1.x, p1.z, y0, y1]
  )

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={arr}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00ffff" linewidth={2} />
    </line>
  )
}

/**
 * 主组件：纯可视化，点击逻辑已移至 TerrainMesh
 */
export default function ProfileAnchorPicker() {
  const { anchorPoints } = useQuizStore()

  // ✅ 删除了 y=0 的不可见平面！
  //    点击事件现在由 TerrainMesh 统一处理，坐标精准落在地形表面
  return (
    <group>
      {anchorPoints[0] && (
        <AnchorMarker position={anchorPoints[0]} color="#ff4444" />
      )}
      {anchorPoints[1] && (
        <AnchorMarker position={anchorPoints[1]} color="#4444ff" />
      )}
      {anchorPoints[0] && anchorPoints[1] && (
        <AnchorLine p0={anchorPoints[0]} p1={anchorPoints[1]} />
      )}
    </group>
  )
}
