// src/utils/telemetry.js

// 生成一个临时的学生会话 ID
const SESSION_ID = Math.random().toString(36).substring(2, 15);

class TelemetryLogger {
  constructor() {
    // ✅ 修复：从 localStorage 恢复历史日志，刷新页面不丢数据
    let restored = [];
    try {
      const saved = localStorage.getItem('geo_learning_analytics');
      if (saved) restored = JSON.parse(saved);
    } catch (e) {
      // JSON 解析失败时静默忽略，从空数组开始
    }
    this.logs = Array.isArray(restored) ? restored : [];
  }

  /**
   * 记录核心事件
   * @param {string} eventType - 事件类型 (例如: 'MODE_SWITCH', 'PROFILE_DRAWN', 'HOVER_FEATURE')
   * @param {object} payload - 具体数据 (例如: { from: 'A', to: 'B' } 或 { feature: '陡崖', duration: 15.2 })
   */
  record(eventType, payload = {}) {
    const logEntry = {
      sessionId: SESSION_ID,
      timestamp: new Date().toISOString(),
      eventType: eventType,
      data: payload,
    };

    this.logs.push(logEntry);
    
    // 【调试用】在控制台打印出来，让你能看到抓取成功了
    console.log(`📊 [遥测拦截] ${eventType}:`, payload);

    // 【临时存储】存入浏览器的 LocalStorage，刷新网页也不会丢
    localStorage.setItem('geo_learning_analytics', JSON.stringify(this.logs));

    // TODO: 未来这里可以换成 fetch()，把 logEntry 发送给你的云端数据库
  }

  // 导出所有数据（未来可以做个按钮，让你把学生的学习数据下载成 Excel）
  exportData() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// ✅ 关键修复：创建实例时用正确的类名
const logger = new TelemetryLogger()

// ✅ 导出为命名导出（这样 useTerrainStore 才能用 import { logger } 导入）
export { logger }

// 如果其他地方需要 default 导出，也可以加上：
export default logger
