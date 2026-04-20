import { create } from 'zustand'
import { logger } from '../utils/telemetry'

const useTerrainStore = create((set, get) => ({
  // ========== 地形参数 ==========
  verticalExaggeration: 1.5,
  contourInterval: 50,
  terrainResolution: 200,         // 网格每边细分数

  // ========== 高程范围（由 TerrainMesh 计算后写入）==========
  minElevation: 0,
  maxElevation: 500,

  // ========== 交互状态 ==========
  mode: 'A',                     // 'A' = 等高面判读, 'B' = 剖面生成
  activeElevation: -1,
  hoveredPosition: null,         // { x, y, z, rawHeight }
  showLabels: true,              // 是否显示地貌标注
  showWireframe: false,          // 是否显示线框

  // ========== 剖面数据 (模式B) ==========
  profilePoints: [],
  profileData: [],

  // ========== Actions ==========
  setVerticalExaggeration: (val) => set({ verticalExaggeration: val }),
  setContourInterval: (val) => set({ contourInterval: val }),
  setTerrainResolution: (val) => set({ terrainResolution: val }),
  setElevationRange: (min, max) => set({ minElevation: min, maxElevation: max }),
  setMode: (mode) => {
    const prevMode = get().mode
    logger.record('MODE_SWITCH', { from: prevMode, to: mode })
    set({ mode, profilePoints: [], profileData: [] })
  },
  setActiveElevation: (elev) => set({ activeElevation: elev }),
  setHoveredPosition: (pos) => set({ hoveredPosition: pos }),
  setShowLabels: (val) => set({ showLabels: val }),
  setShowWireframe: (val) => set({ showWireframe: val }),

  addProfilePoint: (point) => {
    const { profilePoints } = get()
    if (profilePoints.length >= 2) {
      set({ profilePoints: [point], profileData: [] })
    } else {
      set({ profilePoints: [...profilePoints, point] })
    }
  },
  setProfileData: (data) => set({ profileData: data }),
  resetProfile: () => set({ profilePoints: [], profileData: [] }),
}))

export default useTerrainStore

