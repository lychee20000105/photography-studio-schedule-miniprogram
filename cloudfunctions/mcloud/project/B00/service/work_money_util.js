/**
 * Notes: 云屿摄影 v1.2.0 金额工具，主账统一使用 int 分
 */

function _isEmpty(value) {
	return value === undefined || value === null || String(value).trim() === '';
}

function _toMoneyString(value) {
	if (_isEmpty(value)) return '0';
	let str = String(value).trim();
	str = str.replace(/,/g, '');
	return str;
}

function yuanToCent(value, allowNegative = false) {
	let str = _toMoneyString(value);
	if (!/^-?\d+(\.\d{1,2})?$/.test(str)) {
		throw new Error('金额格式错误，最多保留2位小数');
	}

	let negative = str.startsWith('-');
	if (negative) str = str.substring(1);
	if (negative && !allowNegative) throw new Error('金额不能为负数');

	let parts = str.split('.');
	let yuan = parts[0] || '0';
	let cent = parts[1] || '';
	if (cent.length == 1) cent += '0';
	if (cent.length == 0) cent = '00';

	let ret = Number(yuan) * 100 + Number(cent);
	if (!Number.isSafeInteger(ret)) throw new Error('金额超出安全范围');
	return negative ? -ret : ret;
}

function moneyToCentStrict(value, allowNegative = false) {
	return yuanToCent(value, allowNegative);
}

function safeCent(value, defaultValue = 0) {
	if (_isEmpty(value)) return defaultValue;
	let cent = Number(value);
	if (!Number.isFinite(cent)) return defaultValue;
	cent = Math.trunc(cent);
	if (!Number.isSafeInteger(cent)) return defaultValue;
	return cent;
}

function centToYuan(cent) {
	cent = safeCent(cent, 0);
	return Number(centToYuanText(cent));
}

function centToMoney(cent) {
	return centToYuan(cent);
}

function centToYuanText(cent) {
	cent = safeCent(cent, 0);
	let negative = cent < 0;
	cent = Math.abs(cent);
	let yuan = Math.floor(cent / 100);
	let cents = String(cent % 100).padStart(2, '0');
	return (negative ? '-' : '') + yuan + '.' + cents;
}

function centToMoneyText(cent) {
	return centToYuanText(cent);
}

function absCent(cent) {
	return Math.abs(safeCent(cent, 0));
}

function assertPositiveCent(cent, msg = '金额必须大于0') {
	cent = safeCent(cent, 0);
	if (cent <= 0) throw new Error(msg);
	return cent;
}

function splitByRatio(totalCent, numerator = 700, denominator = 1000) {
	totalCent = safeCent(totalCent, 0);
	numerator = safeCent(numerator, 0);
	denominator = safeCent(denominator, 0);
	if (totalCent < 0) throw new Error('拆分金额不能为负数');
	if (denominator <= 0) throw new Error('拆分比例分母必须大于0');
	if (numerator < 0 || numerator > denominator) throw new Error('拆分比例不合法');

	let firstCent = Math.floor(totalCent * numerator / denominator);
	let secondCent = totalCent - firstCent;
	return {
		firstCent,
		secondCent
	};
}

function splitCurrentFrozen(totalCent) {
	let ret = splitByRatio(totalCent, 700, 1000);
	return {
		currentCent: ret.firstCent,
		frozenCent: ret.secondCent
	};
}

function buildMonth(value) {
	if (_isEmpty(value)) {
		let now = new Date();
		return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
	}

	if (typeof value == 'number') {
		let ms = value < 100000000000 ? value * 1000 : value;
		let date = new Date(ms);
		if (isNaN(date.getTime())) return '';
		return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
	}

	let str = String(value).trim();
	if (/^\d{4}-\d{2}$/.test(str)) return str;
	if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 7);
	if (/^\d{4}\/\d{2}\/\d{2}/.test(str)) return str.substring(0, 7).replace('/', '-');
	return '';
}

function normalizeCentSign(cent, direction) {
	cent = safeCent(cent, 0);
	if (direction == 'refund' && cent > 0) return -cent;
	if (direction == 'income' && cent < 0) return absCent(cent);
	return cent;
}

module.exports = {
	yuanToCent,
	moneyToCentStrict,
	safeCent,
	centToYuan,
	centToMoney,
	centToYuanText,
	centToMoneyText,
	absCent,
	assertPositiveCent,
	splitByRatio,
	splitCurrentFrozen,
	buildMonth,
	normalizeCentSign
};
