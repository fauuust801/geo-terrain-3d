/**
 * FeatureLabels.jsx
 * 在 3D 场景中标注六大微地貌特征
 */
import React from 'react'
import { Html } from '@react-three/drei'
import useTerrainStore from '../../stores/useTerrainStore'
import {
  getHeight,
  heightToSceneY,
  LANDFORM_FEATURES,
} from '../../utils/terrainGenerator'

export default function FeatureLabels() {
  const showLabels = useTerrainStore(s => s.showLabels)
  const ve = useTerrainStore(s => s.verticalExaggeration)

  if (!showLabels) return null

  return (
    <group>
      {LANDFORM_FEATURES.map((feature) => {
        const h = getHeight(feature.x, feature.z)
        const sceneY = heightToSceneY(h, ve) + 0.35

        return (
          <Html
            key={feature.id}
            position={[feature.x, sceneY, feature.z]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="flex flex-col items-center animate-fade-in">
              {/* 图标 */}
              <div className="text-lg mb-0.5">{feature.icon}</div>
              {/* 名称 */}
              <div className="bg-panel-card/85 backdrop-blur-sm
                              px-2 py-0.5 rounded-md
                              border border-slate-500/40
                              shadow-lg text-center">
                <div className="text-xs font-bold text-amber-300">
                  {feature.name}
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  {feature.nameEn}
                </div>
              </div>
            </div>
          </Html>
        )
      })}
    </group>
  )
}
