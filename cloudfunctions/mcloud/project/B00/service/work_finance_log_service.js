/**
 * Notes: 云屿摄影 v1.2.0 财务安全日志服务
 */

const BaseProjectService = require('./base_project_service.js');
const WorkFinanceLogModel = require('../model/work_finance_log_model.js');
const financeConfig = require('./work_finance_config.js');

const MAX_TEXT_LEN = 500;
const MAX_ARRAY_LEN = 30;
const MAX_DEPTH = 4;

const SAFE_FIELDS = {
	payment: [
		'_id', 'PAYMENT_ID', 'PAYMENT_ORDER_ID', 'PAYMENT_ORDER_NO',
		'PAYMENT_ORDER_TYPE_NAME', 'PAYMENT_ORDER_DATE', 'PAYMENT_CUSTOMER_NAME', 'PAYMENT_CUSTOMER_SURNAME',
		'PAYMENT_TYPE', 'PAYMENT_BASE_TYPE', 'PAYMENT_DIRECTION', 'PAYMENT_AMOUNT_CENT', 'PAYMENT_AMOUNT',
		'PAYMENT_DATE', 'PAYMENT_PAY_DATE', 'PAYMENT_MONTH',
		'PAYMENT_STAFF_ID', 'PAYMENT_STAFF_NAME', 'PAYMENT_OWNER_STAFF_ID', 'PAYMENT_OWNER_NAME',
		'PAYMENT_TEAM_ID', 'PAYMENT_TEAM_NAME', 'PAYMENT_SOURCE', 'PAYMENT_STATUS', 'PAYMENT_IS_LOCKED',
		'PAYMENT_LOCK_KEY', 'PAYMENT_REF_PAYMENT_ID', 'PAYMENT_CLIENT_KEY', 'PAYMENT_BIZ_KEY',
		'PAYMENT_VERSION', 'PAYMENT_REPLACE_FROM_ID', 'PAYMENT_REPLACE_TO_ID', 'PAYMENT_VOID_REASON',
		'PAYMENT_VOID_TIME', 'PAYMENT_SUMMARY', 'PAYMENT_NOTE', 'PAYMENT_REMARK',
		'PAYMENT_OPERATOR_STAFF_ID', 'PAYMENT_OPERATOR_NAME', 'PAYMENT_ADD_TIME', 'PAYMENT_EDIT_TIME'
	],
	payroll: [
		'_id', 'PAYROLL_ID', 'PAYROLL_STAFF_ID', 'PAYROLL_STAFF_NAME', 'PAYROLL_MONTH',
		'PAYROLL_AMOUNT', 'PAYROLL_ACTUAL_AMOUNT', 'PAYROLL_TOTAL_CENT', 'PAYROLL_ACTUAL_AMOUNT_CENT',
		'PAYROLL_CURRENT_COMMISSION_CENT', 'PAYROLL_RELEASED_COMMISSION_CENT', 'PAYROLL_DEDUCT_COMMISSION_CENT',
		'PAYROLL_ADJUST_COMMISSION_CENT', 'PAYROLL_FROZEN_REMAIN_CENT', 'PAYROLL_COMMISSION_IDS',
		'PAYROLL_PAYMENT_IDS', 'PAYROLL_SUMMARY', 'PAYROLL_LOCK_KEY', 'PAYROLL_SOURCE', 'PAYROLL_STATUS',
		'PAYROLL_PREVIEW_HASH', 'PAYROLL_EXPECTED_HASH', 'PAYROLL_FAIL_REASON', 'PAYROLL_OPERATOR_STAFF_ID',
		'PAYROLL_OPERATOR_NAME', 'PAYROLL_NOTE', 'PAYROLL_ADMIN_ID', 'PAYROLL_ADMIN_NAME', 'PAYROLL_PAY_TIME',
		'PAYROLL_ADD_TIME', 'PAYROLL_EDIT_TIME'
	],
	order: [
		'_id', 'ORDER_ID', 'ORDER_DATE', 'ORDER_TYPE_ID', 'ORDER_TYPE_NAME', 'ORDER_CUSTOMER_NAME',
		'ORDER_CUSTOMER_SURNAME', 'ORDER_AMOUNT', 'ORDER_AMOUNT_CENT', 'ORDER_SHOOT_DUE_CENT',
		'ORDER_EXTRA_DUE_CENT', 'ORDER_PAYMENT_SYNC_TIME', 'ORDER_PAYMENT_SUMMARY',
		'ORDER_COMMISSION_STATUS', 'ORDER_FINANCE_STATUS', 'ORDER_PROGRESS', 'ORDER_SETTLE_STATUS',
		'ORDER_STATUS', 'ORDER_CANCEL_REASON', 'ORDER_CANCEL_STAFF_ID', 'ORDER_CANCEL_STAFF_NAME',
		'ORDER_CANCEL_TIME', 'ORDER_CREATOR_STAFF_ID', 'ORDER_CREATOR_NAME', 'ORDER_COMPLETE_TIME',
		'ORDER_COMPLETE_MONTH', 'ORDER_AUDIT_TIME', 'ORDER_ADD_TIME', 'ORDER_EDIT_TIME'
	],
	staff: [
		'_id', 'STAFF_ID', 'STAFF_NAME', 'STAFF_TEAM_ID', 'STAFF_TEAM_NAME', 'STAFF_ROLES',
		'STAFF_IS_ADMIN', 'STAFF_STATUS', 'STAFF_ADD_TIME', 'STAFF_EDIT_TIME'
	],
	unknown: [
		'_id', 'id', 'ID', 'type', 'TYPE', 'status', 'STATUS', 'action', 'ACTION',
		'amount', 'amountCent', 'money', 'cent', 'date', 'month', 'note', 'remark'
	]
};

