const GUEST_KEY = 'WORK_GUEST_MODE';
const GUEST_ORDERS_KEY = 'WORK_GUEST_LOCAL_ORDERS';
const GUEST_ORDER_TTL = 7 * 24 * 60 * 60 * 1000;

function _safeStorageGet(key) {
	try {
		return wx.getStorageSync(key);
	} catch (e) {
		return '';
	}
}

function _safeStorageSet(key, val) {
	try {
		wx.setStorageSync(key, val);
	} catch (e) {}
}

function _safeStorageRemove(key) {
	try {
		wx.removeStorageSync(key);
	} catch (e) {}
}

function isGuest() {
	return _safeStorageGet(GUEST_KEY) == 1;
}

function enterGuest() {
	_safeStorageSet(GUEST_KEY, 1);
	cleanupGuestData();
}

function exitGuest() {
	_safeStorageRemove(GUEST_KEY);
	_safeStorageRemove(GUEST_ORDERS_KEY);
}

function cleanupGuestData() {
	_saveOrders(_safeOrders());
}

function showReadonlyTip() {
	wx.showModal({
		title: '访客体验',
		content: '当前为访客体验模式，不读取任何真实档期、客户、订单、工资或团队数据。访客新增内容只保存在本机临时缓存，绑定员工后不会同步。',
		showCancel: false,
	});
}

function _safeOrders() {
	let list = _safeStorageGet(GUEST_ORDERS_KEY);
	if (!Array.isArray(list)) return [];
	let now = Date.now();
	return list.filter(item => item && item.ORDER_GUEST_EXPIRE_TIME && item.ORDER_GUEST_EXPIRE_TIME > now);
}

function _saveOrders(list) {
	_safeStorageSet(GUEST_ORDERS_KEY, list || []);
}

