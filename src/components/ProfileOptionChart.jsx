/**
 * ProfileOptionChart.jsx
 * ─────────────────────────────────────────────────────────
 * 测验选项剖面图 — 纯受控组件（Controlled Component）
 *
 * Props:
 *   data     {Array}   [{distanceM, elevation}, ...]  必传
 *   status   {string}  'default' | 'selected' | 'correct' | 'wrong'
 *   yDomain  {Object}  { min: number, max: number }  共享Y轴范围，修复Bug①②
 *   onClick  {Function} 点击回调，修复Bug③
 */
import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

// ── 状态 → 视觉样式映射表 ──────────────────────────────────
const STATUS_CFG = {
  default:  {
    line:   '#94a3b8',
    area:   'rgba(148,163,184,0.12)',
    border: '#334155',
    shadow: 'none',
  },
  selected: {
    line:   '#38bdf8',
    area:   'rgba(56,189,248,0.20)',
    border: '#38bdf8',
    shadow: '0 0 0 3px rgba(56,189,248,0.30)',
  },
  correct:  {
    line:   '#4ade80',
    area:   'rgba(74,222,128,0.22)',
    border: '#4ade80',
    shadow: '0 0 0 3px rgba(74,222,128,0.30)',
  },
  wrong:    {
    line:   '#f87171',
    area:   'rgba(248,113,113,0.22)',
    border: '#f87171',
    shadow: '0 0 0 3px rgba(248,113,113,0.30)',
  },
}

export default function ProfileOptionChart({
  data    = [],
  status  = 'default',
  yDomain = null,
  onClick,
}) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.default

  // ── ECharts option（依赖 data / cfg / yDomain）──────────
  const option = useMemo(() => {
    if (!data || data.length === 0) return {}

    const n          = data.length
    const distances  = data.map(d => Math.round(d.distanceM))
    const elevations = data.map(d => d.elevation)

    // ✅ Bug①②修复核心：Y轴使用外部传入的全局共享范围
    //    若 yDomain 未传入，回退到自动缩放（安全降级）
    const yMin = yDomain != null ? yDomain.min : (val => Math.floor((val.min - 20) / 10) * 10)
    const yMax = yDomain != null ? yDomain.max : (val => Math.ceil((val.max  + 20) / 10) * 10)

    return {
      backgroundColor: 'transparent',
      animation: false, // 测验选项禁止动画，避免切题时闪烁

      grid: { left: 44, right: 10, top: 20, bottom: 36 },

      // ── X轴：水平距离 ──────────────────────────────────
      xAxis: {
        type: 'category',
        data: distances,
        name: '距离 (m)',
        nameLocation: 'center',
        nameGap: 24,
        nameTextStyle: { color: '#64748b', fontSize: 8 },
        axisLabel: {
          color: '#64748b',
          fontSize: 8,
          interval: Math.floor(n / 4),
          formatter: v => `${v}`,
        },
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { lineStyle: { color: '#334155' } },
        splitLine: { show: false },
      },

      // ── Y轴：海拔 ──────────────────────────────────────
      yAxis: {
        type: 'value',
        name: '海拔 (m)',
        nameTextStyle: { color: '#64748b', fontSize: 8 },
        min: yMin,  // ← 关键：固定数值，不再自动缩放
        max: yMax,  // ← 关键：固定数值，不再自动缩放
        axisLabel: {
          color: '#64748b',
          fontSize: 8,
          formatter: '{value}',
        },
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: {
          lineStyle: { color: '#1e293b', type: 'dashed', width: 1 },
        },
      },

      // ── Tooltip ────────────────────────────────────────
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293bee',
        borderColor: '#475569',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontSize: 9 },
        formatter: params => {
          const p = params[0]
          if (!p) return ''
          return `距离: ${distances[p.dataIndex]} m<br/>海拔: ${p.value} m`
        },
        axisPointer: {
          type: 'line',
          lineStyle: { color: cfg.line + '66', type: 'dashed', width: 1 },
        },
      },

      // ── 数据系列 ───────────────────────────────────────
      series: [{
        type: 'line',
        data: elevations,
        smooth: 0.15,
        symbol: 'none',
        lineStyle: { color: cfg.line, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0,   color: cfg.area },
              { offset: 1,   color: 'rgba(15,23,42,0.04)' },
            ],
          },
        },

        // ✅ Bug③修复：标注起点 A / 终点 B（选点+连线的地理端点含义）
        markPoint: {
          animation: false,
          symbol: 'circle',
          symbolSize: 8,
          data: [
            {
              // 起点 A
              coord: [0, elevations[0]],
              itemStyle: {
                color: '#22d3ee',
                borderColor: '#fff',
                borderWidth: 2,
              },
              label: {
                show: true,
                formatter: 'A',
                position: 'top',
                fontSize: 9,
                fontWeight: 'bold',
                color: '#22d3ee',
                offset: [0, -2],
              },
            },
            {
              // 终点 B
              coord: [n - 1, elevations[n - 1]],
              itemStyle: {
                color: '#f472b6',
                borderColor: '#fff',
                borderWidth: 2,
              },
              label: {
                show: true,
                formatter: 'B',
                position: 'top',
                fontSize: 9,
                fontWeight: 'bold',
                color: '#f472b6',
                offset: [0, -2],
              },
            },
          ],
        },
      }],
    }
  }, [data, cfg, yDomain])

  // ── 渲染 ────────────────────────────────────────────────
  return (
    <div
      onClick={onClick}
      style={{
        width:           '100%',
        height:          '100%',
        cursor:          onClick ? 'pointer' : 'default',
        border:          `2px solid ${cfg.border}`,
        borderRadius:    '8px',
        boxShadow:       cfg.shadow,
        backgroundColor: 'rgba(15,23,42,0.55)',
        boxSizing:       'border-box',
        overflow:        'hidden',
        transition:      'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
    </div>
  )
}
