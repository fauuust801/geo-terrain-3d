// src/components/ProfileChart.jsx
// 单张剖面图 Single Profile Chart (ECharts wrapper)

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

/**
 * @param {{
 *   data: Array<{distance:number, elevation:number}>,
 *   status?: 'default' | 'selected' | 'correct' | 'wrong',
 *   onClick?: () => void
 * }} props
 */
export default function ProfileChart({ data, status = 'default', onClick }) {
  const chartRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return

    // 初始化 ECharts 实例
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current)
    }

    const chart = instanceRef.current

    // 边框颜色逻辑
    const borderColorMap = {
      default: '#555',
      selected: '#00bfff',
      correct: '#00ff00',
      wrong: '#ff0000',
    }

    const option = {
      backgroundColor: status === 'selected' ? 'rgba(0,191,255,0.1)' : '#1a1a1a',
      grid: {
        left: 40,
        right: 20,
        top: 20,
        bottom: 30,
      },
      xAxis: {
        type: 'value',
        name: '距离 (m)',
        nameTextStyle: { color: '#aaa', fontSize: 10 },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: { lineStyle: { color: '#333' } },
      },
      yAxis: {
        type: 'value',
        name: '海拔 (m)',
        nameTextStyle: { color: '#aaa', fontSize: 10 },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: { lineStyle: { color: '#333' } },
      },
      series: [
        {
          type: 'line',
          data: data.map((p) => [p.distance, p.elevation]),
          smooth: false,
          lineStyle: { color: '#66ccff', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(102,204,255,0.3)' },
              { offset: 1, color: 'rgba(102,204,255,0.05)' },
            ]),
          },
          symbol: 'none',
        },
      ],
    }

    chart.setOption(option, true)

    // 监听点击
    if (onClick) {
      chart.off('click') // 防止重复绑定
      chart.on('click', onClick)
    }

    return () => {
      chart.off('click')
    }
  }, [data, status, onClick])

  // 自适应窗口
  useEffect(() => {
    const handleResize = () => instanceRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: '100%',
        border: `3px solid ${
          status === 'correct' ? '#00ff00' : status === 'wrong' ? '#ff0000' : status === 'selected' ? '#00bfff' : '#555'
        }`,
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
      }}
    />
  )
}