function _fmtDate(d) {
	let y = d.getFullYear();
	let m = String(d.getMonth() + 1).padStart(2, '0');
	let day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function _currentMonth() {
	let d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function _money(value) {
	if (value === undefined || value === null || String(value).trim() === '') return 0;
	let num = Number(String(value).replace(/,/g, ''));
	if (!Number.isFinite(num) || num < 0) return 0;
	return Math.round(num * 100) / 100;
}

function _surname(name) {
	name = String(name || '').trim();
	return name ? name.substr(0, 1) : '客';
}

function _parseDate(text) {
	text = String(text || '');
	let now = new Date();
	let day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	if (text.indexOf('大后天') >= 0) {
		day.setDate(day.getDate() + 3);
		return _fmtDate(day);
	}
	if (text.indexOf('后天') >= 0) {
		day.setDate(day.getDate() + 2);
		return _fmtDate(day);
	}
	if (text.indexOf('明天') >= 0 || text.indexOf('明日') >= 0) {
		day.setDate(day.getDate() + 1);
		return _fmtDate(day);
	}
	if (text.indexOf('今天') >= 0 || text.indexOf('今日') >= 0) return _fmtDate(day);
	if (text.indexOf('昨天') >= 0 || text.indexOf('昨日') >= 0) {
		day.setDate(day.getDate() - 1);
		return _fmtDate(day);
	}
	if (text.indexOf('大前天') >= 0) {
		day.setDate(day.getDate() - 3);
		return _fmtDate(day);
	}
	if (text.indexOf('前天') >= 0) {
		day.setDate(day.getDate() - 2);
		return _fmtDate(day);
	}

	let weekMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
	let wm = text.match(/(上上周|上上星期|上上礼拜|上周|上星期|上礼拜|下下周|下下星期|下下礼拜|下周|下星期|下礼拜|本周|这周|本星期|这星期|本礼拜|这礼拜|周|星期|礼拜)([一二三四五六日天])/);
	if (wm) {
		let target = weekMap[wm[2]];
		if (target !== undefined) {
			let current = day.getDay();
			let currentIso = current === 0 ? 7 : current;
			let targetIso = target === 0 ? 7 : target;
			let prefix = wm[1];
			let offset = targetIso - currentIso;
			if (prefix == '下下周' || prefix == '下下星期' || prefix == '下下礼拜') offset += 14;
			else if (prefix == '下周' || prefix == '下星期' || prefix == '下礼拜') offset += 7;
			else if (prefix == '上上周' || prefix == '上上星期' || prefix == '上上礼拜') offset -= 14;
			else if (prefix == '上周' || prefix == '上星期' || prefix == '上礼拜') offset -= 7;
			else if (prefix == '本周' || prefix == '这周' || prefix == '本星期' || prefix == '这星期' || prefix == '本礼拜' || prefix == '这礼拜') {
				// 本周/这周: stay in current week
			} else if (offset < 0) offset += 7;
			day.setDate(day.getDate() + offset);
			return _fmtDate(day);
		}
	}

	let m = text.match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
	if (m) {
		let yr = Number(m[1]), mo = Number(m[2]), dy = Number(m[3]);
		let d = new Date(yr, mo - 1, dy);
		if (d.getFullYear() == yr && d.getMonth() + 1 == mo && d.getDate() == dy) {
			return `${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
		}
	}
	m = text.match(/(^|[^\d.])(\d{1,2})月(\d{1,2})(?:[日号](?!\d{4}(?![:：]))|(?![\d张条位个名组批次套件日号]))/);
	if (m) {
		let year = now.getFullYear();
		let month = Number(m[2]);
		let dayNum = Number(m[3]);
		let candidate = new Date(year, month - 1, dayNum);
		if (candidate.getMonth() + 1 !== month || candidate.getDate() !== dayNum) return '';
		if (candidate.getTime() < now.getTime() - 30 * 86400000) year += 1;
		else if (candidate.getTime() > now.getTime() + 183 * 86400000) {
			let prev = new Date(year - 1, month - 1, dayNum);
			if (prev.getTime() >= now.getTime() - 45 * 86400000) year -= 1;
		}
		return `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
	}
	return '';
}

function _parseTime(text) {
	text = String(text || '');
	let m = text.match(/(?<!\d)(\d{1,2})[:：](\d{1,2})(?!\d)/);
	if (m) {
		let h = Number(m[1]), min = Number(m[2]);
		if (h > 23 || min > 59) return '';
		return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
	}
	m = text.match(/(凌晨|上午|早上|中午|下午|晚上)?\s*(\d{1,2})点(半|\d{1,2}分?)?/);
	if (!m) return '';
	let hour = Number(m[2]);
	if ((m[1] == '中午' || m[1] == '下午' || m[1] == '晚上') && hour < 12) hour += 12;
	if (hour > 23) return '';
	let minute = '00';
	if (m[3]) {
		if (m[3] === '半') { minute = '30'; }
		else { minute = String(Number(m[3].replace('分', ''))).padStart(2, '0'); }
	}
	return `${String(hour).padStart(2, '0')}:${minute}`;
}

function _parseCustomer(text) {
	text = String(text || '');
	let m = text.match(/客户[：:\s]*([\u4e00-\u9fa5A-Za-z0-9]{1,12})/);
	if (m) return m[1];
	m = text.match(/(?:外景写真|婚礼跟拍|商拍|商业拍摄|活动跟拍|写真|百日宴)[，,、\s]*([\u4e00-\u9fa5A-Za-z0-9]{1,12})/);
	if (m) return m[1];
	m = text.match(/(?:给|帮|为)?([一-龥]{1,6})(?![一-龥])(?<![我你他她它谁请让])(?:姐|哥|总|老师|客户)?(?:新增|记录|安排|登记|定|拍|外景|写真|婚礼|商拍|活动)/);
	if (m) return m[1];
	return '';
}

function _parseAmount(text, names) {
	text = String(text || '');
	for (let name of names) {
		let reg = new RegExp(name + '\\s*([\\d,]+(?:\\.\\d+)?)');
		let m = text.match(reg);
		if (m) return _money(m[1]);
	}
	return 0;
}

function getGuestStaff() {
	return {
		_id: 'guest_staff',
		STAFF_ID: 'guest_staff',
		STAFF_NAME: '访客',
		STAFF_MOBILE: '',
		STAFF_ROLES: ['体验用户'],
		STAFF_IS_ADMIN: 0,
		STAFF_STATUS: 1,
		STAFF_OPENID_BIND_STATUS: 0,
	};
}

function getOptions() {
	return {
		isGuest: true,
		staff: getGuestStaff(),
		roles: ['销售', '摄影', '摄像', '化妆', '后期'],
		sources: ['直客', '转介绍', '小红书', '抖音', '其他'],
		types: [
			{ _id: 'guest_type_1', TYPE_NAME: '婚礼跟拍', TYPE_COLOR: '#d9001b', TYPE_ORDER: 1 },
			{ _id: 'guest_type_2', TYPE_NAME: '外景写真', TYPE_COLOR: '#2f6df6', TYPE_ORDER: 2 },
			{ _id: 'guest_type_3', TYPE_NAME: '商拍', TYPE_COLOR: '#7c3aed', TYPE_ORDER: 3 },
			{ _id: 'guest_type_4', TYPE_NAME: '活动跟拍', TYPE_COLOR: '#ff8a00', TYPE_ORDER: 4 },
		],
		staffList: [
			{ _id: 'guest_staff', STAFF_NAME: '访客本人', STAFF_ROLES: ['体验用户'] },
		],
		progressOptions: [
			{ label: '访客临时', value: 10 },
		],
		calcModes: [
			{ label: '不计提成', value: 'none' },
		],
		finance: {},
	};
}

function _normalizeType(typeName) {
	typeName = String(typeName || '').trim();
	let types = getOptions().types;
	let hit = types.find(item => item.TYPE_NAME == typeName)
		|| types.find(item => typeName && (typeName.indexOf(item.TYPE_NAME) >= 0 || item.TYPE_NAME.indexOf(typeName) >= 0))
		|| types.find(item => String(item.TYPE_NAME || '').indexOf('写真') >= 0)
		|| types[0];
	return hit || { _id: 'guest_type', TYPE_NAME: typeName || '临时档期', TYPE_COLOR: '#537d96' };
}

function saveGuestOrder(input = {}) {
	cleanupGuestData();
	let date = String(input.ORDER_DATE || input.date || '').trim();
	let customerName = String(input.ORDER_CUSTOMER_NAME || input.customerName || '').trim();
	if (!date || !customerName) return null;

	let type = _normalizeType(input.ORDER_TYPE_NAME || input.typeName || input.type || '');
	let deposit = _money(input.ORDER_DEPOSIT || input.deposit);
	let final = _money(input.ORDER_FINAL || input.final);
	let extra = _money(input.ORDER_EXTRA || input.extra);
	let paid = _money(input.PAID_AMOUNT || input.paidAmount || input.ORDER_ACTUAL_AMOUNT);
	let amount = _money(input.ORDER_AMOUNT || input.amount);
	if (!amount) amount = _money(deposit + final + extra);

	let order = {
		_id: 'guest_order_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
		ORDER_DATE: date,
		ORDER_TIME: _parseTime(input.ORDER_TIME || input.time || ''),
		ORDER_END_TIME: String(input.ORDER_END_TIME || input.endTime || ''),
		ORDER_TYPE_ID: type._id,
		ORDER_TYPE_NAME: type.TYPE_NAME,
		ORDER_TYPE_COLOR: type.TYPE_COLOR,
		ORDER_CUSTOMER_NAME: customerName,
		ORDER_CUSTOMER_SURNAME: _surname(customerName),
		ORDER_CUSTOMER_MOBILE: String(input.ORDER_CUSTOMER_MOBILE || input.customerMobile || ''),
		ORDER_PLACE: String(input.ORDER_PLACE || input.place || ''),
		ORDER_CONTENT: String(input.ORDER_CONTENT || input.content || ''),
		ORDER_AMOUNT: amount,
		ORDER_DEPOSIT: deposit,
		ORDER_FINAL: final,
		ORDER_EXTRA: extra,
		ORDER_ACTUAL_AMOUNT: paid,
		PAID_AMOUNT: paid,
		UNPAID_AMOUNT: Math.max(0, _money(amount - paid)),
		ORDER_PROGRESS_DESC: '访客临时',
		ORDER_SETTLE_STATUS_DESC: '不进入真实系统',
		ORDER_GUEST_ONLY: 1,
		ORDER_GUEST_EXPIRE_TIME: Date.now() + GUEST_ORDER_TTL,
		canFull: false,
		canEdit: false,
	};
	let list = _safeOrders();
	list.unshift(order);
	_saveOrders(list.slice(0, 30));
	return order;
}

function handleGuestAgent(text, attachments = []) {
	text = String(text || '').trim();
	if (attachments && attachments.length && !text) {
		return {
			created: false,
			reply: '访客模式不会把截图上传给 AI 或写入真实系统。你可以用文字说”6月12日11:00 罗雅 外景写真 金额299 已收100”，我会只在本机生成一条临时访客档期。',
		};
	}
	if (!/(新增|记录|安排|登记|录入|订单|档期|拍摄|定了|拍了|外景|写真|婚礼|商拍|百日宴)/.test(text)) {
		return {
			created: false,
			reply: '当前是访客体验模式：我不会读取真实档期、订单、客户、工资或团队数据。绑定员工后可以使用完整 AI 对话；访客文字新增只会生成本机临时演示档期。',
		};
	}
	let date = _parseDate(text);
	let customerName = _parseCustomer(text);
	if (!date || !customerName) {
		return {
			created: false,
			reply: '访客模式可以创建本机临时档期，但需要至少说清日期和客户。示例：6月12日11:00 罗雅 外景写真 金额299 已收100。',
		};
	}
	let types = getOptions().types;
	let type = types.find(item => text.indexOf(item.TYPE_NAME) >= 0) || {};
	let paid = _parseAmount(text, ['已收', '实收', '收了', '收款']);
	let deposit = _parseAmount(text, ['定金']);
	let final = _parseAmount(text, ['尾款']);
	let amount = _parseAmount(text, ['订单金额', '金额', '总价', '总额', '报价']);
	if (!final && amount) final = Math.max(0, amount - Math.max(deposit, paid));
	let order = saveGuestOrder({
		date,
		time: _parseTime(text),
		typeName: type.TYPE_NAME || '',
		customerName,
		amount,
		deposit,
		final,
		paidAmount: paid,
		content: text,
	});
	return {
		created: !!order,
		date,
		order,
		reply: order
			? `已在访客本机临时记录：\n1. ${order.ORDER_DATE} ${order.ORDER_TIME || ''} ${order.ORDER_TYPE_NAME}，客户${order.ORDER_CUSTOMER_NAME}，订单¥${order.ORDER_AMOUNT || 0}，实收¥${order.PAID_AMOUNT || 0}，未收¥${order.UNPAID_AMOUNT || 0}。\n这条记录不会同步到登录后的真实数据，并会定期自动清理。`
			: '访客临时档期保存失败，请稍后再试。',
	};
}

function getOrders(month) {
	month = month || _currentMonth();
	return _safeOrders().filter(item => !item.ORDER_DATE || String(item.ORDER_DATE).substr(0, 7) == month);
}

function getCalendar(month) {
	let days = {};
	for (let order of getOrders(month)) {
		if (!days[order.ORDER_DATE]) days[order.ORDER_DATE] = [];
		days[order.ORDER_DATE].push({
			kind: 'order',
			id: order._id,
			typeName: order.ORDER_TYPE_NAME,
			color: order.ORDER_TYPE_COLOR,
			time: order.ORDER_TIME,
			title: order.ORDER_TYPE_NAME,
			customer: order.ORDER_CUSTOMER_SURNAME,
			canFull: false,
		});
	}
	return { month, days };
}

function getDay(day) {
	let month = String(day || _fmtDate(new Date())).substr(0, 7);
	let orders = getOrders(month).filter(item => item.ORDER_DATE == day);
	return { orders, items: [], rests: [] };
}

function getPerformance(month) {
	return {
		isGuest: true,
		my: {
			performance: 0,
			rankNo: 0,
			incomeCount: 0,
			refundCount: 0,
			currentCommission: 0,
			releaseCommission: 0,
			deductCommission: 0,
			adjustCommission: 0,
			frozenRemain: 0,
			payable: 0,
		},
		rankList: [],
		paymentList: [],
		commissionList: [],
		month,
	};
}

function getNotes() {
	return [];
}

module.exports = {
	isGuest,
	enterGuest,
	exitGuest,
	cleanupGuestData,
	showReadonlyTip,
	getGuestStaff,
	getOptions,
	getCalendar,
	getDay,
	getOrders,
	getPerformance,
	getNotes,
	saveGuestOrder,
	handleGuestAgent,
};