const SENSITIVE_KEY_RE = /(token|password|passwd|pwd|secret|openid|open_id|unionid|session|cookie|authorization|credential|private[_-]?key|api[_-]?key|appsecret|access[_-]?key)/i;
const MOBILE_KEY_RE = /(mobile|phone|tel)/i;

class WorkFinanceLogService extends BaseProjectService {

	_normalizeEntityType(entityType) {
		entityType = String(entityType || '').trim().toLowerCase();
		if (entityType.includes('payment')) return 'payment';
		if (entityType.includes('payroll')) return 'payroll';
		if (entityType.includes('order')) return 'order';
		if (entityType.includes('staff')) return 'staff';
		return entityType || 'unknown';
	}

	_resolveLogType(entityType, options = {}) {
		if (options.type) return String(options.type);
		entityType = this._normalizeEntityType(entityType);
		if (entityType == 'payment') return financeConfig.FINANCE_LOG_TYPE.PAYMENT;
		if (entityType == 'payroll') return financeConfig.FINANCE_LOG_TYPE.PAYROLL;
		if (entityType == 'order') return financeConfig.FINANCE_LOG_TYPE.ORDER;
		if (entityType == 'staff') return financeConfig.FINANCE_LOG_TYPE.ADMIN;
		return financeConfig.FINANCE_LOG_TYPE.ADMIN;
	}

	_safeText(value, maxLen = MAX_TEXT_LEN) {
		if (value === undefined || value === null) return '';
		let str = String(value).replace(/[\r\n\t]+/g, ' ').trim();
		str = str.replace(/(token|password|passwd|pwd|secret|openid|open_id|unionid|session|cookie|authorization|credential|private[_-]?key|api[_-]?key|appsecret|access[_-]?key)\s*[:=]\s*[^\s,;]+/ig, '$1=[REDACTED]');
		if (/^(wx|openid|unionid|session|token|secret|password|passwd|pwd|bearer|sk-|pk-)/i.test(str)) return '[REDACTED]';
		if (/(^|[:=\s])(wx|openid|unionid|session|token|secret|password|passwd|pwd|bearer|sk-|pk-)/i.test(str)) return '[REDACTED]';
		if (/(^|[:=\s])[oO][A-Za-z0-9_-]{20,31}($|[:=\s])/i.test(str)) return '[REDACTED]';
		if (/^[A-Za-z0-9_\-.]{32,}$/.test(str) && /(token|secret|key|session|openid|unionid|password|passwd|pwd|authorization|cookie|credential)/i.test(str)) return '[REDACTED]';
		if (str.length > maxLen) str = str.substring(0, maxLen) + '...';
		return str;
	}

	_maskName(value) {
		if (value === undefined || value === null) return '';
		value = this._safeText(value, 50);
		if (!value) return '';
		let chars = [...value];
		if (chars.length <= 1) return '*';
		return chars[0] + '*'.repeat(Math.min(chars.length - 1, 3));
	}

	_maskMobile(value) {
		value = this._safeText(value, 32);
		if (!value) return '';
		return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
	}

	_isPlainObject(value) {
		return Object.prototype.toString.call(value) == '[object Object]';
	}

	_maskByKey(key, value) {
		if (SENSITIVE_KEY_RE.test(key)) return '[REDACTED]';
		if (/(CLIENT_KEY|BIZ_KEY|LOCK_KEY|REF_ID|ENTITY_ID|\bid\b|_id$)/i.test(key)) {
			let text = this._safeText(value, MAX_TEXT_LEN);
			return text == '[REDACTED]' ? text : null;
		}
		if (MOBILE_KEY_RE.test(key)) return this._maskMobile(value);
		if (/CUSTOMER_NAME$/i.test(key)) return this._maskName(value);
		return null;
	}

