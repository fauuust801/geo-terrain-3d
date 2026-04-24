/**
 * ═══════════════════════════════════════════════════════════
 *  Layout.jsx (Step 4 完整版)
 *  整体布局 + 面板逻辑编排
 * ═══════════════════════════════════════════════════════════
 */
import React from 'react'
import TerrainScene from './Scene/TerrainScene'
import ProfileChart from './UI/ProfileChart'
import ElevationInfo from './UI/ElevationInfo'
import useTerrainStore from '../stores/useTerrainStore'

export default function Layout() {
  const hoveredPosition = useTerrainStore(s => s.hoveredPosition)
  const minElevation = useTerrainStore(s => s.minElevation)
  const maxElevation = useTerrainStore(s => s.maxElevation)
  const mode = useTerrainStore(s => s.mode)
  const setMode = useTerrainStore(s => s.setMode)
  const verticalExaggeration = useTerrainStore(s => s.verticalExaggeration)
  const setVerticalExaggeration = useTerrainStore(s => s.setVerticalExaggeration)
  const contourInterval = useTerrainStore(s => s.contourInterval)
  const setContourInterval = useTerrainStore(s => s.setContourInterval)
  const showLabels = useTerrainStore(s => s.showLabels)
  const setShowLabels = useTerrainStore(s => s.setShowLabels)
  const showWireframe = useTerrainStore(s => s.showWireframe)
  const setShowWireframe = useTerrainStore(s => s.setShowWireframe)
  const profilePoints = useTerrainStore(s => s.profilePoints)
  const resetProfile = useTerrainStore(s => s.resetProfile)

  return (
    <div className="flex flex-col md:flex-row h-dvh w-screen overflow-hidden">
      {/* ═══════ 左侧: 3D 场景 ═══════ */}
     <div className="relative flex-none md:flex-[2] bg-black min-w-0
                h-[55svh] md:h-full">
        <TerrainScene />

        {/* 左上角: 实时高程显示 (HUD) */}
        {hoveredPosition && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-panel-card/80 backdrop-blur-md rounded-lg
                            px-3 py-2 border border-slate-600/40 shadow-xl
                            font-mono text-xs">
              <div className="flex items-baseline gap-2">
                <span className="text-slate-500">ALT</span>
                <span className="text-2xl font-bold text-amber-300">
                  {Math.round(hoveredPosition.rawHeight)}
                </span>
                <span className="text-slate-500 text-[10px]">m</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                ({hoveredPosition.x.toFixed(1)}, {hoveredPosition.z.toFixed(1)})
              </div>
            </div>
          </div>
        )}

        {/* 左下角: 操作提示 */}
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-panel-card/70 backdrop-blur-sm rounded-lg
                          px-3 py-2 text-xs font-mono text-slate-400
                          border border-slate-700/40">
            {mode === 'A' ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                移动鼠标探查等高面
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                点击放置剖面端点
                <span className="text-cyan-400 font-bold ml-1">
                  {profilePoints.length}/2
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 右下角: 图例 */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-panel-card/70 backdrop-blur-sm rounded-lg
                          px-3 py-2 border border-slate-700/40">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">
              图例
            </div>
            <div className="space-y-1">
              <LegendItem color="#64584a" label="首曲线" style="thin" />
              <LegendItem color="#3a3020" label="计曲线 (每5条)" style="thick" />
              <LegendItem color="#f59e0b" label="高亮等高面" style="band" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ 右侧: 控制面板 ═══════ */}
     <div className="flex-1 flex flex-col bg-panel-bg
                border-t md:border-t-0 md:border-l border-slate-700
                overflow-y-auto overscroll-contain [touch-action:pan-y]
                md:min-w-[320px] md:max-w-[420px]">
        {/* ── 标题 ── */}
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
            <span>🏔️</span>
            <span>等高线与地形剖面判读</span>
          </h1>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            Interactive Topographic Contour &amp; Profile Tool
          </p>
        </div>

        {/* ── 模式切换 ── */}
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 block">
            判读模式
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('A')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium
                         transition-all duration-200 border
                ${mode === 'A'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-inner shadow-amber-500/10'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-750 hover:text-slate-300'
                }`}
            >
              <div className="text-base mb-0.5">📐</div>
              <div>水平等高面</div>
              <div className="text-[9px] mt-0.5 opacity-60">Contour Band</div>
            </button>
            <button
              onClick={() => setMode('B')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium
                         transition-all duration-200 border
                ${mode === 'B'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-inner shadow-cyan-500/10'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-750 hover:text-slate-300'
                }`}
            >
              <div className="text-base mb-0.5">📏</div>
              <div>垂直剖面</div>
              <div className="text-[9px] mt-0.5 opacity-60">Cross Section</div>
            </button>
          </div>

          {mode === 'B' && profilePoints.length > 0 && (
            <button
              onClick={resetProfile}
              className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium
                         bg-red-500/8 text-red-400 border border-red-500/25
                         hover:bg-red-500/15 transition-all"
            >
              🗑️ 清除剖面点
            </button>
          )}
        </div>

        {/* ── 参数控制 ── */}
        <div className="p-4 border-b border-slate-700 space-y-4 flex-shrink-0">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block">
            地形参数
          </label>

          {/* 垂直夸大率 */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300">垂直夸大率 (VE)</span>
              <span className="text-amber-300 font-mono font-bold">
                ×{verticalExaggeration.toFixed(1)}
              </span>
            </div>
            <input
              type="range" min="0.5" max="4.0" step="0.1"
              value={verticalExaggeration}
              onChange={(e) => setVerticalExaggeration(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none
                         cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
              <span>0.5× (压扁)</span>
              <span>4.0× (夸大)</span>
            </div>
          </div>

          {/* 等高距 */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300">等高距 (CI)</span>
              <span className="text-amber-300 font-mono font-bold">
                {contourInterval} m
              </span>
            </div>
            <input
              type="range" min="10" max="100" step="10"
              value={contourInterval}
              onChange={(e) => setContourInterval(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none
                         cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
              <span>10m (密)</span>
              <span>100m (疏)</span>
            </div>
          </div>

          {/* 显示开关 */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox" checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="accent-amber-500 w-3.5 h-3.5"
              />
              <span className="text-xs text-slate-300">地貌标注</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox" checked={showWireframe}
                onChange={(e) => setShowWireframe(e.target.checked)}
                className="accent-amber-500 w-3.5 h-3.5"
              />
              <span className="text-xs text-slate-300">线框</span>
            </label>
          </div>
        </div>

        {/* ── 实时数据 ── */}
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 block">
            地形概况
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <DataCard
              label="最低海拔" value={minElevation} unit="m"
              color="text-green-400"
            />
            <DataCard
              label="最高海拔" value={maxElevation} unit="m"
              color="text-red-400"
            />
            <DataCard
              label="相对高差"
              value={maxElevation - minElevation}
              unit="m" color="text-amber-400"
            />
          </div>
        </div>

        {/* ═══════ 核心内容区: 模式 A 或 B ═══════ */}
        <div className="flex-1 p-4 min-h-0 flex flex-col">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider 
                            mb-2 block flex-shrink-0">
            {mode === 'A' ? '📐 等高面分析' : '📏 地形剖面图'}
          </label>

          <div className="flex-1 min-h-0">
            {mode === 'A' ? <ElevationInfo /> : <ProfileChart />}
          </div>
        </div>

        {/* ── 底部 ── */}
        <div className="p-3 border-t border-slate-700 text-center flex-shrink-0">
          <p className="text-[9px] text-slate-600 font-mono">
            Terrain Contour 3D v1.0 · R3F + GLSL + ECharts
          </p>
        </div>
      </div>
    </div>
  )
}

// ── 辅助组件 ──

function DataCard({ label, value, unit, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30
                    text-center">
      <div className="text-[9px] text-slate-500 leading-tight">{label}</div>
      <div className={`text-sm font-mono font-bold ${color} leading-tight mt-0.5`}>
        {value}
        <span className="text-[8px] text-slate-500 font-normal ml-0.5">{unit}</span>
      </div>
    </div>
  )
}

function LegendItem({ color, label, style }) {
  return (
    <div className="flex items-center gap-2">
      {style === 'thin' && (
        <div className="w-5 h-px" style={{ backgroundColor: color }} />
      )}
      {style === 'thick' && (
        <div className="w-5 h-0.5 rounded" style={{ backgroundColor: color }} />
      )}
      {style === 'band' && (
        <div className="w-5 h-2 rounded-sm opacity-60"
             style={{ backgroundColor: color }} />
      )}
      <span className="text-[9px] text-slate-400">{label}</span>
    </div>
  )
}

{/* 改前 */}
<div className="p-3 border-t border-slate-700 text-center flex-shrink-0">
  <p className="text-[9px] text-slate-600 font-mono">
    Terrain Contour 3D v1.0 · R3F + GLSL + ECharts
  </p>
</div>

{/* 改后：加 iPhone Home Indicator 安全区 */}
<div className="p-3 border-t border-slate-700 text-center flex-shrink-0"
     style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
  <p className="text-[9px] text-slate-600 font-mono">
    Terrain Contour 3D v1.0 · R3F + GLSL + ECharts
  </p>
</div>
