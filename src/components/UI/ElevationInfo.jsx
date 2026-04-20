/**
 * ═══════════════════════════════════════════════════════════
 *  ElevationInfo.jsx
 *  模式 A: 等高面判读信息面板
 * ═══════════════════════════════════════════════════════════
 */
import React, { useMemo } from 'react'
import useTerrainStore from '../../stores/useTerrainStore'
import { analyzeContourBand } from '../../utils/contourAnalyzer'

export default function ElevationInfo() {
  const activeElevation = useTerrainStore(s => s.activeElevation)
  const contourInterval = useTerrainStore(s => s.contourInterval)
  const hoveredPosition = useTerrainStore(s => s.hoveredPosition)
  const minElevation = useTerrainStore(s => s.minElevation)
  const maxElevation = useTerrainStore(s => s.maxElevation)

  // ── 分析当前等高面 ──
  const bandInfo = useMemo(() => {
    return analyzeContourBand(activeElevation, contourInterval)
  }, [activeElevation, contourInterval])

  // ── 高程柱状指示器 (竖向海拔标尺) ──
  const elevRange = maxElevation - minElevation || 1
  const currentRatio = activeElevation >= 0
    ? ((activeElevation - minElevation) / elevRange) * 100
    : 0
  const bandMinRatio = ((bandInfo.bandMin - minElevation) / elevRange) * 100
  const bandMaxRatio = ((bandInfo.bandMax - minElevation) / elevRange) * 100

  // 未悬停时的占位
  if (!hoveredPosition || activeElevation < 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full
                      bg-slate-800/30 rounded-lg border border-slate-700/30
                      border-dashed">
        <div className="text-3xl mb-3">📐</div>
        <p className="text-sm text-slate-400 text-center px-4">
          在 3D 地形上移动鼠标
          <br />
          探查等高面信息
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* ── 海拔标尺 (垂直) ── */}
      <div className="flex gap-3 bg-slate-800/50 rounded-lg p-3 
                      border border-slate-700/30">
        {/* 竖向标尺 */}
        <div className="relative w-8 flex-shrink-0 rounded overflow-hidden"
             style={{ minHeight: 140 }}>
          {/* 背景渐变 (低→高) */}
          <div className="absolute inset-0 rounded"
               style={{
                 background: `linear-gradient(to top, 
                   #2d6a4f 0%, #85ba66 25%, #c2cd6b 40%, 
                   #d9b86b 55%, #996638 75%, #f5f5f5 100%)`
               }}
          />
          {/* 高亮带 */}
          <div
            className="absolute left-0 right-0 transition-all duration-150"
            style={{
              bottom: `${Math.max(0, bandMinRatio)}%`,
              height: `${Math.max(1, bandMaxRatio - bandMinRatio)}%`,
              background: 'rgba(251, 191, 36, 0.5)',
              border: '1px solid rgba(251, 191, 36, 0.8)',
            }}
          />
          {/* 当前指示针 */}
          <div
            className="absolute left-0 right-0 h-0.5 bg-red-500
                       transition-all duration-100"
            style={{ bottom: `${Math.max(0, Math.min(100, currentRatio))}%` }}
          >
            <div className="absolute -right-1 -top-1 w-2 h-2 
                            bg-red-500 rounded-full" />
          </div>
          {/* 标尺刻度标注 */}
          <div className="absolute -right-1 bottom-0 text-[7px] text-slate-400 
                          transform translate-x-full pl-1">
            {minElevation}m
          </div>
          <div className="absolute -right-1 top-0 text-[7px] text-slate-400
                          transform translate-x-full pl-1">
            {maxElevation}m
          </div>
        </div>

        {/* 右侧信息 */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          <div>
            <div className="text-[10px] text-slate-500">当前海拔</div>
            <div className="text-2xl font-mono font-bold text-amber-300">
              {Math.round(activeElevation)}
              <span className="text-sm text-slate-500 font-normal ml-1">m</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500">所在等高面</div>
            <div className="text-sm font-mono font-bold text-cyan-300">
              {bandInfo.elevLabel}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500">坐标 (X, Z)</div>
            <div className="text-xs font-mono text-slate-300">
              ({hoveredPosition.x.toFixed(1)}, {hoveredPosition.z.toFixed(1)})
            </div>
          </div>
        </div>
      </div>

      {/* ── 等高面统计 ── */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
          等高面分析 — {bandInfo.elevLabel}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InfoItem
            label="面积占比"
            value={`${bandInfo.areaRatio}%`}
            icon="📊"
          />
          <InfoItem
            label="平均坡度"
            value={`${bandInfo.avgSlope}°`}
            icon="📐"
          />
          <InfoItem
            label="地貌类型"
            value={bandInfo.landformType}
            icon="🏷️"
          />
          <InfoItem
            label="采样点数"
            value={bandInfo.sampleCount}
            icon="📍"
          />
        </div>
      </div>

      {/* ── 等高线判读教学提示 ── */}
      <TeachingTip elevation={activeElevation} slope={bandInfo.avgSlope} />
    </div>
  )
}

function InfoItem({ label, value, icon }) {
  return (
    <div className="bg-slate-900/50 rounded p-2 border border-slate-700/20">
      <div className="text-[9px] text-slate-500 flex items-center gap-1">
        <span>{icon}</span> {label}
      </div>
      <div className="text-sm font-mono font-semibold text-slate-200 mt-0.5">
        {value}
      </div>
    </div>
  )
}

/**
 * 教学小贴士：根据当前地形特征给出等高线判读提示
 */
function TeachingTip({ elevation, slope }) {
  let tip = ''
  let color = 'border-blue-500/30'

  if (slope > 30) {
    tip = '💡 等高线非常密集 → 坡度极陡（陡崖地形），实地可能是悬崖或断层面。'
    color = 'border-red-500/30'
  } else if (slope > 15) {
    tip = '💡 等高线较密集 → 坡度较陡。在实际地形图上，这里可能需要注意滑坡风险。'
    color = 'border-orange-500/30'
  } else if (slope > 5) {
    tip = '💡 等高线疏密适中 → 缓坡地带。这是丘陵地形常见的等高线分布特征。'
    color = 'border-green-500/30'
  } else {
    tip = '💡 等高线非常稀疏 → 地势平坦。可能是山顶台地、河谷平原或鞍部。'
    color = 'border-blue-500/30'
  }

  return (
    <div className={`bg-slate-800/30 rounded-lg p-3 border ${color}
                     text-xs text-slate-400 leading-relaxed`}>
      {tip}
    </div>
  )
}
