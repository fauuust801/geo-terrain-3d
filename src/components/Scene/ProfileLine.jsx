/**
 * ═══════════════════════════════════════════════════════════
 *  ProfileLine.jsx (Step 4 完整版)
 *  模式 B: 3D 空间中的剖面切割线 + 垂直帷幕
 * ═══════════════════════════════════════════════════════════
 *
 *  可视化元素:
 *    1. 地表剖面线 (沿地形起伏的曲线)
 *    2. 垂直帷幕 (从地面到基底的半透明面)
 *    3. 端点标记 (A/B 发光球体)
 *    4. 端点标签 (HTML 覆盖层)
 *
 *  [修复记录]
 *    - 将 useMemo 移到条件 return 之前，修复 Hook 顺序断裂
 *      (React Rules of Hooks: 每次渲染的 Hook 数量必须一致)
 *    - useMemo 内部加 mode 守卫，非 B 模式时直接返回空值
 *    - 性能影响: 零。空分支立即 return，无任何计算开销
 */
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import useTerrainStore from '../../stores/useTerrainStore'
import { getHeight, heightToSceneY } from '../../utils/terrainGenerator'
import { sampleProfile } from '../../utils/profileSampler'

export default function ProfileLine() {
  const profilePoints = useTerrainStore(s => s.profilePoints)
  const ve = useTerrainStore(s => s.verticalExaggeration)
  const mode = useTerrainStore(s => s.mode)

  // ★ 修复点：useMemo 必须在任何条件 return 之前调用
  //   这样无论 mode 是什么值，Hook 链表长度始终一致
  const { lineGeometry, curtainGeometry, profileData } = useMemo(() => {
    // 非 B 模式 或 点数不足 → 空值快速返回（零计算开销）
    if (mode !== 'B' || profilePoints.length < 2) {
      return { lineGeometry: null, curtainGeometry: null, profileData: [] }
    }

    const [p0, p1] = profilePoints
    const data = sampleProfile(p0, p1, 150)

    if (data.length === 0) {
      return { lineGeometry: null, curtainGeometry: null, profileData: [] }
    }

    // ── 地表线 ──
    const linePoints = data.map(d => {
      const y = heightToSceneY(d.elevation, ve) + 0.015
      return new THREE.Vector3(d.x, y, d.z)
    })
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints)

    // ── 垂直帷幕 (Curtain Geometry) ──
    // 每个采样点生成两个顶点: 地表 + 基底(y=0)
    // 构成一个三角条带
    const curtainVerts = []
    const curtainUVs = []
    const count = data.length

    for (let i = 0; i < count; i++) {
      const d = data[i]
      const y = heightToSceneY(d.elevation, ve)
      const t = i / (count - 1)

      // 上顶点（地表）
      curtainVerts.push(d.x, y, d.z)
      curtainUVs.push(t, 1)

      // 下顶点（基底 y=0）
      curtainVerts.push(d.x, 0, d.z)
      curtainUVs.push(t, 0)
    }

    // 构建索引 (三角条带 → 三角形列表)
    const indices = []
    for (let i = 0; i < count - 1; i++) {
      const a = i * 2
      const b = i * 2 + 1
      const c = (i + 1) * 2
      const d = (i + 1) * 2 + 1

      indices.push(a, b, c)  // 三角形 1
      indices.push(c, b, d)  // 三角形 2
    }

    const curtainGeo = new THREE.BufferGeometry()
    curtainGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(curtainVerts, 3)
    )
    curtainGeo.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(curtainUVs, 2)
    )
    curtainGeo.setIndex(indices)
    curtainGeo.computeVertexNormals()

    return {
      lineGeometry: lineGeo,
      curtainGeometry: curtainGeo,
      profileData: data,
    }
  }, [profilePoints, ve, mode])  // ★ 加入 mode 依赖

  // ★ 条件渲染现在安全地放在所有 Hook 之后
  if (mode !== 'B') return null

  return (
    <group>
      {/* ── 端点标记 (单点时) ── */}
      {profilePoints.length === 1 && (
        <EndpointMarker
          point={profilePoints[0]}
          ve={ve}
          label="A"
          color="#00d2ff"
        />
      )}

      {/* ── 完整剖面 (两点时) ── */}
      {lineGeometry && curtainGeometry && (
        <>
          {/* 地表剖面线 (发光描边) */}
          <line geometry={lineGeometry}>
            <lineBasicMaterial color="#00d2ff" linewidth={2} />
          </line>

          {/* 垂直帷幕 (半透明面) */}
          <mesh geometry={curtainGeometry}>
            <meshBasicMaterial
              color="#00d2ff"
              transparent
              opacity={0.12}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* 帷幕边框线 (底边) */}
          {profilePoints.length === 2 && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    profilePoints[0].x, 0, profilePoints[0].z,
                    profilePoints[1].x, 0, profilePoints[1].z,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#00d2ff" transparent opacity={0.3} />
            </line>
          )}

          {/* 端点 A */}
          <EndpointMarker
            point={profilePoints[0]}
            ve={ve}
            label="A"
            color="#00d2ff"
          />

          {/* 端点 B */}
          <EndpointMarker
            point={profilePoints[1]}
            ve={ve}
            label="B"
            color="#ff6bcb"
          />
        </>
      )}
    </group>
  )
}

/**
 * 端点标记子组件
 * （完全未修改，原封保留）
 */
function EndpointMarker({ point, ve, label, color }) {
  const y = heightToSceneY(point.height, ve)

  return (
    <group position={[point.x, y + 0.05, point.z]}>
      {/* 球体 */}
      <mesh>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* 光圈 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[0.10, 0.16, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 垂直线 → 基底 */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, -(y + 0.05), 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.25} />
      </line>

      {/* HTML 标签 */}
      <Html center style={{ pointerEvents: 'none' }} position={[0, 0.2, 0]}>
        <div
          className="px-1.5 py-0.5 rounded text-xs font-bold font-mono
                     border shadow-lg"
          style={{
            backgroundColor: `${color}22`,
            borderColor: `${color}88`,
            color: color,
          }}
        >
          {label}
          <span className="ml-1 text-[10px] font-normal opacity-70">
            {Math.round(point.height)}m
          </span>
        </div>
      </Html>
    </group>
  )
}
