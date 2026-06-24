/**
 * B21 客户端性能监控工具
 * 与服务端 perf_util 保持相同 API，使用 Date.now() 计时
 * 超过阈值自动 console.warn
 */

const SLOW_THRESHOLD_MS = 3000;
const PAGE_LOAD_THRESHOLD_MS = 5000;

/**
 * 开始计时
 * @param {string} label - 计时标签
 * @returns {{ label: string, start: number }}
 */
function startTimer(label) {
  return { label: String(label || 'unknown'), start: Date.now() };
}

/**
 * 结束计时并记录耗时，超过阈值 warn
 * @param {{ label: string, start: number }} timer
 * @returns {number} 耗时毫秒数
 */
function endTimer(timer) {
  if (!timer || !timer.start) return 0;
  var elapsed = Date.now() - timer.start;
  var threshold = timer.label && timer.label.indexOf(':onLoad') >= 0 ? PAGE_LOAD_THRESHOLD_MS : SLOW_THRESHOLD_MS;
  if (elapsed > threshold) {
    console.warn('[PERF] ' + timer.label + ' slow: ' + elapsed + 'ms');
  }
  return elapsed;
}

/**
 * 包装一个异步函数并记录耗时
 * @param {string} label - 计时标签
 * @param {Function} fn - 返回 Promise 的函数
 * @returns {Promise<*>} 原始返回值
 */
async function trackQuery(label, fn) {
  var timer = startTimer(label);
  try {
    var result = await fn();
    endTimer(timer);
    return result;
  } catch (err) {
    endTimer(timer);
    throw err;
  }
}

module.exports = { startTimer, endTimer, trackQuery };
