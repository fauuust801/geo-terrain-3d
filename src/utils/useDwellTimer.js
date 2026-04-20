// src/utils/useDwellTimer.js
import { useRef, useEffect, useCallback } from 'react';
import { logger } from './telemetry';

/**
 * 停留时间计时器 Hook
 * @param {string} featureName - 当前正在观察的地貌名称 (如 '山顶', '鞍部')
 */
export function useDwellTimer(featureName) {
  const startTimeRef = useRef(null);

  // 开始计时
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
  }, []);

  // 停止计时并发送数据
  const stopTimer = useCallback(() => {
    if (startTimeRef.current && featureName) {
      const durationInSeconds = (Date.now() - startTimeRef.current) / 1000;
      
      // 只有停留超过 1 秒才记录，过滤掉鼠标不小心划过的情况
      if (durationInSeconds > 1.0) {
        logger.record('FEATURE_DWELL_TIME', {
          feature: featureName,
          duration: durationInSeconds.toFixed(2) + '秒'
        });
      }
      startTimeRef.current = null; // 清零
    }
  }, [featureName]);

  // 如果组件突然被销毁（比如学生关了网页），也要把最后一次的时间记下来
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return { startTimer, stopTimer };
}