	_sanitizeValue(value, key = '', depth = 0) {
		let masked = key ? this._maskByKey(key, value) : null;
		if (masked !== null) return masked;

		if (value === undefined || value === null) return value;
		if (typeof value == 'number') return Number.isFinite(value) ? value : 0;
		if (typeof value == 'boolean') return value;
		if (typeof value == 'string') return this._safeText(value);

		if (depth >= MAX_DEPTH) return Array.isArray(value) ? '[Array]' : '[Object]';

		if (Array.isArray(value)) {
			let list = value.slice(0, MAX_ARRAY_LEN).map(item => this._sanitizeValue(item, '', depth + 1));
			if (value.length > MAX_ARRAY_LEN) list.push('[TRUNCATED:' + value.length + ']');
			return list;
		}

		if (this._isPlainObject(value)) {
			let ret = {};
			for (let k in value) {
				if (!Object.prototype.hasOwnProperty.call(value, k)) continue;
				let v = this._sanitizeValue(value[k], k, depth + 1);
				if (v !== undefined) ret[k] = v;
			}
			return ret;
		}

		return this._safeText(value);
	}

	sanitizeSnapshot(snapshot, entityType = '') {
		if (!snapshot) return {};
		if (Array.isArray(snapshot)) return snapshot.slice(0, MAX_ARRAY_LEN).map(item => this.sanitizeSnapshot(item, entityType));

		snapshot = this._sanitizeValue(snapshot, '', 0) || {};
		if (Array.isArray(snapshot)) return snapshot;
		if (!this._isPlainObject(snapshot)) return {};

		let normalized = this._normalizeEntityType(entityType);
		let whitelist = SAFE_FIELDS[normalized] || SAFE_FIELDS.unknown;
		let ret = {};
		for (let field of whitelist) {
			if (!Object.prototype.hasOwnProperty.call(snapshot, field)) continue;
			let val = this._sanitizeValue(snapshot[field], field, 0);
			if (val !== undefined) ret[field] = val;
		}
		return ret;
	}

	diff(before, after, entityType = '') {
		before = this.sanitizeSnapshot(before, entityType);
		after = this.sanitizeSnapshot(after, entityType);

		let keys = new Set(Object.keys(before || {}).concat(Object.keys(after || {})));
		let ret = {};
		for (let key of keys) {
			let oldVal = before ? before[key] : undefined;
			let newVal = after ? after[key] : undefined;
			if (JSON.stringify(oldVal) == JSON.stringify(newVal)) continue;
			ret[key] = {
				before: oldVal === undefined ? null : oldVal,
				after: newVal === undefined ? null : newVal,
			};
		}
		return ret;
	}

	_sanitizeOperator(operator) {
		operator = operator || {};
		let id = operator._id || operator.STAFF_ID || operator.ADMIN_ID || operator.id || '';
		let name = operator.STAFF_NAME || operator.ADMIN_NAME || operator.name || '';
		let node = {
			id: this._safeText(id, 80),
			name: this._safeText(name, 80),
		};
		if (operator.STAFF_TEAM_ID || operator.STAFF_TEAM_NAME) {
			node.teamId = this._safeText(operator.STAFF_TEAM_ID, 80);
			node.teamName = this._safeText(operator.STAFF_TEAM_NAME, 80);
		}
		if (operator.STAFF_IS_ADMIN !== undefined) node.isAdmin = Number(operator.STAFF_IS_ADMIN || 0);
		return node;
	}

	async log(action, entityType, entityId, before = null, after = null, options = {}) {
		options = options || {};
		entityType = this._normalizeEntityType(entityType);
		let operator = this._sanitizeOperator(options.operator || options.adminStaff || options.staff || {});
		let beforeSafe = this.sanitizeSnapshot(before, entityType);
		let afterSafe = this.sanitizeSnapshot(after, entityType);
		let diffSafe = options.diff || this.diff(beforeSafe, afterSafe, entityType);

		let data = {
			FINLOG_TYPE: this._resolveLogType(entityType, options),
			FINLOG_ENTITY_TYPE: entityType,
			FINLOG_REF_ID: this._safeText(entityId, 120),
			FINLOG_ENTITY_ID: this._safeText(entityId, 120),
			FINLOG_BIZ_KEY: this._sanitizeValue(options.bizKey || '', 'FINLOG_BIZ_KEY', 0),
			FINLOG_ACTION: this._safeText(action, 80),
			FINLOG_PHASE: this._safeText(options.phase || financeConfig.FINANCE_LOG_PHASE.SUCCESS, 30),
			FINLOG_SOURCE: this._safeText(options.source || financeConfig.FINANCE_LOG_SOURCE.SYSTEM, 40),
			FINLOG_BEFORE: beforeSafe,
			FINLOG_AFTER: afterSafe,
			FINLOG_DIFF: this._sanitizeValue(diffSafe, 'FINLOG_DIFF', 0) || {},
			FINLOG_OPERATOR_STAFF_ID: operator.id || '',
			FINLOG_OPERATOR_OPENID: '',
			FINLOG_OPERATOR_NAME: operator.name || '',
			FINLOG_OPERATOR: operator,
			FINLOG_NOTE: this._safeText(options.note || '', 300),
			FINLOG_REMARK: this._safeText(options.remark || options.note || '', 300),
			FINLOG_ERROR: this._safeText(options.error || '', 500),
		};

		return await WorkFinanceLogModel.insert(data);
	}
}

module.exports = WorkFinanceLogService;
