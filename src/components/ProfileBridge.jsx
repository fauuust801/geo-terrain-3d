/**
 * ProfileBridge.jsx
 * Store 副作用桥接：监听 profilePoints 变化 → 自动采样 → 写入 profileData
 * 
 * 为什么单独组件？
 *   1. 不污染 3D 场景的渲染周期
 *   2. 不污染 UI 面板的状态选择
 *   3. 副作用逻辑集中管理
 */
import { useEffect } from 'react'
import useTerrainStore from '../stores/useTerrainStore'
import { sampleProfile } from '../utils/profileSampler'

export default function ProfileBridge() {
  const profilePoints = useTerrainStore(s => s.profilePoints)
  const setProfileData = useTerrainStore(s => s.setProfileData)

  useEffect(() => {
    if (profilePoints.length === 2) {
      const data = sampleProfile(profilePoints[0], profilePoints[1], 250)
      setProfileData(data)
    }
  }, [profilePoints, setProfileData])

  return null   // 无 UI 输出
}
