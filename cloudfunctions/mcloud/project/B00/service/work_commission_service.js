/**
 * Notes: 云屿摄影 v1.2.0 提成事件账本服务
 */

const BaseProjectService = require('./base_project_service.js');
const WorkCommissionModel = require('../model/work_commission_model.js');
const WorkPaymentModel = require('../model/work_payment_model.js');
const WorkOrderModel = require('../model/work_order_model.js');
const WorkStaffModel = require('../model/work_staff_model.js');
const WorkFinanceLogService = require('./work_finance_log_service.js');
const financeConfig = require('./work_finance_config.js');
const moneyUtil = require('./work_money_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const util = require('../../../framework/utils/util.js');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const FROZEN_CURRENT_NUMERATOR = 700;
const FROZEN_CURRENT_DENOMINATOR = 1000;

const PAYROLL_KINDS = [
	financeConfig.COMMISSION_KIND.CURRENT,
	financeConfig.COMMISSION_KIND.RELEASE,
	financeConfig.COMMISSION_KIND.ADJUST,
	financeConfig.COMMISSION_KIND.DEDUCT,
];

const INCOME_COMMISSION_KINDS = [
	financeConfig.COMMISSION_KIND.CURRENT,
	financeConfig.COMMISSION_KIND.FROZEN,
];

class WorkCommissionService extends BaseProjectService {

	constructor() {
		super();
		this._financeLog = new WorkFinanceLogService();
	}

	_hasValue(value) {
		return value !== undefined && value !== null && String(value).trim() !== '';
	}

	_pickValue(obj, fields) {
		obj = obj || {};
		for (let field of fields) {
			if (this._hasValue(obj[field])) return obj[field];
		}
		return undefined;
	}

	_pickFieldValue(obj, fields) {
		obj = obj || {};
		for (let field of fields) {
			if (this._hasValue(obj[field])) return { field, value: obj[field] };
		}
		return { field: '', value: undefined };
	}

	_text(value, maxLen = 300) {
		if (value === undefined || value === null) return '';
		let str = String(value).replace(/[\r\n\t]+/g, ' ').trim();
		if (str.length > maxLen) str = str.substring(0, maxLen);
		return str;
	}

	_page(value) {
		value = Number(value || 1);
		if (!Number.isFinite(value) || value < 1) return 1;
		return Math.floor(value);
	}

	_size(value) {
		value = Number(value || DEFAULT_PAGE_SIZE);
		if (!Number.isFinite(value) || value < 1) return DEFAULT_PAGE_SIZE;
		value = Math.floor(value);
		return Math.min(value, MAX_PAGE_SIZE);
	}

	_withProjectWhere(andWhere = {}, orWhere = null) {
		let pid = util.getProjectId();
		andWhere = Object.assign({ _pid: pid }, andWhere || {});
		if (orWhere && Array.isArray(orWhere) && orWhere.length > 0) {
			return { and: andWhere, or: orWhere };
		}
		return andWhere;
	}

	_operatorSnapshot(staff) {
		staff = staff || {};
		return {
			id: this._text(staff._id || staff.STAFF_ID || staff.ADMIN_ID || staff.id || '', 80),
			name: this._text(staff.STAFF_NAME || staff.ADMIN_NAME || staff.name || '', 80),
		};
	}

	async _getOrder(orderId, must = true) {
		orderId = this._text(orderId, 120);
		if (!orderId) {
			if (must) this.AppError('缺少订单ID');
			return null;
		}

		let order = await WorkOrderModel.getOne(orderId);
		if (!order) order = await WorkOrderModel.getOne({ ORDER_ID: orderId });
		if (!order && must) this.AppError('订单不存在');
		return order;
	}

	async _getPayment(paymentOrId, must = true) {
		if (paymentOrId && typeof paymentOrId == 'object') return paymentOrId;

		let paymentId = this._text(paymentOrId, 120);
		if (!paymentId) {
			if (must) this.AppError('缺少收款ID');
			return null;
		}

		let payment = await WorkPaymentModel.getOne(paymentId);
		if (!payment) payment = await WorkPaymentModel.getOne({ PAYMENT_ID: paymentId });
		if (!payment && must) this.AppError('收款记录不存在');
		return payment;
	}

	async _getStaff(staffId, must = true) {
		staffId = this._text(staffId, 120);
		if (!staffId) {
			if (must) this.AppError('缺少员工ID');
			return null;
		}

		let staff = await WorkStaffModel.getOne(staffId);
		if (!staff) staff = await WorkStaffModel.getOne({ STAFF_ID: staffId });
		if (!staff && must) this.AppError('员工不存在');
		return staff;
	}

	_paymentKey(payment) {
		payment = payment || {};
		return this._text(payment._id || payment.PAYMENT_ID || '', 120);
	}

	_paymentRefKeys(payment) {
		let keys = [];
		payment = payment || {};
		for (let value of [payment._id, payment.PAYMENT_ID, this._paymentKey(payment)]) {
			let key = this._text(value || '', 120);
			if (key && !keys.includes(key)) keys.push(key);
		}
		return keys;
	}

	_participantBizFragment(participant) {
		participant = participant || {};
		return [
			participant.participantId || '',
			participant.roleName || '',
			participant.baseType || '',
			participant.mode || '',
		].map(item => this._text(item || '-', 40)).join(':');
	}

	_commissionKey(commission) {
		commission = commission || {};
		return this._text(commission._id || commission.COMMISSION_ID || '', 120);
	}

	_effectiveCommissionStatusWhere() {
		return ['!=', financeConfig.COMMISSION_STATUS.VOID];
	}

	_paymentVersion(payment) {
		let version = Number((payment && payment.PAYMENT_VERSION) || 1);
		if (!Number.isSafeInteger(version) || version < 1) version = 1;
		return version;
	}

	_normalizeMonth(value, fallback = '') {
		let month = financeConfig.normalizeMonth(value || fallback || '');
		if (month) return month;
		month = moneyUtil.buildMonth(value || fallback || timeUtil.time('Y-M-D'));
		return financeConfig.normalizeMonth(month);
	}

	_safeCent(value, defaultValue = 0) {
		return moneyUtil.safeCent(value, defaultValue);
	}

	_resolveCentInput(input = {}, centFields = [], yuanFields = [], allowNegative = true) {
		let centValue = this._pickValue(input, centFields);
		if (centValue !== undefined) {
			let cent = Number(centValue);
			if (!Number.isSafeInteger(cent)) this.AppError('金额分必须是整数');
			if (!allowNegative && cent < 0) this.AppError('金额不能为负数');
			return cent;
		}

		let yuanValue = this._pickValue(input, yuanFields);
		if (yuanValue !== undefined) return moneyUtil.moneyToCentStrict(yuanValue, allowNegative);
		return 0;
	}

	_decimalToScaledInt(value, scale) {
		if (value === undefined || value === null || String(value).trim() === '') return 0;
		let str = String(value).trim();
		let hasPercent = str.endsWith('%');
		str = str.replace(/%$/, '').replace(/,/g, '');
		if (!/^-?\d+(\.\d+)?$/.test(str)) return 0;

		let negative = str.startsWith('-');
		if (negative) str = str.substring(1);
		let parts = str.split('.');
		let intPart = parts[0] || '0';
		let fracPart = parts[1] || '';
		let factor = scale;
		let fracScale = String(scale).length - 1;
		if (fracPart.length > fracScale) fracPart = fracPart.substring(0, fracScale);
		while (fracPart.length < fracScale) fracPart += '0';
		let ret = Number(intPart) * factor + Number(fracPart || 0);
		if (!Number.isSafeInteger(ret)) return 0;
		return (negative ? -ret : ret) * (hasPercent ? 1 : 1);
	}

	_rateToBps(rate, options = {}) {
		if (rate === undefined || rate === null || String(rate).trim() === '') return 0;
		let raw = String(rate).trim();
		let numeric = Number(raw.replace(/%$/, ''));
		if (!Number.isFinite(numeric)) return 0;

		if (options && options.isRatio) return Math.trunc(this._decimalToScaledInt(raw.replace(/%$/, ''), 10000));
		return Math.trunc(this._decimalToScaledInt(raw.replace(/%$/, ''), 100));
	}

	_normalizeMode(value) {
		value = this._text(value || financeConfig.COMMISSION_MODE.NONE, 40).toLowerCase();
		if (value == 'percent' || value == 'rate' || value == 'ratio') return financeConfig.COMMISSION_MODE.PERCENT;
		if (value == 'fixed' || value == 'fix') return financeConfig.COMMISSION_MODE.FIXED;
		if (value == 'manual' || value == 'adjust') return financeConfig.COMMISSION_MODE.MANUAL;
		return financeConfig.COMMISSION_MODE.NONE;
	}

	_normalizeBaseType(value, fallback = financeConfig.PAYMENT_BASE_TYPE.SHOOT) {
		value = this._text(value || fallback || financeConfig.PAYMENT_BASE_TYPE.SHOOT, 40).toLowerCase();
		if (value == financeConfig.PAYMENT_BASE_TYPE.EXTRA) return financeConfig.PAYMENT_BASE_TYPE.EXTRA;
		if (value == financeConfig.PAYMENT_BASE_TYPE.ALL) return financeConfig.PAYMENT_BASE_TYPE.ALL;
		return financeConfig.PAYMENT_BASE_TYPE.SHOOT;
	}

	async _normalizeParticipant(participant = {}) {
		let participantId = this._text(this._pickValue(participant, [
			'PARTICIPANT_ID', 'participantId', 'id', '_id', 'ORDER_PARTICIPANT_ID'
		]) || '', 120);
		let staffId = this._text(this._pickValue(participant, [
			'STAFF_ID', 'staffId', 'COMMISSION_STAFF_ID', 'participantStaffId', 'ORDER_STAFF_ID'
		]) || participantId, 120);
		if (!staffId) this.AppError('参与人缺少员工ID');

		let staff = await this._getStaff(staffId, false);
		if (staff) staffId = staff._id;

		let mode = this._normalizeMode(this._pickValue(participant, [
			'COMMISSION_MODE', 'commissionMode', 'calcMode', 'CALC_MODE', 'mode', 'settleMode', 'type'
		]));
		let ratePick = this._pickFieldValue(participant, [
			'COMMISSION_RATE_RATIO', 'commissionRateRatio', 'rateRatio', 'ratio', 'COMMISSION_RATE', 'commissionRate', 'rate', 'percent'
		]);
		let rateRaw = ratePick.value;
		let targetCent = this._resolveCentInput(participant, [
			'COMMISSION_AMOUNT_CENT', 'commissionAmountCent', 'amountCent', 'targetCent', 'fixedCent', 'manualCent'
		], [
			'COMMISSION_AMOUNT', 'commissionAmount', 'amount', 'targetAmount', 'fixedAmount', 'manualAmount'
		], false);
		let baseType = this._normalizeBaseType(this._pickValue(participant, [
			'PAYMENT_BASE_TYPE', 'COMMISSION_BASE_TYPE', 'baseType', 'commissionBaseType'
		]), financeConfig.PAYMENT_BASE_TYPE.ALL);
		let roleName = this._text(this._pickValue(participant, ['ROLE_NAME', 'roleName', 'role', 'COMMISSION_ROLE_NAME']) || '', 80);
		if (!participantId) participantId = this._text([staffId, roleName, baseType, mode].filter(item => item).join(':'), 120) || staffId;

		let staffName = this._text(this._pickValue(participant, [
			'STAFF_NAME', 'staffName', 'name', 'COMMISSION_STAFF_NAME'
		]) || (staff && staff.STAFF_NAME) || '', 80);
		if (!staffName && staffId) staffName = staffId;

		return {
			participantId,
			staffId,
			staffOpenid: '',
			staffName,
			roleName,
			teamId: this._text(this._pickValue(participant, ['TEAM_ID', 'teamId', 'COMMISSION_TEAM_ID']) || (staff && staff.STAFF_TEAM_ID) || '', 80),
			teamName: this._text(this._pickValue(participant, ['TEAM_NAME', 'teamName', 'COMMISSION_TEAM_NAME']) || (staff && staff.STAFF_TEAM_NAME) || '', 80),
			mode,
			rateRaw,
			rateBps: this._rateToBps(rateRaw, { isRatio: ['ratio', 'rateRatio', 'COMMISSION_RATE_RATIO', 'commissionRateRatio'].includes(ratePick.field) }),
			targetCent,
			baseType,
		};
	}

	_participantSnapshot(participant) {
		participant = participant || {};
		return {
			participantId: participant.participantId || '',
			staffId: participant.staffId || '',
			staffName: participant.staffName || '',
			roleName: participant.roleName || '',
			teamId: participant.teamId || '',
			teamName: participant.teamName || '',
			mode: participant.mode || financeConfig.COMMISSION_MODE.NONE,
			rate: participant.rateRaw === undefined || participant.rateRaw === null ? '' : String(participant.rateRaw),
			rateBps: participant.rateBps || 0,
			targetCent: participant.targetCent || 0,
			baseType: participant.baseType || financeConfig.PAYMENT_BASE_TYPE.ALL,
		};
	}

	_participantAppliesToPayment(participant, payment) {
		let participantBase = this._normalizeBaseType(participant && participant.baseType, financeConfig.PAYMENT_BASE_TYPE.ALL);
		let paymentBase = this._normalizeBaseType(payment && payment.PAYMENT_BASE_TYPE, financeConfig.PAYMENT_BASE_TYPE.SHOOT);
		if (participantBase == financeConfig.PAYMENT_BASE_TYPE.ALL) return true;
		if (paymentBase == financeConfig.PAYMENT_BASE_TYPE.ALL) return true;
		return participantBase == paymentBase;
	}

	_resolveDueCent(order, payment, participant = {}) {
		let baseType = this._normalizeBaseType((participant && participant.baseType) || (payment && payment.PAYMENT_BASE_TYPE), financeConfig.PAYMENT_BASE_TYPE.SHOOT);
		if (baseType == financeConfig.PAYMENT_BASE_TYPE.EXTRA) {
			let dueCent = this._safeCent(order && order.ORDER_EXTRA_DUE_CENT, 0);
			if (dueCent > 0) return dueCent;
			if (order && this._hasValue(order.ORDER_EXTRA)) return moneyUtil.moneyToCentStrict(order.ORDER_EXTRA, false);
			return 0;
		}

		if (baseType == financeConfig.PAYMENT_BASE_TYPE.ALL) {
			let dueCent = this._safeCent(order && order.ORDER_AMOUNT_CENT, 0);
			if (dueCent > 0) return dueCent;
			if (order && this._hasValue(order.ORDER_AMOUNT)) return moneyUtil.moneyToCentStrict(order.ORDER_AMOUNT, false);
			return 0;
		}

		let dueCent = this._safeCent(order && order.ORDER_SHOOT_DUE_CENT, 0);
		if (dueCent > 0) return dueCent;
		if (order && this._hasValue(order.ORDER_AMOUNT)) return moneyUtil.moneyToCentStrict(order.ORDER_AMOUNT, false);
		return 0;
	}

	_paymentBaseMatches(targetBase, paymentBase) {
		targetBase = this._normalizeBaseType(targetBase, financeConfig.PAYMENT_BASE_TYPE.SHOOT);
		paymentBase = this._normalizeBaseType(paymentBase, financeConfig.PAYMENT_BASE_TYPE.SHOOT);
		if (targetBase == financeConfig.PAYMENT_BASE_TYPE.ALL) return true;
		if (paymentBase == financeConfig.PAYMENT_BASE_TYPE.ALL) return true;
		return targetBase == paymentBase;
	}

	async _sumEffectiveIncomePaidCent(orderId, baseType, currentPayment = null) {
		let payments = await WorkPaymentModel.getAll({
			PAYMENT_ORDER_ID: orderId,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		}, '*', { PAYMENT_DATE: 'asc', PAYMENT_ADD_TIME: 'asc' }, 1000);

		let totalCent = 0;
		let hasCurrent = false;
		let currentId = this._paymentKey(currentPayment);
		for (let payment of payments) {
			if (!this._paymentBaseMatches(baseType, payment.PAYMENT_BASE_TYPE)) continue;
			if (currentId && this._paymentKey(payment) == currentId) hasCurrent = true;
			totalCent += this._safeCent(payment.PAYMENT_AMOUNT_CENT, 0);
		}

		if (currentPayment && currentId && !hasCurrent && this._paymentBaseMatches(baseType, currentPayment.PAYMENT_BASE_TYPE)) {
			totalCent += this._safeCent(currentPayment.PAYMENT_AMOUNT_CENT, 0);
		}
		return totalCent;
	}

	async _sumGeneratedIncomeCommissionCent(orderId, participantId, mode, currentPayment = null) {
		let list = await WorkCommissionModel.getAll({
			COMMISSION_ORDER_ID: orderId,
			COMMISSION_PARTICIPANT_ID: participantId,
			COMMISSION_MODE: mode,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
		}, '*', { COMMISSION_ADD_TIME: 'asc' }, 1000);

		let currentPaymentId = this._paymentKey(currentPayment);
		let totalCent = 0;
		for (let item of list) {
			if (![financeConfig.COMMISSION_KIND.CURRENT, financeConfig.COMMISSION_KIND.FROZEN, financeConfig.COMMISSION_KIND.DEDUCT, financeConfig.COMMISSION_KIND.FROZEN_DEDUCT].includes(item.COMMISSION_KIND)) continue;
			if (currentPaymentId && item.COMMISSION_PAYMENT_ID == currentPaymentId) continue;
			totalCent += this._safeCent(item.COMMISSION_AMOUNT_CENT, 0);
		}
		return totalCent;
	}

	async _calcCommissionDetail(payment, rawParticipant, order = null) {
		payment = await this._getPayment(payment);
		order = order || await this._getOrder(payment.PAYMENT_ORDER_ID);
		let participant = rawParticipant && rawParticipant.participantId ? rawParticipant : await this._normalizeParticipant(rawParticipant || {});
		let paymentAmountCent = this._safeCent(payment.PAYMENT_AMOUNT_CENT, 0);
		let baseAmountCent = paymentAmountCent > 0 ? paymentAmountCent : Math.abs(paymentAmountCent);

		let detail = {
			amountCent: 0,
			baseAmountCent,
			totalAmountCent: 0,
			mode: participant.mode,
			rate: participant.rateRaw === undefined || participant.rateRaw === null ? 0 : Number(participant.rateRaw),
			ruleSnapshot: this._participantSnapshot(participant),
		};

		if (payment.PAYMENT_DIRECTION != financeConfig.PAYMENT_DIRECTION.INCOME || paymentAmountCent <= 0) return detail;
		if (!this._participantAppliesToPayment(participant, payment)) return detail;
		if (participant.mode == financeConfig.COMMISSION_MODE.NONE) return detail;

		if (participant.mode == financeConfig.COMMISSION_MODE.PERCENT) {
			let rateBps = participant.rateBps || 0;
			if (rateBps <= 0) return detail;
			let amountCent = Math.floor(paymentAmountCent * rateBps / 10000);
			detail.amountCent = amountCent;
			detail.totalAmountCent = amountCent;
			return detail;
		}

		if (participant.mode == financeConfig.COMMISSION_MODE.FIXED || participant.mode == financeConfig.COMMISSION_MODE.MANUAL) {
			let targetCent = this._safeCent(participant.targetCent, 0);
			if (targetCent <= 0) return detail;
			let dueCent = this._resolveDueCent(order, payment, participant);
			if (dueCent <= 0) this.AppError('固定/手工提成缺少订单应收dueCent，不能按定金+尾款凑算');

			let paidCent = await this._sumEffectiveIncomePaidCent(order._id, participant.baseType, payment);
			let cappedPaidCent = Math.min(Math.max(paidCent, 0), dueCent);
			let cumulativeTargetCent = Math.floor(targetCent * cappedPaidCent / dueCent);
			let generatedCent = await this._sumGeneratedIncomeCommissionCent(order._id, participant.participantId, participant.mode, payment);
			let amountCent = Math.max(0, Math.min(targetCent, cumulativeTargetCent) - generatedCent);

			detail.amountCent = amountCent;
			detail.totalAmountCent = amountCent;
			detail.baseAmountCent = cappedPaidCent;
			detail.ruleSnapshot.dueCent = dueCent;
			detail.ruleSnapshot.cumulativePaidCent = paidCent;
			detail.ruleSnapshot.cumulativeTargetCent = cumulativeTargetCent;
			detail.ruleSnapshot.generatedBeforeCent = generatedCent;
			return detail;
		}

		return detail;
	}

	async calcCommissionCentByPayment(payment, participant, order = null, options = {}) {
		let detail = await this._calcCommissionDetail(payment, participant, order);
		return options && options.detail ? detail : detail.amountCent;
	}

	async isOrderApproved(orderOrId) {
		let order = orderOrId && typeof orderOrId == 'object' ? orderOrId : await this._getOrder(orderOrId, false);
		if (!order) return false;
		let settle = Number(order.ORDER_SETTLE_STATUS || 0);
		if (settle == WorkOrderModel.SETTLE.REJECT) return false;
		if (settle >= WorkOrderModel.SETTLE.WAIT_PAY) return true;
		return false;
	}

	_commissionGroupKey(payment, participant) {
		return financeConfig.LOCK_PREFIX.COMMISSION_GROUP + this._paymentKey(payment) + ':' + this._participantBizFragment(participant) + ':v' + this._paymentVersion(payment);
	}

	_commissionBizKey(payment, participant, kind) {
		return financeConfig.LOCK_PREFIX.COMMISSION + this._paymentKey(payment) + ':' + this._participantBizFragment(participant) + ':' + kind + ':v' + this._paymentVersion(payment);
	}

	_releaseBizKey(orderId, frozenId) {
		return financeConfig.LOCK_PREFIX.RELEASE + orderId + ':' + frozenId + ':v1';
	}

	_frozenDeductBizKey(refundPayment, refPaymentId, participantId, frozenId) {
		return financeConfig.LOCK_PREFIX.FROZEN_DEDUCT + this._paymentKey(refundPayment) + ':' + (refPaymentId || 'order') + ':' + participantId + ':' + frozenId + ':v' + this._paymentVersion(refundPayment);
	}

	_deductBizKey(refundPayment, refPaymentId, participantId) {
		return financeConfig.LOCK_PREFIX.DEDUCT + this._paymentKey(refundPayment) + ':' + (refPaymentId || 'order') + ':' + participantId + ':v' + this._paymentVersion(refundPayment);
	}

	_manualAdjustBizKey(orderId, staffId, clientKey) {
		return financeConfig.LOCK_PREFIX.ADJUST_COMMISSION + orderId + ':' + staffId + ':' + clientKey;
	}

	_baseCommissionData(order, payment, participant, detail, kind, amountCent, operatorStaff = null, extra = {}) {
		let operator = this._operatorSnapshot(operatorStaff || {});
		let month = extra.month || (payment && payment.PAYMENT_MONTH) || moneyUtil.buildMonth(payment && payment.PAYMENT_DATE) || moneyUtil.buildMonth(timeUtil.time('Y-M-D'));
		month = this._normalizeMonth(month);
		if (!month) this.AppError('提成月份格式错误');

		let frozenTotal = kind == financeConfig.COMMISSION_KIND.FROZEN ? amountCent : 0;
		return {
			COMMISSION_GROUP_ID: extra.groupId || '',
			COMMISSION_PAYMENT_ID: payment ? this._paymentKey(payment) : '',
			COMMISSION_ORDER_ID: order._id,
			COMMISSION_ORDER_NO: order.ORDER_ID || '',
			COMMISSION_PARTICIPANT_ID: participant.participantId,
			COMMISSION_PARTICIPANT_SNAPSHOT: this._participantSnapshot(participant),

			COMMISSION_ORDER_TYPE_NAME: order.ORDER_TYPE_NAME || '',
			COMMISSION_ORDER_DATE: order.ORDER_DATE || '',
			COMMISSION_CUSTOMER_NAME: order.ORDER_CUSTOMER_NAME || '',
			COMMISSION_CUSTOMER_SURNAME: order.ORDER_CUSTOMER_SURNAME || '',
			COMMISSION_PAYMENT_TYPE: payment ? (payment.PAYMENT_TYPE || '') : '',
			COMMISSION_PAYMENT_DATE: payment ? (payment.PAYMENT_DATE || '') : '',

			COMMISSION_STAFF_ID: participant.staffId,
			COMMISSION_STAFF_OPENID: '',
			COMMISSION_STAFF_NAME: participant.staffName,
			COMMISSION_ROLE_NAME: participant.roleName || '',
			COMMISSION_TEAM_ID: participant.teamId || '',
			COMMISSION_TEAM_NAME: participant.teamName || '',

			COMMISSION_KIND: kind,
			COMMISSION_TYPE: kind,
			COMMISSION_MODE: detail.mode || participant.mode || financeConfig.COMMISSION_MODE.NONE,
			COMMISSION_RATE: Number.isFinite(Number(detail.rate)) ? Number(detail.rate) : 0,
			COMMISSION_RULE_SNAPSHOT: detail.ruleSnapshot || this._participantSnapshot(participant),
			COMMISSION_BASE_AMOUNT_CENT: this._safeCent(detail.baseAmountCent, 0),
			COMMISSION_TOTAL_AMOUNT_CENT: this._safeCent(detail.totalAmountCent, Math.abs(amountCent)),
			COMMISSION_AMOUNT_CENT: amountCent,
			COMMISSION_AMOUNT: moneyUtil.centToYuan(amountCent),

			COMMISSION_FROZEN_SOURCE_ID: extra.frozenSourceId || '',
			COMMISSION_FROZEN_TOTAL_CENT: frozenTotal,
			COMMISSION_FROZEN_REMAIN_CENT: frozenTotal,
			COMMISSION_FROZEN_RELEASED_CENT: 0,
			COMMISSION_FROZEN_DEDUCTED_CENT: 0,

			COMMISSION_MONTH: month,
			COMMISSION_RELEASE_MONTH: extra.releaseMonth || '',
			COMMISSION_STATUS: extra.status || (kind == financeConfig.COMMISSION_KIND.FROZEN ? financeConfig.COMMISSION_STATUS.FROZEN : financeConfig.COMMISSION_STATUS.PENDING_PAY),
			COMMISSION_PAYROLL_LOCK_KEY: '',
			COMMISSION_PAYROLL_ID: '',
			COMMISSION_RELEASE_PAYROLL_ID: '',
			COMMISSION_IS_PAYROLL_LOCKED: financeConfig.LOCKED.NO,

			COMMISSION_BIZ_KEY: extra.bizKey || '',
			COMMISSION_SOURCE_TYPE: extra.sourceType || 'payment',
			COMMISSION_SOURCE_ID: extra.sourceId || (payment ? this._paymentKey(payment) : ''),
			COMMISSION_REF_PAYMENT_ID: extra.refPaymentId || '',
			COMMISSION_REF_COMMISSION_ID: extra.refCommissionId || '',

			COMMISSION_NOTE: this._text(extra.note || '', 300),
			COMMISSION_REMARK: this._text(extra.remark || extra.note || '', 300),
			COMMISSION_OPERATOR_STAFF_ID: operator.id,
			COMMISSION_OPERATOR_OPENID: '',
			COMMISSION_OPERATOR_NAME: operator.name,
		};
	}

	async _assertCommissionBizKeySafe(bizKey) {
		let count = await WorkCommissionModel.count({ COMMISSION_BIZ_KEY: bizKey });
		if (count > 1) this.AppError('提成幂等key存在重复，请人工核对：' + bizKey);
	}

	async _insertCommission(data, operatorStaff = null, action = 'CREATE') {
		if (!data || !data.COMMISSION_BIZ_KEY) this.AppError('缺少提成幂等key');
		let exists = await WorkCommissionModel.getOne({ COMMISSION_BIZ_KEY: data.COMMISSION_BIZ_KEY }, '*', { COMMISSION_ADD_TIME: 'desc' });
		if (exists) {
			await this._assertCommissionBizKeySafe(data.COMMISSION_BIZ_KEY);
			return exists;
		}

		let id = await WorkCommissionModel.insert(data);
		let after = await WorkCommissionModel.getOne(id);
		await this._assertCommissionBizKeySafe(data.COMMISSION_BIZ_KEY);
		await this._financeLog.log(action, 'commission', id, null, after, {
			type: financeConfig.FINANCE_LOG_TYPE.COMMISSION,
			source: financeConfig.FINANCE_LOG_SOURCE.SYSTEM,
			operator: operatorStaff,
			bizKey: data.COMMISSION_BIZ_KEY,
		});
		return after;
	}

	async generateByPayment(paymentOrId, operatorStaff = null, options = {}) {
		let payment = await this._getPayment(paymentOrId);
		if (Number(payment.PAYMENT_STATUS || 0) != financeConfig.PAYMENT_STATUS.EFFECTIVE) return [];

		let amountCent = this._safeCent(payment.PAYMENT_AMOUNT_CENT, 0);
		let direction = payment.PAYMENT_DIRECTION || (amountCent < 0 ? financeConfig.PAYMENT_DIRECTION.REFUND : financeConfig.PAYMENT_DIRECTION.INCOME);
		if (direction == financeConfig.PAYMENT_DIRECTION.REFUND || direction == financeConfig.PAYMENT_DIRECTION.ADJUST || amountCent < 0) {
			return await this.deductByRefund(payment, operatorStaff, options);
		}
		if (direction != financeConfig.PAYMENT_DIRECTION.INCOME || amountCent <= 0) return [];

		let order = await this._getOrder(payment.PAYMENT_ORDER_ID);
		let participants = Array.isArray(order.ORDER_PARTICIPANTS) ? order.ORDER_PARTICIPANTS : [];
		let approved = await this.isOrderApproved(order);
		let created = [];

		for (let rawParticipant of participants) {
			let participant = await this._normalizeParticipant(rawParticipant || {});
			if (participant.mode == financeConfig.COMMISSION_MODE.NONE) continue;
			if (!this._participantAppliesToPayment(participant, payment)) continue;

			let detail = await this._calcCommissionDetail(payment, participant, order);
			let totalCent = this._safeCent(detail.amountCent, 0);
			if (totalCent <= 0) continue;

			let groupId = this._commissionGroupKey(payment, participant);
			let split = approved ? { currentCent: totalCent, frozenCent: 0 } : moneyUtil.splitByRatio(totalCent, FROZEN_CURRENT_NUMERATOR, FROZEN_CURRENT_DENOMINATOR);
			let currentCent = approved ? totalCent : split.firstCent;
			let frozenCent = approved ? 0 : split.secondCent;

			if (currentCent > 0) {
				let data = this._baseCommissionData(order, payment, participant, detail, financeConfig.COMMISSION_KIND.CURRENT, currentCent, operatorStaff, {
					groupId,
					bizKey: this._commissionBizKey(payment, participant, financeConfig.COMMISSION_KIND.CURRENT),
					note: approved ? '订单已审核/完成，新增收款100%计入当月提成' : '订单未审核，收款提成70%计入当月',
				});
				created.push(await this._insertCommission(data, operatorStaff, 'CREATE_CURRENT'));
			}

			if (frozenCent > 0) {
				let data = this._baseCommissionData(order, payment, participant, detail, financeConfig.COMMISSION_KIND.FROZEN, frozenCent, operatorStaff, {
					groupId,
					bizKey: this._commissionBizKey(payment, participant, financeConfig.COMMISSION_KIND.FROZEN),
					note: '订单未审核，收款提成30%冻结，审核后仅释放剩余未扣部分',
				});
				created.push(await this._insertCommission(data, operatorStaff, 'CREATE_FROZEN'));
			}
		}

		await this.refreshOrderCommissionStatus(order._id, { operatorStaff });
		return created;
	}

	async _buildParticipantFromCommission(commission) {
		commission = commission || {};
		let snapshot = commission.COMMISSION_PARTICIPANT_SNAPSHOT || {};
		return {
			participantId: commission.COMMISSION_PARTICIPANT_ID || snapshot.participantId || commission.COMMISSION_STAFF_ID || '',
			staffId: commission.COMMISSION_STAFF_ID || snapshot.staffId || '',
			staffOpenid: '',
			staffName: commission.COMMISSION_STAFF_NAME || snapshot.staffName || '',
			roleName: commission.COMMISSION_ROLE_NAME || snapshot.roleName || '',
			teamId: commission.COMMISSION_TEAM_ID || snapshot.teamId || '',
			teamName: commission.COMMISSION_TEAM_NAME || snapshot.teamName || '',
			mode: commission.COMMISSION_MODE || snapshot.mode || financeConfig.COMMISSION_MODE.NONE,
			rateRaw: commission.COMMISSION_RATE || snapshot.rate || 0,
			rateBps: snapshot.rateBps || this._rateToBps(commission.COMMISSION_RATE || snapshot.rate || 0),
			targetCent: snapshot.targetCent || 0,
			baseType: snapshot.baseType || financeConfig.PAYMENT_BASE_TYPE.ALL,
		};
	}

	async _getPaymentByRefIdForOrder(orderId, refPaymentId) {
		refPaymentId = this._text(refPaymentId || '', 120);
		if (!refPaymentId) return null;
		let payment = await WorkPaymentModel.getOne({
			PAYMENT_ORDER_ID: orderId,
			_id: refPaymentId,
		});
		if (!payment) {
			payment = await WorkPaymentModel.getOne({
				PAYMENT_ORDER_ID: orderId,
				PAYMENT_ID: refPaymentId,
			});
		}
		return payment;
	}

	async _getSourcePaymentForRefund(refundPayment) {
		let refPaymentId = this._text(refundPayment.PAYMENT_REF_PAYMENT_ID || '', 120);
		if (!refPaymentId) return null;
		let source = await this._getPaymentByRefIdForOrder(refundPayment.PAYMENT_ORDER_ID, refPaymentId);
		if (!source) this.AppError('退款/冲减引用的原收款不存在');
		return source;
	}

	async _getOriginalIncomeCommissions(orderId, sourcePayment = null) {
		let where = {
			COMMISSION_ORDER_ID: orderId,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
		};
		let list = await WorkCommissionModel.getAll(where, '*', { COMMISSION_ADD_TIME: 'asc' }, 1000);
		if (sourcePayment) {
			let refKeys = this._paymentRefKeys(sourcePayment);
			list = list.filter(item => refKeys.includes(this._text(item.COMMISSION_PAYMENT_ID || '', 120)));
		}
		return list.filter(item => INCOME_COMMISSION_KINDS.includes(item.COMMISSION_KIND) && this._safeCent(item.COMMISSION_AMOUNT_CENT, 0) > 0);
	}

	_groupOriginalCommissionsByParticipant(commissions) {
		let map = {};
		for (let item of commissions) {
			let key = item.COMMISSION_PARTICIPANT_ID || item.COMMISSION_STAFF_ID || '';
			if (!key) continue;
			if (!map[key]) map[key] = { participantId: key, totalCent: 0, items: [] };
			map[key].totalCent += this._safeCent(item.COMMISSION_AMOUNT_CENT, 0);
			map[key].items.push(item);
		}
		return Object.keys(map).map(key => map[key]);
	}

	async _sumEffectiveIncomeCent(orderId, baseType = financeConfig.PAYMENT_BASE_TYPE.ALL) {
		let payments = await WorkPaymentModel.getAll({
			PAYMENT_ORDER_ID: orderId,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
			PAYMENT_DIRECTION: financeConfig.PAYMENT_DIRECTION.INCOME,
		}, '*', { PAYMENT_DATE: 'asc', PAYMENT_ADD_TIME: 'asc' }, 1000);

		let totalCent = 0;
		for (let payment of payments) {
			if (!this._paymentBaseMatches(baseType, payment.PAYMENT_BASE_TYPE)) continue;
			let cent = this._safeCent(payment.PAYMENT_AMOUNT_CENT, 0);
			if (cent > 0) totalCent += cent;
		}
		return totalCent;
	}

	async _sumRefundAbsForSource(refundPayment, sourcePayment) {
		let currentRefundId = this._paymentKey(refundPayment);
		let currentAbs = Math.abs(this._safeCent(refundPayment.PAYMENT_AMOUNT_CENT, 0));
		if (!sourcePayment) {
			let payments = await WorkPaymentModel.getAll({
				PAYMENT_ORDER_ID: refundPayment.PAYMENT_ORDER_ID,
				PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
			}, '*', { PAYMENT_DATE: 'asc', PAYMENT_ADD_TIME: 'asc' }, 1000);
			let total = 0;
			let hasCurrent = false;
			for (let payment of payments) {
				let direction = payment.PAYMENT_DIRECTION || '';
				let cent = this._safeCent(payment.PAYMENT_AMOUNT_CENT, 0);
				if (payment.PAYMENT_REF_PAYMENT_ID) continue;
				if (direction != financeConfig.PAYMENT_DIRECTION.REFUND && direction != financeConfig.PAYMENT_DIRECTION.ADJUST && cent >= 0) continue;
				if (this._paymentKey(payment) == currentRefundId) hasCurrent = true;
				total += Math.abs(cent);
			}
			if (!hasCurrent) total += currentAbs;
			return total;
		}

		let refKeys = this._paymentRefKeys(sourcePayment);
		let payments = await WorkPaymentModel.getAll({
			PAYMENT_ORDER_ID: refundPayment.PAYMENT_ORDER_ID,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		}, '*', { PAYMENT_DATE: 'asc', PAYMENT_ADD_TIME: 'asc' }, 1000);
		let total = 0;
		let hasCurrent = false;
		for (let payment of payments) {
			if (!refKeys.includes(this._text(payment.PAYMENT_REF_PAYMENT_ID || '', 120))) continue;
			let direction = payment.PAYMENT_DIRECTION || '';
			let cent = this._safeCent(payment.PAYMENT_AMOUNT_CENT, 0);
			if (direction != financeConfig.PAYMENT_DIRECTION.REFUND && direction != financeConfig.PAYMENT_DIRECTION.ADJUST && cent >= 0) continue;
			if (this._paymentKey(payment) == currentRefundId) hasCurrent = true;
			total += Math.abs(cent);
		}
		if (!hasCurrent) total += currentAbs;
		return total;
	}

	async _sumExistingDeductForParticipant(refundPayment, sourcePayment, participantId) {
		let sourceKeys = sourcePayment ? this._paymentRefKeys(sourcePayment) : [];
		let where = {
			COMMISSION_ORDER_ID: refundPayment.PAYMENT_ORDER_ID,
			COMMISSION_PARTICIPANT_ID: participantId,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
		};
		let list = await WorkCommissionModel.getAll(where, '*', { COMMISSION_ADD_TIME: 'asc' }, 1000);
		let total = 0;
		for (let item of list) {
			if (![financeConfig.COMMISSION_KIND.DEDUCT, financeConfig.COMMISSION_KIND.FROZEN_DEDUCT].includes(item.COMMISSION_KIND)) continue;
			let refPaymentId = this._text(item.COMMISSION_REF_PAYMENT_ID || '', 120);
			if (sourcePayment) {
				if (!sourceKeys.includes(refPaymentId)) continue;
			} else if (this._hasValue(refPaymentId)) {
				continue;
			}
			total += Math.abs(this._safeCent(item.COMMISSION_AMOUNT_CENT, 0));
		}
		return total;
	}

	async _getFrozenCandidates(orderId, participantId, sourcePayment = null) {
		let where = {
			COMMISSION_ORDER_ID: orderId,
			COMMISSION_PARTICIPANT_ID: participantId,
			COMMISSION_KIND: financeConfig.COMMISSION_KIND.FROZEN,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
			COMMISSION_FROZEN_REMAIN_CENT: ['>', 0],
		};

		let list = await WorkCommissionModel.getAll(where, '*', { COMMISSION_PAYMENT_DATE: 'asc', COMMISSION_ADD_TIME: 'asc' }, 1000);
		if (sourcePayment) {
			let refKeys = this._paymentRefKeys(sourcePayment);
			list = list.filter(item => refKeys.includes(this._text(item.COMMISSION_PAYMENT_ID || '', 120)));
		}
		return list;
	}

	async _applyFrozenUsage(frozen, useCent, fieldName) {
		useCent = this._safeCent(useCent, 0);
		if (useCent <= 0) return frozen;
		let remain = this._safeCent(frozen.COMMISSION_FROZEN_REMAIN_CENT, 0);
		if (remain < useCent) this.AppError('冻结提成剩余不足，请刷新后重试');

		let oldReleased = this._safeCent(frozen.COMMISSION_FROZEN_RELEASED_CENT, 0);
		let oldDeducted = this._safeCent(frozen.COMMISSION_FROZEN_DEDUCTED_CENT, 0);
		let released = oldReleased;
		let deducted = oldDeducted;
		if (fieldName == 'release') released += useCent;
		else deducted += useCent;
		remain -= useCent;

		let status = remain > 0 ? financeConfig.COMMISSION_STATUS.PART_USED : financeConfig.COMMISSION_STATUS.USED;
		let updated = await WorkCommissionModel.edit({
			_id: frozen._id,
			COMMISSION_KIND: financeConfig.COMMISSION_KIND.FROZEN,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
			COMMISSION_FROZEN_REMAIN_CENT: this._safeCent(frozen.COMMISSION_FROZEN_REMAIN_CENT, 0),
			COMMISSION_FROZEN_RELEASED_CENT: oldReleased,
			COMMISSION_FROZEN_DEDUCTED_CENT: oldDeducted,
		}, {
			COMMISSION_FROZEN_REMAIN_CENT: remain,
			COMMISSION_FROZEN_RELEASED_CENT: released,
			COMMISSION_FROZEN_DEDUCTED_CENT: deducted,
			COMMISSION_STATUS: status,
		});
		if (updated != 1) this.AppError('冻结提成更新失败，请刷新后重试');
		return await WorkCommissionModel.getOne(frozen._id);
	}

	async _rollbackFrozenUsage(frozen, useCent, fieldName) {
		useCent = this._safeCent(useCent, 0);
		if (!frozen || useCent <= 0) return;
		let latest = await WorkCommissionModel.getOne(frozen._id);
		if (!latest) return;
		let remain = this._safeCent(latest.COMMISSION_FROZEN_REMAIN_CENT, 0) + useCent;
		let released = this._safeCent(latest.COMMISSION_FROZEN_RELEASED_CENT, 0);
		let deducted = this._safeCent(latest.COMMISSION_FROZEN_DEDUCTED_CENT, 0);
		if (fieldName == 'release') released = Math.max(0, released - useCent);
		else deducted = Math.max(0, deducted - useCent);
		let status = remain > 0 ? financeConfig.COMMISSION_STATUS.PART_USED : financeConfig.COMMISSION_STATUS.USED;
		if (released <= 0 && deducted <= 0) status = financeConfig.COMMISSION_STATUS.FROZEN;
		await WorkCommissionModel.edit({
			_id: latest._id,
			COMMISSION_KIND: financeConfig.COMMISSION_KIND.FROZEN,
			COMMISSION_FROZEN_REMAIN_CENT: latest.COMMISSION_FROZEN_REMAIN_CENT,
			COMMISSION_FROZEN_RELEASED_CENT: latest.COMMISSION_FROZEN_RELEASED_CENT,
			COMMISSION_FROZEN_DEDUCTED_CENT: latest.COMMISSION_FROZEN_DEDUCTED_CENT,
		}, {
			COMMISSION_FROZEN_REMAIN_CENT: remain,
			COMMISSION_FROZEN_RELEASED_CENT: released,
			COMMISSION_FROZEN_DEDUCTED_CENT: deducted,
			COMMISSION_STATUS: status,
		});
	}

	async _getCommissionByAnyId(commissionId) {
		commissionId = this._text(commissionId || '', 120);
		if (!commissionId) return null;
		let commission = await WorkCommissionModel.getOne(commissionId);
		if (!commission) commission = await WorkCommissionModel.getOne({ COMMISSION_ID: commissionId });
		return commission;
	}

	_commissionRefKeys(commission) {
		let keys = [];
		commission = commission || {};
		for (let value of [commission._id, commission.COMMISSION_ID, this._commissionKey(commission)]) {
			let key = this._text(value || '', 120);
			if (key && !keys.includes(key)) keys.push(key);
		}
		return keys;
	}

	async _sumReleaseEventCent(frozen) {
		let frozenKeys = this._commissionRefKeys(frozen);
		if (!frozenKeys.length) return 0;
		let list = await WorkCommissionModel.getAll({
			COMMISSION_ORDER_ID: frozen.COMMISSION_ORDER_ID,
			COMMISSION_PARTICIPANT_ID: frozen.COMMISSION_PARTICIPANT_ID,
			COMMISSION_KIND: financeConfig.COMMISSION_KIND.RELEASE,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
		}, '*', { COMMISSION_ADD_TIME: 'asc' }, 1000);

		let total = 0;
		for (let item of list) {
			let frozenSourceId = this._text(item.COMMISSION_FROZEN_SOURCE_ID || item.COMMISSION_REF_COMMISSION_ID || '', 120);
			if (!frozenKeys.includes(frozenSourceId)) continue;
			if (Number(item.COMMISSION_STATUS || 0) == financeConfig.COMMISSION_STATUS.VOID) continue;
			total += Math.abs(this._safeCent(item.COMMISSION_AMOUNT_CENT, 0));
		}
		return total;
	}

	async _ensureReleaseEventsApplied(frozen) {
		let latest = await WorkCommissionModel.getOne(frozen._id);
		if (!latest) this.AppError('冻结提成不存在，请刷新后重试');
		let eventReleaseCent = await this._sumReleaseEventCent(latest);
		let appliedReleaseCent = this._safeCent(latest.COMMISSION_FROZEN_RELEASED_CENT, 0);
		let missingCent = eventReleaseCent - appliedReleaseCent;
		if (missingCent <= 0) return latest;
		return await this._applyFrozenUsage(latest, missingCent, 'release');
	}

	async _sumFrozenDeductEventCent(frozen) {
		let frozenKeys = this._commissionRefKeys(frozen);
		if (!frozenKeys.length) return 0;
		let list = await WorkCommissionModel.getAll({
			COMMISSION_ORDER_ID: frozen.COMMISSION_ORDER_ID,
			COMMISSION_PARTICIPANT_ID: frozen.COMMISSION_PARTICIPANT_ID,
			COMMISSION_KIND: financeConfig.COMMISSION_KIND.FROZEN_DEDUCT,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
		}, '*', { COMMISSION_ADD_TIME: 'asc' }, 1000);

		let total = 0;
		for (let item of list) {
			let frozenSourceId = this._text(item.COMMISSION_FROZEN_SOURCE_ID || item.COMMISSION_REF_COMMISSION_ID || '', 120);
			if (!frozenKeys.includes(frozenSourceId)) continue;
			if (Number(item.COMMISSION_STATUS || 0) == financeConfig.COMMISSION_STATUS.VOID) continue;
			total += Math.abs(this._safeCent(item.COMMISSION_AMOUNT_CENT, 0));
		}
		return total;
	}

	async _ensureFrozenDeductEventsApplied(frozen) {
		let latest = await WorkCommissionModel.getOne(frozen._id);
		if (!latest) this.AppError('冻结提成不存在，请刷新后重试');
		let eventDeductCent = await this._sumFrozenDeductEventCent(latest);
		let appliedDeductCent = this._safeCent(latest.COMMISSION_FROZEN_DEDUCTED_CENT, 0);
		let missingCent = eventDeductCent - appliedDeductCent;
		if (missingCent <= 0) return latest;
		return await this._applyFrozenUsage(latest, missingCent, 'deduct');
	}

	async _getExistingFrozenDeductsForRefund(refundPayment, sourcePayment, participantId) {
		let refundKeys = this._paymentRefKeys(refundPayment);
		let sourceKeys = sourcePayment ? this._paymentRefKeys(sourcePayment) : [];
		let list = await WorkCommissionModel.getAll({
			COMMISSION_ORDER_ID: refundPayment.PAYMENT_ORDER_ID,
			COMMISSION_PARTICIPANT_ID: participantId,
			COMMISSION_KIND: financeConfig.COMMISSION_KIND.FROZEN_DEDUCT,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
		}, '*', { COMMISSION_ADD_TIME: 'asc' }, 1000);

		return list.filter(item => {
			let paymentId = this._text(item.COMMISSION_PAYMENT_ID || '', 120);
			let sourceId = this._text(item.COMMISSION_SOURCE_ID || '', 120);
			if (!refundKeys.includes(paymentId) && !refundKeys.includes(sourceId)) return false;

			let refPaymentId = this._text(item.COMMISSION_REF_PAYMENT_ID || '', 120);
			if (sourcePayment) return sourceKeys.includes(refPaymentId);
			return !this._hasValue(refPaymentId);
		});
	}

	async _ensureExistingFrozenDeductsAppliedForRefund(refundPayment, sourcePayment, participantId) {
		let existing = await this._getExistingFrozenDeductsForRefund(refundPayment, sourcePayment, participantId);
		for (let item of existing) {
			let frozenId = this._text(item.COMMISSION_FROZEN_SOURCE_ID || item.COMMISSION_REF_COMMISSION_ID || '', 120);
			if (!frozenId) this.AppError('冻结扣回缺少来源冻结提成，请人工核对');
			let frozen = await this._getCommissionByAnyId(frozenId);
			if (!frozen) this.AppError('冻结扣回引用的来源冻结提成不存在，请人工核对');
			if (frozen.COMMISSION_KIND != financeConfig.COMMISSION_KIND.FROZEN) this.AppError('冻结扣回引用的来源不是冻结提成，请人工核对');
			await this._ensureFrozenDeductEventsApplied(frozen);
		}
		return existing;
	}

	async _createFrozenDeduct(refundPayment, order, participant, frozen, deductCent, sourcePayment, operatorStaff = null) {
		let bizKey = this._frozenDeductBizKey(refundPayment, sourcePayment ? this._paymentKey(sourcePayment) : '', participant.participantId, this._commissionKey(frozen));
		let exists = await WorkCommissionModel.getOne({ COMMISSION_BIZ_KEY: bizKey });
		if (exists) {
			await this._ensureFrozenDeductEventsApplied(frozen);
			return exists;
		}

		let detail = {
			mode: frozen.COMMISSION_MODE || participant.mode || financeConfig.COMMISSION_MODE.NONE,
			rate: frozen.COMMISSION_RATE || 0,
			baseAmountCent: Math.abs(this._safeCent(refundPayment.PAYMENT_AMOUNT_CENT, 0)),
			totalAmountCent: deductCent,
			ruleSnapshot: Object.assign({}, frozen.COMMISSION_RULE_SNAPSHOT || {}, { refundPaymentId: this._paymentKey(refundPayment), frozenSourceId: this._commissionKey(frozen) }),
		};
		let data = this._baseCommissionData(order, refundPayment, participant, detail, financeConfig.COMMISSION_KIND.FROZEN_DEDUCT, -deductCent, operatorStaff, {
			bizKey,
			groupId: frozen.COMMISSION_GROUP_ID || '',
			frozenSourceId: this._commissionKey(frozen),
			refPaymentId: sourcePayment ? this._paymentKey(sourcePayment) : '',
			refCommissionId: this._commissionKey(frozen),
			sourceType: 'refund_frozen_deduct',
			sourceId: this._paymentKey(refundPayment),
			status: financeConfig.COMMISSION_STATUS.DEDUCTED,
			note: '退款/冲减优先扣减冻结剩余提成，不进入工资',
		});
		data.COMMISSION_FROZEN_TOTAL_CENT = 0;
		data.COMMISSION_FROZEN_REMAIN_CENT = 0;
		data.COMMISSION_FROZEN_DEDUCTED_CENT = deductCent;
		let applied = await this._applyFrozenUsage(frozen, deductCent, 'deduct');
		try {
			return await this._insertCommission(data, operatorStaff, 'CREATE_FROZEN_DEDUCT');
		} catch (err) {
			await this._rollbackFrozenUsage(applied || frozen, deductCent, 'deduct');
			throw err;
		}
	}

	async _createPayrollDeduct(refundPayment, order, participant, deductCent, sourcePayment, operatorStaff = null) {
		let bizKey = this._deductBizKey(refundPayment, sourcePayment ? this._paymentKey(sourcePayment) : '', participant.participantId);
		let exists = await WorkCommissionModel.getOne({ COMMISSION_BIZ_KEY: bizKey });
		if (exists) return exists;

		let detail = {
			mode: participant.mode || financeConfig.COMMISSION_MODE.NONE,
			rate: participant.rateRaw || 0,
			baseAmountCent: Math.abs(this._safeCent(refundPayment.PAYMENT_AMOUNT_CENT, 0)),
			totalAmountCent: deductCent,
			ruleSnapshot: Object.assign({}, this._participantSnapshot(participant), { refundPaymentId: this._paymentKey(refundPayment) }),
		};
		let data = this._baseCommissionData(order, refundPayment, participant, detail, financeConfig.COMMISSION_KIND.DEDUCT, -deductCent, operatorStaff, {
			bizKey,
			refPaymentId: sourcePayment ? this._paymentKey(sourcePayment) : '',
			sourceType: 'refund_deduct',
			sourceId: this._paymentKey(refundPayment),
			status: financeConfig.COMMISSION_STATUS.PENDING_PAY,
			note: '退款/冲减超过可扣冻结部分，负数进入当月工资',
		});
		return await this._insertCommission(data, operatorStaff, 'CREATE_DEDUCT');
	}

	async deductByRefund(paymentOrId, operatorStaff = null, options = {}) {
		let refundPayment = await this._getPayment(paymentOrId);
		if (Number(refundPayment.PAYMENT_STATUS || 0) != financeConfig.PAYMENT_STATUS.EFFECTIVE) return [];

		let refundCent = this._safeCent(refundPayment.PAYMENT_AMOUNT_CENT, 0);
		let direction = refundPayment.PAYMENT_DIRECTION || '';
		if (direction != financeConfig.PAYMENT_DIRECTION.REFUND && direction != financeConfig.PAYMENT_DIRECTION.ADJUST && refundCent >= 0) return [];
		if (Math.abs(refundCent) <= 0) return [];

		let order = await this._getOrder(refundPayment.PAYMENT_ORDER_ID);
		let sourcePayment = await this._getSourcePaymentForRefund(refundPayment);
		let sourcePaymentAmountCent = 0;
		if (sourcePayment) {
			sourcePaymentAmountCent = Math.abs(this._safeCent(sourcePayment.PAYMENT_AMOUNT_CENT, 0));
			if (sourcePaymentAmountCent <= 0) this.AppError('退款/冲减引用的原收款金额必须大于0');
		}
		let originalCommissions = await this._getOriginalIncomeCommissions(order._id, sourcePayment);
		if (!originalCommissions.length && sourcePayment) return [];
		if (!originalCommissions.length) originalCommissions = await this._getOriginalIncomeCommissions(order._id, null);

		let originalIncomeTotalCent = sourcePayment ? sourcePaymentAmountCent : await this._sumEffectiveIncomeCent(order._id, financeConfig.PAYMENT_BASE_TYPE.ALL);
		let cumulativeRefundAbs = await this._sumRefundAbsForSource(refundPayment, sourcePayment);
		let groups = this._groupOriginalCommissionsByParticipant(originalCommissions);
		let created = [];

		for (let group of groups) {
			let firstCommission = group.items[0];
			let participant = await this._buildParticipantFromCommission(firstCommission);
			await this._ensureExistingFrozenDeductsAppliedForRefund(refundPayment, sourcePayment, group.participantId);
			let targetCumulativeDeduct = 0;
			if (originalIncomeTotalCent > 0) {
				targetCumulativeDeduct = Math.floor(group.totalCent * Math.min(cumulativeRefundAbs, originalIncomeTotalCent) / originalIncomeTotalCent);
			}

			let alreadyDeducted = await this._sumExistingDeductForParticipant(refundPayment, sourcePayment, group.participantId);
			let needDeductCent = Math.max(0, targetCumulativeDeduct - alreadyDeducted);
			if (needDeductCent <= 0) continue;

			let frozenList = await this._getFrozenCandidates(order._id, group.participantId, sourcePayment);
			for (let frozen of frozenList) {
				if (needDeductCent <= 0) break;
				let remain = this._safeCent(frozen.COMMISSION_FROZEN_REMAIN_CENT, 0);
				if (remain <= 0) continue;
				let useCent = Math.min(remain, needDeductCent);
				created.push(await this._createFrozenDeduct(refundPayment, order, participant, frozen, useCent, sourcePayment, operatorStaff));
				needDeductCent -= useCent;
			}

			if (needDeductCent > 0) {
				created.push(await this._createPayrollDeduct(refundPayment, order, participant, needDeductCent, sourcePayment, operatorStaff));
			}
		}

		await this.refreshOrderCommissionStatus(order._id, { operatorStaff });
		return created;
	}

	async releaseFrozenByOrder(orderId, operatorStaff = null, options = {}) {
		let order = await this._getOrder(orderId);
		if (!await this.isOrderApproved(order)) this.AppError('订单未审核通过，不能释放冻结提成');

		let releaseMonth = this._normalizeMonth(options.month || moneyUtil.buildMonth(order.ORDER_AUDIT_TIME) || timeUtil.time('Y-M-D'));
		if (!releaseMonth) releaseMonth = moneyUtil.buildMonth(timeUtil.time('Y-M-D'));

		let frozenList = await WorkCommissionModel.getAll({
			COMMISSION_ORDER_ID: order._id,
			COMMISSION_KIND: financeConfig.COMMISSION_KIND.FROZEN,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
			COMMISSION_FROZEN_REMAIN_CENT: ['>', 0],
		}, '*', { COMMISSION_PAYMENT_DATE: 'asc', COMMISSION_ADD_TIME: 'asc' }, 1000);

		let created = [];
		for (let frozen of frozenList) {
			frozen = await this._ensureFrozenDeductEventsApplied(frozen);
			let releaseCent = this._safeCent(frozen.COMMISSION_FROZEN_REMAIN_CENT, 0);
			if (releaseCent <= 0) continue;

			let bizKey = this._releaseBizKey(order._id, this._commissionKey(frozen));
			let existing = await WorkCommissionModel.getOne({ COMMISSION_BIZ_KEY: bizKey });
			if (existing) {
				await this._ensureReleaseEventsApplied(frozen);
				created.push(existing);
				continue;
			}

			let participant = await this._buildParticipantFromCommission(frozen);
			let detail = {
				mode: frozen.COMMISSION_MODE || participant.mode,
				rate: frozen.COMMISSION_RATE || 0,
				baseAmountCent: this._safeCent(frozen.COMMISSION_BASE_AMOUNT_CENT, 0),
				totalAmountCent: releaseCent,
				ruleSnapshot: Object.assign({}, frozen.COMMISSION_RULE_SNAPSHOT || {}, { frozenSourceId: this._commissionKey(frozen), releaseMonth }),
			};
			let pseudoPayment = {
				_id: frozen.COMMISSION_PAYMENT_ID || '',
				PAYMENT_ID: frozen.COMMISSION_PAYMENT_ID || '',
				PAYMENT_TYPE: frozen.COMMISSION_PAYMENT_TYPE || '',
				PAYMENT_DATE: frozen.COMMISSION_PAYMENT_DATE || '',
				PAYMENT_MONTH: releaseMonth,
			};
			let data = this._baseCommissionData(order, pseudoPayment, participant, detail, financeConfig.COMMISSION_KIND.RELEASE, releaseCent, operatorStaff, {
				bizKey,
				groupId: frozen.COMMISSION_GROUP_ID || '',
				frozenSourceId: this._commissionKey(frozen),
				refCommissionId: this._commissionKey(frozen),
				sourceType: 'order_release',
				sourceId: order._id,
				month: releaseMonth,
				releaseMonth,
				note: '订单审核通过，释放冻结剩余提成',
			});
			data.COMMISSION_PAYMENT_ID = frozen.COMMISSION_PAYMENT_ID || '';
			let applied = await this._applyFrozenUsage(frozen, releaseCent, 'release');
			try {
				let release = await this._insertCommission(data, operatorStaff, 'CREATE_RELEASE');
				created.push(release);
			} catch (err) {
				await this._rollbackFrozenUsage(applied || frozen, releaseCent, 'release');
				throw err;
			}
		}

		await this.refreshOrderCommissionStatus(order._id, { operatorStaff });
		return created;
	}

	async createManualAdjust(orderId, params = {}, operatorStaff = null) {
		if (arguments.length == 1 && orderId && typeof orderId == 'object') {
			params = orderId;
			orderId = params.orderId || params.ORDER_ID || params.COMMISSION_ORDER_ID;
		}
		params = params || {};
		let order = await this._getOrder(orderId || params.orderId || params.COMMISSION_ORDER_ID);
		let staffId = this._text(params.staffId || params.STAFF_ID || params.COMMISSION_STAFF_ID || params.participantId || '', 120);
		let staff = await this._getStaff(staffId);
		let cent = this._resolveCentInput(params, ['amountCent', 'COMMISSION_AMOUNT_CENT'], ['amount', 'COMMISSION_AMOUNT'], true);
		if (cent == 0) this.AppError('人工调整金额不能为0');

		let clientKey = this._text(params.clientKey || params.COMMISSION_CLIENT_KEY || params.bizClientKey || '', 120);
		if (!clientKey) clientKey = 'manual:' + dataUtil.makeID();
		let bizKey = this._text(params.bizKey || params.COMMISSION_BIZ_KEY || '', 180) || this._manualAdjustBizKey(order._id, staff._id, clientKey);
		let month = this._normalizeMonth(params.month || params.COMMISSION_MONTH || params.date || timeUtil.time('Y-M-D'));
		let participant = {
			participantId: this._text(params.participantId || params.COMMISSION_PARTICIPANT_ID || staff._id, 120),
			staffId: staff._id,
			staffOpenid: '',
			staffName: staff.STAFF_NAME || '',
			roleName: this._text(params.roleName || params.COMMISSION_ROLE_NAME || '人工调整', 80),
			teamId: staff.STAFF_TEAM_ID || '',
			teamName: staff.STAFF_TEAM_NAME || '',
			mode: financeConfig.COMMISSION_MODE.MANUAL,
			rateRaw: 0,
			rateBps: 0,
			targetCent: Math.abs(cent),
			baseType: financeConfig.PAYMENT_BASE_TYPE.ALL,
		};
		let detail = {
			mode: financeConfig.COMMISSION_MODE.MANUAL,
			rate: 0,
			baseAmountCent: 0,
			totalAmountCent: Math.abs(cent),
			ruleSnapshot: Object.assign(this._participantSnapshot(participant), { manualClientKey: clientKey }),
		};
		let data = this._baseCommissionData(order, null, participant, detail, financeConfig.COMMISSION_KIND.ADJUST, cent, operatorStaff, {
			bizKey,
			sourceType: 'manual_adjust',
			sourceId: clientKey,
			month,
			note: params.note || params.remark || '人工提成调整',
		});
		let created = await this._insertCommission(data, operatorStaff, 'CREATE_ADJUST');
		await this.refreshOrderCommissionStatus(order._id, { operatorStaff });
		return created;
	}

	_canVoidInPlace(commission) {
		if (!commission) return false;
		if (Number(commission.COMMISSION_STATUS || 0) == financeConfig.COMMISSION_STATUS.VOID) return true;
		if (Number(commission.COMMISSION_IS_PAYROLL_LOCKED || 0) == financeConfig.LOCKED.YES) return false;
		if (commission.COMMISSION_PAYROLL_ID || commission.COMMISSION_PAYROLL_LOCK_KEY || commission.COMMISSION_RELEASE_PAYROLL_ID) return false;
		let status = Number(commission.COMMISSION_STATUS || 0);
		if (status == financeConfig.COMMISSION_STATUS.IN_PAYROLL || status == financeConfig.COMMISSION_STATUS.PAID) return false;
		if (commission.COMMISSION_KIND == financeConfig.COMMISSION_KIND.FROZEN) {
			return this._safeCent(commission.COMMISSION_FROZEN_RELEASED_CENT, 0) == 0 && this._safeCent(commission.COMMISSION_FROZEN_DEDUCTED_CENT, 0) == 0;
		}
		if (commission.COMMISSION_KIND == financeConfig.COMMISSION_KIND.RELEASE) return false;
		if (commission.COMMISSION_KIND == financeConfig.COMMISSION_KIND.FROZEN_DEDUCT) return false;
		return true;
	}

	_canCreateVoidOffsetAdjust(commission) {
		if (!commission) return false;
		let amountCent = this._safeCent(commission.COMMISSION_AMOUNT_CENT, 0);
		return amountCent != 0 && PAYROLL_KINDS.includes(commission.COMMISSION_KIND);
	}

	_buildVoidBlockedItem(commission, paymentId = '') {
		commission = commission || {};
		let status = Number(commission.COMMISSION_STATUS || 0);
		let kind = commission.COMMISSION_KIND || '';
		let reason = '该提成记录不能安全原地作废，且当前版本无法生成可靠反向调整';

		if (Number(commission.COMMISSION_IS_PAYROLL_LOCKED || 0) == financeConfig.LOCKED.YES) {
			reason = '该提成已被工资单锁定，不能原地作废';
		} else if (commission.COMMISSION_PAYROLL_ID || commission.COMMISSION_PAYROLL_LOCK_KEY || commission.COMMISSION_RELEASE_PAYROLL_ID) {
			reason = '该提成已有工资单/发放锁定引用，不能原地作废';
		} else if (status == financeConfig.COMMISSION_STATUS.IN_PAYROLL || status == financeConfig.COMMISSION_STATUS.PAID) {
			reason = '该提成已进入工资或已发放，不能原地作废';
		} else if (kind == financeConfig.COMMISSION_KIND.FROZEN) {
			let releasedCent = this._safeCent(commission.COMMISSION_FROZEN_RELEASED_CENT, 0);
			let deductedCent = this._safeCent(commission.COMMISSION_FROZEN_DEDUCTED_CENT, 0);
			if (releasedCent > 0 || deductedCent > 0) {
				reason = '冻结提成已释放' + releasedCent + '分/已扣回' + deductedCent + '分，v1.2.0暂未实现完整反向链路';
			} else {
				reason = '冻结提成当前状态不能安全原地作废';
			}
		} else if (kind == financeConfig.COMMISSION_KIND.RELEASE) {
			reason = '冻结释放事件不能原地作废，需先实现冻结释放反向链路';
		} else if (kind == financeConfig.COMMISSION_KIND.FROZEN_DEDUCT) {
			reason = '冻结扣回事件不能原地作废，需先实现冻结扣回反向链路';
		} else if (!this._canCreateVoidOffsetAdjust(commission)) {
			reason = '该记录不是可反向调整的工资类提成，或金额为0，不能安全自动处理';
		}

		return {
			commissionId: this._commissionKey(commission),
			paymentId: paymentId || this._text(commission.COMMISSION_PAYMENT_ID || '', 120),
			orderId: this._text(commission.COMMISSION_ORDER_ID || '', 120),
			kind,
			status,
			reason,
		};
	}

	async _voidCommissionInPlace(commission, reason = '', operatorStaff = null) {
		if (Number(commission.COMMISSION_STATUS || 0) == financeConfig.COMMISSION_STATUS.VOID) return commission;
		let before = commission;
		let data = {
			COMMISSION_STATUS: financeConfig.COMMISSION_STATUS.VOID,
			COMMISSION_NOTE: this._text(reason || commission.COMMISSION_NOTE || '作废提成', 300),
			COMMISSION_REMARK: this._text(reason || commission.COMMISSION_REMARK || '作废提成', 300),
		};
		if (commission.COMMISSION_KIND == financeConfig.COMMISSION_KIND.FROZEN) data.COMMISSION_FROZEN_REMAIN_CENT = 0;
		let updated = await WorkCommissionModel.edit({
			_id: commission._id,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
		}, data);
		if (updated != 1) {
			let latest = await WorkCommissionModel.getOne(commission._id);
			if (latest && Number(latest.COMMISSION_STATUS || 0) == financeConfig.COMMISSION_STATUS.VOID) return latest;
			this.AppError('提成作废失败，请刷新后重试');
		}
		let after = await WorkCommissionModel.getOne(commission._id);
		await this._financeLog.log('VOID', 'commission', commission._id, before, after, {
			type: financeConfig.FINANCE_LOG_TYPE.COMMISSION,
			source: financeConfig.FINANCE_LOG_SOURCE.SYSTEM,
			operator: operatorStaff,
			bizKey: commission.COMMISSION_BIZ_KEY,
			note: reason,
		});
		return after;
	}

	async _createVoidOffsetAdjust(order, commission, operatorStaff = null, reason = '') {
		let amountCent = this._safeCent(commission.COMMISSION_AMOUNT_CENT, 0);
		if (amountCent == 0 || !PAYROLL_KINDS.includes(commission.COMMISSION_KIND)) return null;
		let participant = await this._buildParticipantFromCommission(commission);
		let bizKey = financeConfig.LOCK_PREFIX.ADJUST_COMMISSION + 'void:' + this._commissionKey(commission) + ':v1';
		let exists = await WorkCommissionModel.getOne({ COMMISSION_BIZ_KEY: bizKey });
		if (exists) return exists;
		let detail = {
			mode: commission.COMMISSION_MODE || participant.mode,
			rate: commission.COMMISSION_RATE || 0,
			baseAmountCent: this._safeCent(commission.COMMISSION_BASE_AMOUNT_CENT, 0),
			totalAmountCent: Math.abs(amountCent),
			ruleSnapshot: Object.assign({}, commission.COMMISSION_RULE_SNAPSHOT || {}, { voidOffsetFor: this._commissionKey(commission) }),
		};
		let data = this._baseCommissionData(order, null, participant, detail, financeConfig.COMMISSION_KIND.ADJUST, -amountCent, operatorStaff, {
			bizKey,
			refCommissionId: this._commissionKey(commission),
			sourceType: 'void_offset_adjust',
			sourceId: this._commissionKey(commission),
			month: this._normalizeMonth(timeUtil.time('Y-M-D')),
			note: reason || '原提成已进工资/已锁定，生成反向调整冲回',
		});
		return await this._insertCommission(data, operatorStaff, 'CREATE_VOID_OFFSET_ADJUST');
	}

	async voidCommissionsByPayment(paymentOrId, reason = '', operatorStaff = null, options = {}) {
		let payment = await this._getPayment(paymentOrId);
		let order = await this._getOrder(payment.PAYMENT_ORDER_ID);
		let paymentId = this._paymentKey(payment);
		let list = await WorkCommissionModel.getAll({
			COMMISSION_PAYMENT_ID: paymentId,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
		}, '*', { COMMISSION_ADD_TIME: 'asc' }, 1000);

		let voided = [];
		let adjusted = [];
		let blocked = list
			.filter(commission => !this._canVoidInPlace(commission) && !this._canCreateVoidOffsetAdjust(commission))
			.map(commission => this._buildVoidBlockedItem(commission, paymentId));
		if (blocked.length) return { paymentId, voided, adjusted, blocked };
		if (options && (options.dryRun || options.preflight || options.checkOnly)) return { paymentId, voided, adjusted, blocked };

		for (let commission of list) {
			if (this._canVoidInPlace(commission)) {
				voided.push(await this._voidCommissionInPlace(commission, reason || '来源收款作废，同步作废提成', operatorStaff));
				continue;
			}

			let adjust = await this._createVoidOffsetAdjust(order, commission, operatorStaff, reason);
			if (adjust) adjusted.push(adjust);
			else blocked.push(this._buildVoidBlockedItem(commission, paymentId));
		}

		await this.refreshOrderCommissionStatus(order._id, { operatorStaff });
		return { paymentId, voided, adjusted, blocked };
	}

	buildCommissionSummary(commissions = []) {
		let summary = {
			count: 0,
			effectiveCount: 0,
			voidCount: 0,
			payrollCent: 0,
			currentCent: 0,
			releaseCent: 0,
			adjustCent: 0,
			deductCent: 0,
			frozenCent: 0,
			frozenRemainCent: 0,
			frozenReleasedCent: 0,
			frozenDeductedCent: 0,
			byKind: {},
		};
		for (let item of commissions || []) {
			if (Number(item.COMMISSION_STATUS || 0) == financeConfig.COMMISSION_STATUS.VOID || item.COMMISSION_KIND == financeConfig.COMMISSION_KIND.VOID) {
				summary.voidCount++;
				continue;
			}
			summary.effectiveCount++;
			let kind = item.COMMISSION_KIND || 'UNKNOWN';
			let amountCent = this._safeCent(item.COMMISSION_AMOUNT_CENT, 0);
			summary.byKind[kind] = this._safeCent(summary.byKind[kind], 0) + amountCent;

			if (kind == financeConfig.COMMISSION_KIND.CURRENT) summary.currentCent += amountCent;
			else if (kind == financeConfig.COMMISSION_KIND.RELEASE) summary.releaseCent += amountCent;
			else if (kind == financeConfig.COMMISSION_KIND.ADJUST) summary.adjustCent += amountCent;
			else if (kind == financeConfig.COMMISSION_KIND.DEDUCT) summary.deductCent += amountCent;
			else if (kind == financeConfig.COMMISSION_KIND.FROZEN) {
				summary.frozenCent += amountCent;
				summary.frozenRemainCent += this._safeCent(item.COMMISSION_FROZEN_REMAIN_CENT, 0);
				summary.frozenReleasedCent += this._safeCent(item.COMMISSION_FROZEN_RELEASED_CENT, 0);
				summary.frozenDeductedCent += this._safeCent(item.COMMISSION_FROZEN_DEDUCTED_CENT, 0);
			} else if (kind == financeConfig.COMMISSION_KIND.FROZEN_DEDUCT) {
				summary.frozenDeductedCent += Math.abs(amountCent);
			}

			if (PAYROLL_KINDS.includes(kind)) summary.payrollCent += amountCent;
		}
		summary.count = summary.effectiveCount;
		summary.payrollAmount = moneyUtil.centToYuan(summary.payrollCent);
		summary.currentAmount = moneyUtil.centToYuan(summary.currentCent);
		summary.releaseAmount = moneyUtil.centToYuan(summary.releaseCent);
		summary.adjustAmount = moneyUtil.centToYuan(summary.adjustCent);
		summary.deductAmount = moneyUtil.centToYuan(summary.deductCent);
		summary.frozenAmount = moneyUtil.centToYuan(summary.frozenCent);
		summary.frozenRemainAmount = moneyUtil.centToYuan(summary.frozenRemainCent);
		return summary;
	}

	_buildOrderCommissionStatus(summary, commissions = []) {
		if (!summary || summary.effectiveCount <= 0) return financeConfig.ORDER_COMMISSION_STATUS.NONE;
		if (summary.deductCent < 0 || summary.frozenDeductedCent > 0) return financeConfig.ORDER_COMMISSION_STATUS.DEDUCTED;
		if (summary.frozenRemainCent > 0) return financeConfig.ORDER_COMMISSION_STATUS.FROZEN;
		let hasPendingPayroll = commissions.some(item => {
			if (Number(item.COMMISSION_STATUS || 0) == financeConfig.COMMISSION_STATUS.VOID) return false;
			return PAYROLL_KINDS.includes(item.COMMISSION_KIND) && Number(item.COMMISSION_STATUS || 0) == financeConfig.COMMISSION_STATUS.PENDING_PAY;
		});
		if (hasPendingPayroll) return financeConfig.ORDER_COMMISSION_STATUS.WAIT_PAY;
		let hasPaid = commissions.some(item => Number(item.COMMISSION_STATUS || 0) == financeConfig.COMMISSION_STATUS.PAID);
		if (hasPaid) return financeConfig.ORDER_COMMISSION_STATUS.PAID;
		return financeConfig.ORDER_COMMISSION_STATUS.PARTIAL;
	}

	async refreshOrderCommissionStatus(orderId, options = {}) {
		let order = await this._getOrder(orderId);
		let commissions = await WorkCommissionModel.getAll({
			COMMISSION_ORDER_ID: order._id,
		}, '*', { COMMISSION_ADD_TIME: 'asc' }, 1000);
		let summary = this.buildCommissionSummary(commissions);
		let status = this._buildOrderCommissionStatus(summary, commissions);
		let before = {
			_id: order._id,
			ORDER_ID: order.ORDER_ID,
			ORDER_COMMISSION_STATUS: order.ORDER_COMMISSION_STATUS || financeConfig.ORDER_COMMISSION_STATUS.NONE,
		};
		let data = { ORDER_COMMISSION_STATUS: status };
		let updated = await WorkOrderModel.edit(order._id, data);
		if (updated != 1) this.AppError('订单提成状态刷新失败');
		let after = Object.assign({}, before, data);
		await this._financeLog.log('REFRESH_COMMISSION_STATUS', 'order', order._id, before, after, {
			source: (options && options.logSource) || financeConfig.FINANCE_LOG_SOURCE.SYSTEM,
			operator: options.operatorStaff || options.adminStaff || null,
		});
		return summary;
	}

	async assertCanChangeParticipants(orderId) {
		let order = await this._getOrder(orderId);
		let effectivePaymentCount = await WorkPaymentModel.count({
			PAYMENT_ORDER_ID: order._id,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		});
		if (effectivePaymentCount > 0) this.AppError('该订单已有有效收款，禁止直接修改参与人提成字段，请走财务调整流程');

		let lockedCount = await WorkCommissionModel.count({
			COMMISSION_ORDER_ID: order._id,
			COMMISSION_STATUS: ['in', [financeConfig.COMMISSION_STATUS.IN_PAYROLL, financeConfig.COMMISSION_STATUS.PAID]],
		});
		if (lockedCount > 0) this.AppError('该订单已有进工资/已发放提成，禁止直接修改参与人提成字段');

		let payrollLockedCount = await WorkCommissionModel.count({
			COMMISSION_ORDER_ID: order._id,
			COMMISSION_IS_PAYROLL_LOCKED: financeConfig.LOCKED.YES,
		});
		if (payrollLockedCount > 0) this.AppError('该订单已有工资锁定提成，禁止直接修改参与人提成字段');
		return true;
	}

	async listCommissions(params = {}, adminStaff = null) {
		params = params || {};
		let where = {};
		let keyword = this._text(params.keyword || params.search || '', 64);
		let orWhere = [];

		if (params.orderId) where.COMMISSION_ORDER_ID = this._text(params.orderId, 120);
		if (params.orderNo) where.COMMISSION_ORDER_NO = ['like', params.orderNo];
		if (params.paymentId) where.COMMISSION_PAYMENT_ID = this._text(params.paymentId, 120);
		if (params.staffId) where.COMMISSION_STAFF_ID = this._text(params.staffId, 120);
		if (params.participantId) where.COMMISSION_PARTICIPANT_ID = this._text(params.participantId, 120);
		if (params.kind) where.COMMISSION_KIND = this._text(params.kind, 40).toUpperCase();
		if (params.mode) where.COMMISSION_MODE = this._normalizeMode(params.mode);
		if (params.month) where.COMMISSION_MONTH = this._normalizeMonth(params.month);
		if (params.status !== undefined && params.status !== null && String(params.status).trim() !== '') where.COMMISSION_STATUS = Number(params.status);
		if (params.includeVoid !== true && params.withVoid !== true && where.COMMISSION_STATUS === undefined) where.COMMISSION_STATUS = this._effectiveCommissionStatusWhere();
		if (params.startMonth && params.endMonth) where.COMMISSION_MONTH = ['between', this._normalizeMonth(params.startMonth), this._normalizeMonth(params.endMonth)];

		if (keyword) {
			orWhere.push({ COMMISSION_ORDER_NO: ['like', keyword] });
			orWhere.push({ COMMISSION_CUSTOMER_NAME: ['like', keyword] });
			orWhere.push({ COMMISSION_CUSTOMER_SURNAME: ['like', keyword] });
			orWhere.push({ COMMISSION_STAFF_NAME: ['like', keyword] });
		}

		return await WorkCommissionModel.getList(this._withProjectWhere(where, orWhere), '*', {
			COMMISSION_MONTH: 'desc',
			COMMISSION_PAYMENT_DATE: 'desc',
			COMMISSION_ADD_TIME: 'desc',
		}, this._page(params.page), this._size(params.size), params.isTotal !== false, Number(params.oldTotal || 0));
	}

	async getFrozenList(params = {}, adminStaff = null) {
		params = params || {};
		let where = {
			COMMISSION_KIND: financeConfig.COMMISSION_KIND.FROZEN,
			COMMISSION_STATUS: this._effectiveCommissionStatusWhere(),
			COMMISSION_FROZEN_REMAIN_CENT: ['>', 0],
		};
		let keyword = this._text(params.keyword || params.search || '', 64);
		let orWhere = [];

		if (params.orderId) where.COMMISSION_ORDER_ID = this._text(params.orderId, 120);
		if (params.orderNo) where.COMMISSION_ORDER_NO = ['like', params.orderNo];
		if (params.paymentId) where.COMMISSION_PAYMENT_ID = this._text(params.paymentId, 120);
		if (params.staffId) where.COMMISSION_STAFF_ID = this._text(params.staffId, 120);
		if (params.participantId) where.COMMISSION_PARTICIPANT_ID = this._text(params.participantId, 120);
		if (params.month) where.COMMISSION_MONTH = this._normalizeMonth(params.month);

		if (keyword) {
			orWhere.push({ COMMISSION_ORDER_NO: ['like', keyword] });
			orWhere.push({ COMMISSION_CUSTOMER_NAME: ['like', keyword] });
			orWhere.push({ COMMISSION_CUSTOMER_SURNAME: ['like', keyword] });
			orWhere.push({ COMMISSION_STAFF_NAME: ['like', keyword] });
		}

		return await WorkCommissionModel.getList(this._withProjectWhere(where, orWhere), '*', {
			COMMISSION_PAYMENT_DATE: 'asc',
			COMMISSION_ADD_TIME: 'asc',
		}, this._page(params.page), this._size(params.size), params.isTotal !== false, Number(params.oldTotal || 0));
	}
}

module.exports = WorkCommissionService;
