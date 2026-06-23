/**
 * Notes: 云屿小猫 Agent 轻量会话记忆
 *
 * 当前版本不自动写长期记忆库，避免在未建表/未确认策略前污染业务数据。
 * 它只把当前会话和页面上下文压缩成短提示，供本轮回答参考。
 */

function asText(val, max = 800) {
	if (val === undefined || val === null) return '';
	return String(val).trim().slice(0, max);
}

function normalizeHistory(history = []) {
	if (!Array.isArray(history)) return [];
	let out = [];
	for (let item of history.slice(-8)) {
		if (!item || (item.role != 'user' && item.role != 'assistant')) continue;
		let raw = item.content;
		if (Array.isArray(raw)) {
			raw = raw.filter(part => part && part.type == 'text' && part.text).map(part => part.text).join('');
		}
		let text = asText(raw, item.role == 'assistant' ? 400 : 260);
		if (text) out.push({ role: item.role, content: text });
	}
	return out;
}

function extractBusinessHints(message, history = []) {
	let hints = [];
	let textList = normalizeHistory(history).filter(item => item.role == 'user').map(item => item.content);
	textList.push(asText(message, 400));
	for (let text of textList.slice(-4)) {
		if (!text) continue;
		if (/(记住|以后|习惯|偏好|不喜欢|喜欢|常用|默认|每次|下次)/.test(text)) {
			hints.push(text.replace(/\s+/g, ' ').slice(0, 120));
			continue;
		}
		if (/(客户|跟进|报价|套餐|定金|尾款|收款|回访|成单|未成交)/.test(text) && /(要|需要|提醒|备注|注意|别忘|下次)/.test(text)) {
			hints.push(text.replace(/\s+/g, ' ').slice(0, 120));
		}
	}
	return hints.slice(-3);
}

function buildMemoryPrompt(options = {}) {
	let staff = options.staff || {};
	let pageContext = options.pageContext || {};
	let hints = extractBusinessHints(options.message, options.history);
	let parts = [];

	let pageBits = [];
	if (pageContext.route) pageBits.push('route=' + asText(pageContext.route, 120));
	if (pageContext.day) pageBits.push('day=' + asText(pageContext.day, 20));
	if (pageContext.orderId) pageBits.push('orderId=' + asText(pageContext.orderId, 80));
	if (pageBits.length) parts.push('当前页面记忆：' + pageBits.join('，') + '。');

	if (staff && staff.STAFF_NAME) {
		parts.push('当前操作者偏好：称呼为' + asText(staff.STAFF_NAME, 40) + '；如需写入动作，仍以后台权限校验为准。');
	}

	if (hints.length) {
		parts.push('本轮会话临时记忆：' + hints.map(item => '“' + item + '”').join('；') + '。');
		parts.push('临时记忆只作为本轮参考，不等于数据库事实；执行写入前仍需字段明确。');
	}

	if (!parts.length) return '';
	return parts.join('\n');
}

module.exports = {
	buildMemoryPrompt,
	extractBusinessHints,
};
