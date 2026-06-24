/**
 * Notes: B14 性能监控工具
 * 记录云函数执行时间和数据库查询耗时，超过阈值自动告警
 */

const LogUtil = require('./log_util.js');

const SLOW_THRESHOLD_MS = 3000;

function _getLogger() {
	if (!_getLogger._instance) {
		_getLogger._instance = new LogUtil('warn');
	}
	return _getLogger._instance;
}

/**
 * 开始计时
 * @param {string} label - 计时标签，用于日志标识
 * @returns {{ label: string, start: number }}
 */
function startTimer(label) {
	return { label: String(label || 'unknown'), start: Date.now() };
}

/**
 * 结束计时并记录耗时
 * @param {{ label: string, start: number }} timer - startTimer 返回的对象
 * @returns {number} 耗时毫秒数
 */
function endTimer(timer) {
	if (!timer || !timer.start) return 0;
	const elapsed = Date.now() - timer.start;
	if (elapsed > SLOW_THRESHOLD_MS) {
		_getLogger().warn(`[PERF] ${timer.label} slow: ${elapsed}ms`);
	}
	return elapsed;
}

/**
 * 包装一个异步查询函数并记录耗时
 * @param {string} label - 计时标签
 * @param {Function} queryFn - 返回 Promise 的查询函数
 * @returns {Promise<*>} 查询结果
 */
async function trackQuery(label, queryFn) {
	const timer = startTimer(label);
	try {
		const result = await queryFn();
		endTimer(timer);
		return result;
	} catch (err) {
		endTimer(timer);
		throw err;
	}
}

module.exports = { startTimer, endTimer, trackQuery };
