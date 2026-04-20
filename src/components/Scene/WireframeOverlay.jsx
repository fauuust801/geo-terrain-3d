/**
 * WireframeOverlay.jsx
 * 可选的线框叠加层
 */
import React, { useMemo } from 'react'
import * as THREE from 'three'
import useTerrainStore from '../../stores/useTerrainStore'
import {
  getHeight,
  heightToSceneY,
  TERRAIN_SIZE,
} from '../../utils/terrainGenerator'

export default function WireframeOverlay() {
  const showWireframe = useTerrainStore(s => s.showWireframe)
  const ve = useTerrainStore(s => s.verticalExaggeration)

  const geometry = useMemo(() => {
    if (!showWireframe) return null

    // 用更低分辨率的线框，避免视觉噪声
    const segments = 60
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE, TERRAIN_SIZE,
      segments, segments
    )
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      const h = getHeight(x, z)
      positions.setY(i, heightToSceneY(h, ve) + 0.005) // 微偏移避免 z-fighting
    }
    positions.needsUpdate = true
    geo.computeVertexNormals()

    // 转为线框边(WireframeGeometry)
    return new THREE.WireframeGeometry(geo)
  }, [showWireframe, ve])

  if (!showWireframe || !geometry) return null

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#475569" transparent opacity={0.25} />
    </lineSegments>
  )
}
