/**
 * ═══════════════════════════════════════════════════════════
 *  TerrainMesh.jsx (Step 3 完整版)
 *  核心组件: 自定义 ShaderMaterial 渲染等高线地形
 * ═══════════════════════════════════════════════════════════
 *
 *  架构关键点:
 *    1. Geometry 在 useMemo 中构建 (仅 VE/分辨率变化时重建)
 *    2. Uniforms 在 useMemo 中创建一次
 *    3. Uniform 值在 useFrame 中通过 Zustand getState() 同步
 *       → 避免 React re-render，直接 GPU 通信
 *
 *  [修复记录]
 *    - setElevationRange 从 useMemo 内移至 useEffect
 *      原因: useMemo 属于 React 渲染阶段，此时修改外部 store
 *      会触发其他组件在同一渲染批次内 re-render，违反 React
 *      的 "no side effects during render" 原则
 *    - 性能影响: 零。useEffect 在渲染提交后异步执行，
 *      且仅当 minH/maxH 变化时触发
 */
import React, { useRef, useMemo, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useTerrainStore from '../../stores/useTerrainStore'
import {
  getHeight,
  heightToSceneY,
  TERRAIN_SIZE,
} from '../../utils/terrainGenerator'

// ── GLSL 源码 (通过 vite-plugin-glsl 导入为字符串) ──
import vertexShader from '../../shaders/terrain.vert.glsl'
import fragmentShader from '../../shaders/terrain.frag.glsl'
import { useDwellTimer } from '../../utils/useDwellTimer'


export default function TerrainMesh() {
  const meshRef = useRef()
  const materialRef = useRef()

  // 初始参数（仅用于 Geometry 构建，后续变化通过 useFrame 推送）
  const verticalExaggeration = useTerrainStore(s => s.verticalExaggeration)
  const terrainResolution = useTerrainStore(s => s.terrainResolution)
  const setElevationRange = useTerrainStore(s => s.setElevationRange)
  const setHoveredPosition = useTerrainStore(s => s.setHoveredPosition)
  const setActiveElevation = useTerrainStore(s => s.setActiveElevation)
  const mode = useTerrainStore(s => s.mode)
  const addProfilePoint = useTerrainStore(s => s.addProfilePoint)
  const { startTimer, stopTimer } = useDwellTimer('地形观察')


  // ━━━━━━━━━━━━━━━━ Geometry 构建 ━━━━━━━━━━━━━━━━

  const { geometry, minH, maxH } = useMemo(() => {
    const segments = terrainResolution
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE, TERRAIN_SIZE,
      segments, segments
    )

    // PlaneGeometry 在 XY 平面 → 旋转到 XZ 平面（地面朝上）
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position
    const vertexCount = positions.count

    // 原始高程数组（作为自定义 attribute 传入 Shader）
    const rawHeights = new Float32Array(vertexCount)

    // ── Pass 1: 计算所有顶点高程 ──
    let localMin = Infinity
    let localMax = -Infinity

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      const h = getHeight(x, z)

      rawHeights[i] = h
      localMin = Math.min(localMin, h)
      localMax = Math.max(localMax, h)
    }

    // ── Pass 2: 应用垂直夸大率到 Y 坐标 ──
    for (let i = 0; i < vertexCount; i++) {
      positions.setY(i, heightToSceneY(rawHeights[i], verticalExaggeration))
    }
    positions.needsUpdate = true

    // ── 自定义 Attribute: 原始高程 ──
    // 这是 Shader 中 aHeight 的数据源
    // 不随 VE 变化，始终保持真实地理高程
    geo.setAttribute(
      'aHeight',
      new THREE.BufferAttribute(rawHeights, 1)
    )

    // ── 重算法线 (曲面光照所需) ──
    geo.computeVertexNormals()

    // ★ 修复点：不再在 useMemo 内写入 Store
    //   原来的 setElevationRange(...) 已移到下方 useEffect 中

    return { geometry: geo, minH: localMin, maxH: localMax }
  }, [verticalExaggeration, terrainResolution])
  //   ★ 修复点：依赖数组中移除了 setElevationRange（它不参与计算）

  // ★ 修复点：用 useEffect 在渲染提交后再更新 Store
  //   这样就不会在渲染阶段触发其他组件的 re-render
  useEffect(() => {
    setElevationRange(Math.round(minH), Math.round(maxH))
  }, [minH, maxH, setElevationRange])


  // ━━━━━━━━━━━━━━━━ Shader Uniforms ━━━━━━━━━━━━━━━━
  //
  //  只创建一次，后续通过 useFrame 直接修改 .value
  //  这是 R3F 中 Shader 与 React 状态联动的最佳实践

  const uniforms = useMemo(() => ({
    // 地形参数
    uContourInterval:    { value: 50.0 },
    uMinElevation:       { value: minH },
    uMaxElevation:       { value: maxH },

    // 交互
    uActiveElevation:    { value: -1.0 },
    uTime:               { value: 0.0 },

    // 等高线样式
    uContourWidth:       { value: 1.5 },               // 像素宽度
    uIndexContourEvery:  { value: 5.0 },                // 每 5 条加粗
    uContourColor:       { value: new THREE.Color(0.20, 0.16, 0.12) },  // 深棕
    uIndexContourColor:  { value: new THREE.Color(0.12, 0.10, 0.06) },  // 更深

    // 高亮
    uHighlightColor:     { value: new THREE.Color(1.0, 0.75, 0.25) },   // 暖金色
    uHighlightIntensity: { value: 1.0 },

    // 光照 (模拟地形晕渲的 NW 315° 光源)
    uSunDirection:       { value: new THREE.Vector3(-0.6, 0.75, -0.3).normalize() },
    uSunIntensity:       { value: 1.1 },
    uSkyColor:           { value: new THREE.Color(0.55, 0.65, 0.85) },  // 天蓝
    uGroundColor:        { value: new THREE.Color(0.20, 0.18, 0.12) },  // 暗棕
  }), []) // eslint-disable-line react-hooks/exhaustive-deps


  // ━━━━━━━━━━━━━━━━ 每帧同步 Uniform ━━━━━━━━━━━━━━━━
  //
  //  直接从 Zustand store 获取最新状态 → 写入 GPU Uniform
  //  跳过 React 渲染管线，性能最优

  useFrame(({ clock }) => {
    const mat = materialRef.current
    if (!mat) return

    // 从 store 拉取最新状态（getState 是同步的）
    const state = useTerrainStore.getState()

    mat.uniforms.uContourInterval.value = state.contourInterval
    mat.uniforms.uActiveElevation.value = state.activeElevation
    mat.uniforms.uTime.value = clock.elapsedTime
    mat.uniforms.uMinElevation.value = state.minElevation
    mat.uniforms.uMaxElevation.value = state.maxElevation
  })


  // ━━━━━━━━━━━━━━━━ 交互事件 ━━━━━━━━━━━━━━━━

  const handlePointerMove = useCallback((event) => {
    event.stopPropagation()
    const point = event.point
    const rawH = getHeight(point.x, point.z)

    setHoveredPosition({
      x: point.x,
      y: point.y,
      z: point.z,
      rawHeight: rawH,
    })
    setActiveElevation(rawH)
  }, [setHoveredPosition, setActiveElevation])

    const handlePointerLeave = useCallback(() => {
    stopTimer()                  // ← 新增：鼠标离开地形，停止计时并记录
    setHoveredPosition(null)
    setActiveElevation(-1)
  }, [setHoveredPosition, setActiveElevation, stopTimer])

  const handleClick = useCallback((event) => {
    if (mode !== 'B') return
    event.stopPropagation()
    const point = event.point
    const rawH = getHeight(point.x, point.z)
    addProfilePoint({ x: point.x, z: point.z, height: rawH })
  }, [mode, addProfilePoint])


  // ━━━━━━━━━━━━━━━━ 渲染 ━━━━━━━━━━━━━━━━

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerOver={startTimer}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        // WebGL2 原生支持 fwidth/dFdx/dFdy
        // WebGL1 需要启用此扩展
        extensions={{ derivatives: true }}
      />
    </mesh>
  )
}
