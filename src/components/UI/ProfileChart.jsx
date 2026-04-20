/**
 * ═══════════════════════════════════════════════════════════
 *  ProfileChart.jsx
 *  地形剖面图 (Topographic Profile) — ECharts 渲染
 * ═══════════════════════════════════════════════════════════
 *
 *  地理学标准:
 *    - 横轴: 水平距离 (m)
 *    - 纵轴: 海拔高度 (m)
 *    - 纵轴通常按垂直夸大率 (VE) 拉伸
 *    - 剖面上方标注: 起点 A → 终点 B
 *    - 面积填充: 表示地下部分
 */
import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import useTerrainStore from '../../stores/useTerrainStore'
import { sampleProfile, computeProfileStats } from '../../utils/profileSampler'

export default function ProfileChart() {
  const profilePoints = useTerrainStore(s => s.profilePoints)
  const contourInterval = useTerrainStore(s => s.contourInterval)
  const hoveredPosition = useTerrainStore(s => s.hoveredPosition)

  // ── 采样计算 ──
  const { profileData, stats } = useMemo(() => {
    if (profilePoints.length < 2) {
      return { profileData: [], stats: null }
    }

    const data = sampleProfile(profilePoints[0], profilePoints[1], 250)
    const stats = computeProfileStats(data)
    return { profileData: data, stats }
  }, [profilePoints])

  // ── 尚未生成剖面线时的占位 UI ──
  if (profilePoints.length < 2 || profileData.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center 
                        bg-slate-800/30 rounded-lg border border-slate-700/30
                        border-dashed">
          <div className="text-3xl mb-3">📏</div>
          <p className="text-sm text-slate-400 text-center px-4">
            在 3D 地形上点击两点
            <br />
            生成地形剖面图
          </p>
          <div className="mt-3 flex gap-2 items-center">
            <span className={`w-3 h-3 rounded-full ${
              profilePoints.length >= 1
                ? 'bg-cyan-400'
                : 'bg-slate-600 border border-slate-500'
            }`} />
            <span className="text-xs text-slate-500">
              端点 A {profilePoints.length >= 1 ? '✓' : ''}
            </span>
            <span className="text-slate-700 mx-1">→</span>
            <span className={`w-3 h-3 rounded-full ${
              profilePoints.length >= 2
                ? 'bg-pink-400'
                : 'bg-slate-600 border border-slate-500'
            }`} />
            <span className="text-xs text-slate-500">
              端点 B {profilePoints.length >= 2 ? '✓' : ''}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── 准备 ECharts 数据 ──
  const distances = profileData.map(d => d.distanceM)
  const elevations = profileData.map(d => d.elevation)
  const slopes = profileData.map(d => d.slope)

  // 等高线参考位置 (水平虚线)
  const markLines = []
  if (stats) {
    const startElev = Math.ceil(stats.minElevation / contourInterval) * contourInterval
    for (let e = startElev; e <= stats.maxElevation; e += contourInterval) {
      markLines.push({
        yAxis: e,
        label: {
          formatter: `${e}m`,
          position: 'start',
          fontSize: 9,
          color: '#64748b',
        },
        lineStyle: {
          color: '#334155',
          type: 'dashed',
          width: 1,
        },
      })
    }
  }

  // ── 鼠标悬停的垂直指示线 ──
  // 在 3D 场景悬停位置 → 映射到剖面图上最近点
  let crosshairIndex = -1
  if (hoveredPosition && profilePoints.length === 2) {
    const p0 = profilePoints[0]
    const p1 = profilePoints[1]
    const lx = p1.x - p0.x
    const lz = p1.z - p0.z
    const len2 = lx * lx + lz * lz

    if (len2 > 0.0001) {
      const t = Math.max(0, Math.min(1,
        ((hoveredPosition.x - p0.x) * lx + (hoveredPosition.z - p0.z) * lz) / len2
      ))
      crosshairIndex = Math.round(t * (profileData.length - 1))
    }
  }

  // ── ECharts 配置 ──
  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicInOut',

    // ── 标题 ──
    title: {
      text: '地形剖面图  A → B',
      left: 'center',
      top: 4,
      textStyle: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: 'bold',
        fontFamily: 'JetBrains Mono, monospace',
      },
    },

    // ── 工具提示 ──
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293bee',
      borderColor: '#475569',
      borderWidth: 1,
      textStyle: {
        color: '#e2e8f0',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
      },
      formatter: (params) => {
        const p = params[0]
        if (!p) return ''
        const idx = p.dataIndex
        const d = profileData[idx]
        if (!d) return ''
        return [
          `<b style="color:#00d2ff">距离</b>: ${Math.round(d.distanceM)} m`,
          `<b style="color:#fbbf24">海拔</b>: ${d.elevation} m`,
          `<b style="color:#f87171">坡度</b>: ${d.slope}°`,
        ].join('<br/>')
      },
      axisPointer: {
        type: 'cross',
        crossStyle: { color: '#475569' },
        lineStyle: { color: '#00d2ff66', width: 1 },
      },
    },

    // ── 网格 ──
    grid: {
      left: 55,
      right: 20,
      top: 40,
      bottom: 52,
    },

    // ── X 轴: 水平距离 ──
    xAxis: {
      type: 'category',
      data: distances.map(d => Math.round(d)),
      name: '水平距离 (m)',
      nameLocation: 'center',
      nameGap: 32,
      nameTextStyle: {
        color: '#94a3b8',
        fontSize: 11,
      },
      axisLabel: {
        color: '#64748b',
        fontSize: 9,
        interval: Math.floor(profileData.length / 6),
        formatter: (v) => `${v}`,
      },
      axisLine: { lineStyle: { color: '#334155' } },
      axisTick: { lineStyle: { color: '#334155' } },
      splitLine: { show: false },
    },

    // ── Y 轴: 海拔 ──
    yAxis: {
      type: 'value',
      name: '海拔 (m)',
      nameTextStyle: {
        color: '#94a3b8',
        fontSize: 11,
      },
      min: (val) => Math.floor((val.min - 20) / 10) * 10,
      max: (val) => Math.ceil((val.max + 20) / 10) * 10,
      axisLabel: {
        color: '#64748b',
        fontSize: 9,
        formatter: '{value}',
      },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: {
        lineStyle: { color: '#1e293b', type: 'solid' },
      },
    },

    // ── 数据系列 ──
    series: [
      // 面积填充 — 表示地面以下的"实体"
      {
        name: '高程',
        type: 'line',
        data: elevations,
        smooth: 0.15,
        symbol: 'none',
        lineStyle: {
          color: '#f59e0b',
          width: 2.5,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.35)' },
              { offset: 0.5, color: 'rgba(180, 120, 40, 0.20)' },
              { offset: 1, color: 'rgba(45, 106, 79, 0.10)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: markLines,
        },
        // 在 3D 悬停点处添加标记
        markPoint: crosshairIndex >= 0 ? {
          symbol: 'circle',
          symbolSize: 8,
          data: [{
            coord: [crosshairIndex, elevations[crosshairIndex]],
            itemStyle: { color: '#ff6b6b', borderColor: '#fff', borderWidth: 2 },
          }],
          animation: false,
        } : undefined,
      },
    ],
  }

  return (
    <div className="flex flex-col h-full">
      {/* 剖面图 */}
     <div className="flex-1 min-h-[300px]">  {/* ✅ 改这里：min-h-0 → min-h-[300px] */}
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
     </div>  

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          <MiniStat label="全长" value={stats.totalDistance} unit="m" />
          <MiniStat label="相对高差" value={stats.relief} unit="m" color="text-amber-400" />
          <MiniStat label="累计爬升" value={stats.elevationGain} unit="m" color="text-green-400" />
          <MiniStat label="累计下降" value={stats.elevationLoss} unit="m" color="text-red-400" />
          <MiniStat label="最低海拔" value={stats.minElevation} unit="m" />
          <MiniStat label="最高海拔" value={stats.maxElevation} unit="m" />
          <MiniStat label="平均坡度" value={stats.avgSlope} unit="°" />
          <MiniStat label="最大坡度" value={stats.maxSlope} unit="°" color="text-orange-400" />
        </div>
      )}
    </div>
  )
}

/** 迷你统计卡片 */
function MiniStat({ label, value, unit, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-800/60 rounded px-2 py-1.5
                    border border-slate-700/30 text-center">
      <div className="text-[9px] text-slate-500 leading-tight">{label}</div>
      <div className={`text-xs font-mono font-bold ${color} leading-tight mt-0.5`}>
        {value}
        <span className="text-[8px] text-slate-500 font-normal ml-0.5">{unit}</span>
      </div>
    </div>
  )
}
