/**
 * Notes: 云屿摄影 v1.2.0 财务配置与常量
 */

const DEFAULT_CUTOVER_MONTH = '2026-06';

const COLLECTION = {
	PAYMENT: 'bx_work_payment',
	COMMISSION: 'bx_work_commission',
	FINANCE_LOG: 'bx_work_finance_log',
	ORDER: 'bx_work_order',
	STAFF: 'bx_work_staff',
	PAYROLL: 'bx_work_payroll'
};

const LOCK_PREFIX = {
	PAYMENT: 'payment:',
	PAYMENT_ADMIN: 'payment_admin:',
	REFUND: 'refund:',
	ADJUSTMENT: 'adjustment:',
	COMMISSION_GROUP: 'commission_group:',
	COMMISSION: 'commission:',
	RELEASE: 'release:',
	FROZEN_DEDUCT: 'frozen_deduct:',
	DEDUCT: 'deduct:',
	ADJUST_COMMISSION: 'adjust_commission:',
	PAYROLL: 'payroll:'
};

const PAYMENT_TYPE = {
	DEPOSIT: 'deposit',
	FINAL: 'final',
	EXTRA: 'extra',
	PRODUCT: 'product',
	SUPPLEMENT: 'supplement',
	REFUND: 'refund',
	ADJUST: 'adjust'
};

const PAYMENT_BASE_TYPE = {
	SHOOT: 'shoot',
	EXTRA: 'extra',
	ALL: 'all'
};

const PAYMENT_DIRECTION = {
	INCOME: 'income',
	REFUND: 'refund',
	ADJUST: 'adjust'
};

const PAYMENT_SOURCE = {
	ORDER_EDIT: 'order_edit',
	ADMIN: 'admin',
	REFUND: 'refund',
	ADJUSTMENT: 'adjustment',
	MIGRATION: 'migration',
	SYSTEM: 'system'
};

const PAYMENT_STATUS = {
	EFFECTIVE: 10,
	VOID: 20
};

const LOCKED = {
	NO: 0,
	YES: 1
};

const COMMISSION_KIND = {
	CURRENT: 'CURRENT',
	FROZEN: 'FROZEN',
	RELEASE: 'RELEASE',
	DEDUCT: 'DEDUCT',
	FROZEN_DEDUCT: 'FROZEN_DEDUCT',
	ADJUST: 'ADJUST',
	VOID: 'VOID'
};

const COMMISSION_MODE = {
	PERCENT: 'percent',
	FIXED: 'fixed',
	MANUAL: 'manual',
	NONE: 'none'
};

const COMMISSION_STATUS = {
	PENDING_PAY: 10,
	IN_PAYROLL: 20,
	PAID: 30,
	FROZEN: 40,
	PART_USED: 50,
	USED: 60,
	DEDUCTED: 70,
	VOID: 90
};

const FINANCE_LOG_TYPE = {
	PAYMENT: 'payment',
	COMMISSION: 'commission',
	PAYROLL: 'payroll',
	ORDER: 'order',
	ADMIN: 'admin',
	MIGRATION: 'migration'
};

const FINANCE_LOG_PHASE = {
	START: 'START',
	SUCCESS: 'SUCCESS',
	FAIL: 'FAIL'
};

const FINANCE_LOG_SOURCE = {
	ORDER_EDIT: 'order_edit',
	MINI_ADMIN: 'mini_admin',
	OLD_ADMIN: 'old_admin',
	SYSTEM: 'system',
	MIGRATION: 'migration'
};

const PAYROLL_SOURCE = {
	LEGACY: 'legacy',
	NEW: 'new'
};

const ORDER_COMMISSION_STATUS = {
	NONE: 0,
	PARTIAL: 10,
	FROZEN: 20,
	WAIT_PAY: 30,
	PAID: 40,
	DEDUCTED: 50
};

const ORDER_FINANCE_STATUS = {
	NONE: 0,
	NORMAL: 10,
	CANCEL_PENDING: 20,
	BALANCED: 30
};

function normalizeMonth(month) {
	if (!month) return '';
	month = String(month).trim();
	if (/^\d{4}-\d{2}$/.test(month)) return month;
	if (/^\d{4}-\d{2}-\d{2}/.test(month)) return month.substring(0, 7);
	return '';
}

function getCutoverMonth() {
	let envMonth = normalizeMonth(process.env.B00_WORK_LEDGER_CUTOVER_MONTH);
	return envMonth || DEFAULT_CUTOVER_MONTH;
}

function isNewLedgerMonth(month) {
	month = normalizeMonth(month);
	if (!month) return false;
	return month >= getCutoverMonth();
}

function isNewLedgerOrder(order, hasLedgerPayment = false) {
	if (!order) return false;
	if (Number(order.ORDER_PAYMENT_SYNC_TIME || 0) > 0) return true;
	if (hasLedgerPayment) return true;

	let month = normalizeMonth(order.ORDER_COMPLETE_MONTH || order.ORDER_DATE || '');
	return isNewLedgerMonth(month);
}

function buildPaymentBizKey(orderId, clientKey, version = 1) {
	return LOCK_PREFIX.PAYMENT + orderId + ':' + clientKey + ':v' + version;
}

function buildAdminPaymentBizKey(orderId, clientKey) {
	return LOCK_PREFIX.PAYMENT_ADMIN + orderId + ':' + clientKey;
}

function buildRefundBizKey(orderId, refPaymentId, clientKey) {
	return LOCK_PREFIX.REFUND + orderId + ':' + (refPaymentId || 'order') + ':' + clientKey;
}

function buildAdjustmentBizKey(orderId, clientKey) {
	return LOCK_PREFIX.ADJUSTMENT + orderId + ':' + clientKey;
}

function buildPayrollLockKey(staffId, month) {
	return LOCK_PREFIX.PAYROLL + staffId + ':' + month;
}

module.exports = {
	DEFAULT_CUTOVER_MONTH,
	COLLECTION,
	LOCK_PREFIX,

	PAYMENT_TYPE,
	PAYMENT_BASE_TYPE,
	PAYMENT_DIRECTION,
	PAYMENT_SOURCE,
	PAYMENT_STATUS,
	LOCKED,

	COMMISSION_KIND,
	COMMISSION_MODE,
	COMMISSION_STATUS,

	FINANCE_LOG_TYPE,
	FINANCE_LOG_PHASE,
	FINANCE_LOG_SOURCE,

	PAYROLL_SOURCE,
	ORDER_COMMISSION_STATUS,
	ORDER_FINANCE_STATUS,

	normalizeMonth,
	getCutoverMonth,
	isNewLedgerMonth,
	isNewLedgerOrder,
	buildPaymentBizKey,
	buildAdminPaymentBizKey,
	buildRefundBizKey,
	buildAdjustmentBizKey,
	buildPayrollLockKey
};
