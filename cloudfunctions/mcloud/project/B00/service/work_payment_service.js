/**
 * Notes: 云屿摄影 v1.2.0 收款事实账本服务
 */

const BaseProjectService = require('./base_project_service.js');
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

const VALID_PAYMENT_TYPES = Object.values(financeConfig.PAYMENT_TYPE);
const VALID_BASE_TYPES = Object.values(financeConfig.PAYMENT_BASE_TYPE);
const VALID_DIRECTIONS = Object.values(financeConfig.PAYMENT_DIRECTION);
const FINANCIAL_FIELDS = [
	'PAYMENT_TYPE', 'PAYMENT_BASE_TYPE', 'PAYMENT_DIRECTION', 'PAYMENT_AMOUNT_CENT',
	'PAYMENT_DATE', 'PAYMENT_PAY_DATE', 'PAYMENT_MONTH',
	'PAYMENT_STAFF_ID', 'PAYMENT_OWNER_STAFF_ID', 'PAYMENT_TEAM_ID',
	'PAYMENT_REF_PAYMENT_ID'
];

class WorkPaymentService extends BaseProjectService {

	constructor() {
		super();
		this._financeLog = new WorkFinanceLogService();
	}

	_assertCommissionHandled(options = {}, action = '收款操作') {
		let handled = options && (options.commissionHandled === true || options.requireCommissionHandled === true);
		if (handled) return;
		this.AppError(action + '会直接改写收款账本，必须通过订单/管理端财务编排入口同步提成；若调用方已完成提成同步，请显式传入 options.commissionHandled=true');
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

	_pickDefinedValue(obj, fields) {
		obj = obj || {};
		for (let field of fields) {
			if (obj[field] !== undefined && obj[field] !== null) return obj[field];
		}
		return undefined;
	}

	_hasAnyValue(obj, fields) {
		return this._pickValue(obj, fields) !== undefined;
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

	// B14 H-02: 收款 DTO 字段白名单 - 防止客户端注入敏感字段
	static sanitizePaymentDto(dto) {
		if (!dto || typeof dto != 'object') return dto;
		const PAYMENT_DTO_ALLOWED = [
			'_id', 'id',
			'PAYMENT_ID', 'PAYMENT_BIZ_KEY', 'bizKey', 'PAYMENT_CLIENT_KEY', 'clientKey', 'key',
			'PAYMENT_TYPE', 'type',
			'PAYMENT_BASE_TYPE', 'baseType',
			'PAYMENT_DIRECTION', 'direction',
			'PAYMENT_AMOUNT_CENT', 'amountCent',
			'PAYMENT_AMOUNT', 'amount', 'paymentAmount',
			'PAYMENT_DATE', 'PAYMENT_PAY_DATE', 'date', 'payDate',
			'PAYMENT_MONTH', 'month',
			'PAYMENT_STAFF_ID', 'PAYMENT_OWNER_STAFF_ID', 'staffId', 'ownerStaffId',
			'PAYMENT_REF_PAYMENT_ID', 'refPaymentId',
			'PAYMENT_NOTE', 'PAYMENT_REMARK', 'note', 'remark',
			'PAYMENT_SOURCE', 'source',
			'PAYMENT_VERSION', 'version',
			'IS_DELETE', 'status', 'reason', 'PAYMENT_VOID_REASON',
		];
		let safe = {};
		for (const key of PAYMENT_DTO_ALLOWED) {
			if (dto[key] !== undefined) safe[key] = dto[key];
		}
		return safe;
	}

	async _getOrder(orderId, must = true) {
		orderId = this._text(orderId, 120);
		if (!orderId) {
			if (must) this.AppError('缺少订单ID');
			return null;
		}

		let order = await WorkOrderModel.getOne(orderId);
		if (!order) {
			order = await WorkOrderModel.getOne({ ORDER_ID: orderId });
		}
		if (!order && must) this.AppError('订单不存在');
		return order;
	}

	_operatorSnapshot(staff) {
		staff = staff || {};
		return {
			id: this._text(staff._id || staff.STAFF_ID || staff.ADMIN_ID || staff.id || '', 80),
			name: this._text(staff.STAFF_NAME || staff.ADMIN_NAME || staff.name || '', 80),
		};
	}

	_defaultBaseType(type) {
		if (type == financeConfig.PAYMENT_TYPE.EXTRA || type == financeConfig.PAYMENT_TYPE.PRODUCT) return financeConfig.PAYMENT_BASE_TYPE.EXTRA;
		if (type == financeConfig.PAYMENT_TYPE.SUPPLEMENT) return financeConfig.PAYMENT_BASE_TYPE.ALL;
		return financeConfig.PAYMENT_BASE_TYPE.SHOOT;
	}

	_normalizePaymentType(type, fallback = financeConfig.PAYMENT_TYPE.DEPOSIT) {
		type = this._text(type || fallback, 40).toLowerCase();
		if (!VALID_PAYMENT_TYPES.includes(type)) this.AppError('收款类型不合法');
		return type;
	}

	_normalizeBaseType(baseType, paymentType) {
		baseType = this._text(baseType || this._defaultBaseType(paymentType), 40).toLowerCase();
		if (!VALID_BASE_TYPES.includes(baseType)) this.AppError('收款基数类型不合法');
		return baseType;
	}

	_normalizeDirection(direction, paymentType) {
		direction = this._text(direction || '', 40).toLowerCase();
		if (!direction) {
			if (paymentType == financeConfig.PAYMENT_TYPE.REFUND) return financeConfig.PAYMENT_DIRECTION.REFUND;
			if (paymentType == financeConfig.PAYMENT_TYPE.ADJUST) return financeConfig.PAYMENT_DIRECTION.ADJUST;
			return financeConfig.PAYMENT_DIRECTION.INCOME;
		}
		if (!VALID_DIRECTIONS.includes(direction)) this.AppError('收款方向不合法');
		return direction;
	}

	_normalizeDate(value, fallback = '') {
		value = this._text(value || fallback || timeUtil.time('Y-M-D'), 30);
		if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) value = value.replace(/\//g, '-');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) this.AppError('收款日期格式错误');
		return value;
	}

	_resolveAmountCent(raw, direction, fallbackCent = null) {
		raw = raw || {};
		let hasCent = this._hasAnyValue(raw, ['PAYMENT_AMOUNT_CENT', 'amountCent']);
		let hasYuan = this._hasAnyValue(raw, ['PAYMENT_AMOUNT', 'amount', 'paymentAmount']);

		let cent = 0;
		if (hasCent) {
			let val = this._pickValue(raw, ['PAYMENT_AMOUNT_CENT', 'amountCent']);
			cent = Number(val);
			if (!Number.isSafeInteger(cent)) this.AppError('金额分必须是整数');
		} else if (hasYuan) {
			let val = this._pickValue(raw, ['PAYMENT_AMOUNT', 'amount', 'paymentAmount']);
			cent = moneyUtil.moneyToCentStrict(val, true);
		} else if (Number.isSafeInteger(Number(fallbackCent))) {
			cent = Number(fallbackCent);
		} else {
			this.AppError('缺少收款金额');
		}

		if (direction == financeConfig.PAYMENT_DIRECTION.INCOME) {
			if (cent <= 0) this.AppError('收入收款金额必须大于0');
			return cent;
		}

		if (direction == financeConfig.PAYMENT_DIRECTION.REFUND || direction == financeConfig.PAYMENT_DIRECTION.ADJUST) {
			if (cent == 0) this.AppError('退款/冲减金额不能为0');
			return cent > 0 ? -cent : cent;
		}

		this.AppError('收款方向不合法');
	}

	async resolvePaymentOwner(input = {}, order = null, adminStaff = null) {
		if (typeof input == 'string') input = { staffId: input };
		input = input || {};
		let staffId = this._text(input.PAYMENT_STAFF_ID || input.PAYMENT_OWNER_STAFF_ID || input.staffId || input.ownerStaffId || '', 120);
		if (!staffId && order) staffId = this._text(order.ORDER_SALES_STAFF_ID || order.ORDER_CREATOR_STAFF_ID || '', 120);
		if (!staffId && adminStaff) staffId = this._text(adminStaff._id || adminStaff.STAFF_ID || '', 120);

		if (!staffId) {
			return {
				staffId: '', staffName: '', teamId: '', teamName: ''
			};
		}

		let staff = await WorkStaffModel.getOne(staffId);
		if (!staff) this.AppError('业绩归属员工不存在');
		if (staff.STAFF_STATUS != WorkStaffModel.STATUS.COMM) this.AppError('业绩归属员工已停用');

		return {
			staffId: staff._id,
			staffName: staff.STAFF_NAME || '',
			teamId: staff.STAFF_TEAM_ID || '',
			teamName: staff.STAFF_TEAM_NAME || '',
		};
	}

	_isDeleteDto(dto) {
		dto = dto || {};
		return dto.IS_DELETE === true || dto.IS_DELETE == 1 || Number(dto.PAYMENT_STATUS || 0) == financeConfig.PAYMENT_STATUS.VOID || dto.status == 'delete' || dto.status == 'void';
	}

	async _getPaymentByAnyId(paymentId) {
		paymentId = this._text(paymentId, 120);
		if (!paymentId) return null;
		let payment = await WorkPaymentModel.getOne(paymentId);
		if (!payment) payment = await WorkPaymentModel.getOne({ PAYMENT_ID: paymentId });
		return payment;
	}

	async getPaymentByAnyId(paymentId) {
		return await this._getPaymentByAnyId(paymentId);
	}

	async _findPaymentForDto(orderId, dto = {}) {
		let id = this._text(dto._id || dto.id || '', 120);
		if (id) {
			let one = await this._getPaymentByAnyId(id);
			if (one && one.PAYMENT_ORDER_ID == orderId) return one;
		}

		let paymentId = this._text(dto.PAYMENT_ID || '', 120);
		if (paymentId) {
			let one = await WorkPaymentModel.getOne({ PAYMENT_ORDER_ID: orderId, PAYMENT_ID: paymentId });
			if (one) return one;
		}

		let bizKey = this._text(dto.PAYMENT_BIZ_KEY || dto.bizKey || '', 180);
		if (bizKey) {
			let one = await WorkPaymentModel.getOne({ PAYMENT_ORDER_ID: orderId, PAYMENT_BIZ_KEY: bizKey }, '*', { PAYMENT_VERSION: 'desc', PAYMENT_ADD_TIME: 'desc' });
			if (one) return one;
		}

		let clientKey = this._text(dto.PAYMENT_CLIENT_KEY || dto.clientKey || dto.key || '', 120);
		if (clientKey) {
			let one = await WorkPaymentModel.getOne({ PAYMENT_ORDER_ID: orderId, PAYMENT_CLIENT_KEY: clientKey }, '*', { PAYMENT_VERSION: 'desc', PAYMENT_ADD_TIME: 'desc' });
			if (one) return one;
		}

		return null;
	}

	async _buildPaymentData(order, dto = {}, operatorStaff = null, options = {}) {
		let existing = options.existing || null;
		let typeRaw = this._pickValue(dto, ['PAYMENT_TYPE', 'type']);
		let hasTypePatch = typeRaw !== undefined;
		let type = this._normalizePaymentType(typeRaw, existing ? existing.PAYMENT_TYPE : financeConfig.PAYMENT_TYPE.DEPOSIT);
		let directionRaw = this._pickValue(dto, ['PAYMENT_DIRECTION', 'direction']);
		let directionFallback = existing && !hasTypePatch ? existing.PAYMENT_DIRECTION : '';
		let direction = this._normalizeDirection(directionRaw !== undefined ? directionRaw : directionFallback, type);
		if (type == financeConfig.PAYMENT_TYPE.REFUND && direction != financeConfig.PAYMENT_DIRECTION.REFUND) this.AppError('退款类型必须使用退款方向');
		if (type == financeConfig.PAYMENT_TYPE.ADJUST && direction != financeConfig.PAYMENT_DIRECTION.ADJUST) this.AppError('冲减类型必须使用冲减方向');
		if (direction == financeConfig.PAYMENT_DIRECTION.REFUND && type != financeConfig.PAYMENT_TYPE.REFUND) this.AppError('退款方向必须使用退款类型');
		if (direction == financeConfig.PAYMENT_DIRECTION.ADJUST && type != financeConfig.PAYMENT_TYPE.ADJUST) this.AppError('冲减方向必须使用冲减类型');

		let baseTypeRaw = this._pickValue(dto, ['PAYMENT_BASE_TYPE', 'baseType']);
		let baseType = this._normalizeBaseType(baseTypeRaw !== undefined ? baseTypeRaw : (existing ? existing.PAYMENT_BASE_TYPE : ''), type);
		let amountCent = this._resolveAmountCent(dto, direction, existing ? moneyUtil.safeCent(existing.PAYMENT_AMOUNT_CENT, 0) : null);
		let dateRaw = this._pickValue(dto, ['PAYMENT_DATE', 'PAYMENT_PAY_DATE', 'date', 'payDate']);
		let date = this._normalizeDate(dateRaw, existing ? existing.PAYMENT_DATE : '');
		let monthRaw = this._pickValue(dto, ['PAYMENT_MONTH', 'month']);
		let month = financeConfig.normalizeMonth(monthRaw || (existing && existing.PAYMENT_MONTH) || moneyUtil.buildMonth(date));
		if (!month) this.AppError('收款月份格式错误');

		let owner = null;
		let hasOwnerPatch = this._hasAnyValue(dto, ['PAYMENT_STAFF_ID', 'PAYMENT_OWNER_STAFF_ID', 'staffId', 'ownerStaffId']);
		if (existing && !hasOwnerPatch) {
			owner = {
				staffId: existing.PAYMENT_STAFF_ID || existing.PAYMENT_OWNER_STAFF_ID || '',
				staffName: existing.PAYMENT_STAFF_NAME || existing.PAYMENT_OWNER_NAME || '',
				teamId: existing.PAYMENT_TEAM_ID || '',
				teamName: existing.PAYMENT_TEAM_NAME || '',
			};
		} else {
			owner = await this.resolvePaymentOwner(dto, order, operatorStaff);
		}
		let operator = this._operatorSnapshot(operatorStaff);
		let rawSource = this._pickValue(dto, ['PAYMENT_SOURCE', 'source']);
		let source = this._text(options.source || rawSource || (existing && existing.PAYMENT_SOURCE) || financeConfig.PAYMENT_SOURCE.ORDER_EDIT, 40);
		let clientKey = this._text(dto.PAYMENT_CLIENT_KEY || dto.clientKey || dto.key || (existing && existing.PAYMENT_CLIENT_KEY) || '', 120);
		if (!clientKey && options.allowGenerateClientKey) clientKey = (source || 'payment') + ':' + dataUtil.makeID();
		if (!clientKey) this.AppError('缺少收款幂等key');

		let version = Number((existing && existing.PAYMENT_VERSION) || dto.PAYMENT_VERSION || dto.version || 1);
		if (!Number.isSafeInteger(version) || version < 1) version = 1;

		let bizKey = this._text(dto.PAYMENT_BIZ_KEY || dto.bizKey || '', 180);
		if (!bizKey) {
			if (source == financeConfig.PAYMENT_SOURCE.ADMIN) bizKey = financeConfig.buildAdminPaymentBizKey(order._id, clientKey);
			else bizKey = financeConfig.buildPaymentBizKey(order._id, clientKey, version);
		}

		let isLocked = dto.PAYMENT_IS_LOCKED !== undefined ? Number(dto.PAYMENT_IS_LOCKED || 0) : Number(dto.locked || (existing && existing.PAYMENT_IS_LOCKED) || financeConfig.LOCKED.NO);
		isLocked = isLocked == financeConfig.LOCKED.YES ? financeConfig.LOCKED.YES : financeConfig.LOCKED.NO;

			let noteRaw = this._pickValue(dto, ['PAYMENT_NOTE', 'PAYMENT_REMARK', 'note', 'remark']);
			let note = noteRaw !== undefined ? this._text(noteRaw, 300) : this._text(existing ? (existing.PAYMENT_NOTE || existing.PAYMENT_REMARK || '') : '', 300);
			let refPaymentIdRaw = this._pickDefinedValue(dto, ['PAYMENT_REF_PAYMENT_ID', 'refPaymentId']);
			let refPaymentId = refPaymentIdRaw !== undefined ? this._text(refPaymentIdRaw, 120) : this._text((existing && existing.PAYMENT_REF_PAYMENT_ID) || '', 120);

		return {
			PAYMENT_ORDER_ID: order._id,
			PAYMENT_ORDER_NO: order.ORDER_ID || '',
			PAYMENT_ORDER_TYPE_NAME: order.ORDER_TYPE_NAME || '',
			PAYMENT_ORDER_DATE: order.ORDER_DATE || '',
			PAYMENT_CUSTOMER_NAME: order.ORDER_CUSTOMER_NAME || '',
			PAYMENT_CUSTOMER_SURNAME: order.ORDER_CUSTOMER_SURNAME || '',

			PAYMENT_TYPE: type,
			PAYMENT_BASE_TYPE: baseType,
			PAYMENT_DIRECTION: direction,
			PAYMENT_AMOUNT_CENT: amountCent,
			PAYMENT_AMOUNT: moneyUtil.centToYuan(amountCent),
			PAYMENT_DATE: date,
			PAYMENT_PAY_DATE: date,
			PAYMENT_MONTH: month,

			PAYMENT_STAFF_ID: owner.staffId,
			PAYMENT_STAFF_NAME: owner.staffName,
			PAYMENT_STAFF_OPENID: '',
			PAYMENT_OWNER_STAFF_ID: owner.staffId,
			PAYMENT_OWNER_NAME: owner.staffName,
			PAYMENT_TEAM_ID: owner.teamId,
			PAYMENT_TEAM_NAME: owner.teamName,

			PAYMENT_SOURCE: source,
				PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
				PAYMENT_IS_LOCKED: isLocked,
				PAYMENT_LOCK_KEY: this._text(dto.PAYMENT_LOCK_KEY || dto.lockKey || (existing && existing.PAYMENT_LOCK_KEY) || '', 180),
				PAYMENT_REF_PAYMENT_ID: refPaymentId,
			PAYMENT_CLIENT_KEY: clientKey,
			PAYMENT_BIZ_KEY: bizKey,
			PAYMENT_VERSION: version,
			PAYMENT_REPLACE_FROM_ID: this._text(dto.PAYMENT_REPLACE_FROM_ID || (existing && existing.PAYMENT_REPLACE_FROM_ID) || '', 120),
			PAYMENT_REPLACE_TO_ID: this._text(dto.PAYMENT_REPLACE_TO_ID || (existing && existing.PAYMENT_REPLACE_TO_ID) || '', 120),
			PAYMENT_VOID_REASON: '',
			PAYMENT_VOID_TIME: 0,

			PAYMENT_SUMMARY: {},
			PAYMENT_NOTE: note,
			PAYMENT_REMARK: note,
			PAYMENT_OPERATOR_STAFF_ID: operator.id,
			PAYMENT_OPERATOR_OPENID: '',
			PAYMENT_OPERATOR_NAME: operator.name,
		};
	}

	_financialChanged(oldPayment, newData) {
		for (let field of FINANCIAL_FIELDS) {
			let oldVal = oldPayment[field] === undefined || oldPayment[field] === null ? '' : oldPayment[field];
			let newVal = newData[field] === undefined || newData[field] === null ? '' : newData[field];
			if (String(oldVal) != String(newVal)) return true;
		}
		return false;
	}

	_lockedEditableData(newData) {
		return {
			PAYMENT_NOTE: newData.PAYMENT_NOTE || '',
			PAYMENT_REMARK: newData.PAYMENT_REMARK || '',
			PAYMENT_OPERATOR_STAFF_ID: newData.PAYMENT_OPERATOR_STAFF_ID || '',
			PAYMENT_OPERATOR_OPENID: '',
			PAYMENT_OPERATOR_NAME: newData.PAYMENT_OPERATOR_NAME || '',
		};
	}

	_isPayrollLocked(payment) {
		if (!payment) return false;
		return Number(payment.PAYMENT_IS_LOCKED || 0) == financeConfig.LOCKED.YES
			&& this._text(payment.PAYMENT_LOCK_KEY || '', 180).startsWith(financeConfig.LOCK_PREFIX.PAYROLL);
	}

	_assertNotPayrollLocked(payment, action = '收款操作') {
		if (this._isPayrollLocked(payment)) this.AppError('该收款已进入工资单，不能' + action + '；请新增退款/冲减并保留原因');
	}

	_isRefundLike(data) {
		return data && (data.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.REFUND || data.PAYMENT_TYPE == financeConfig.PAYMENT_TYPE.REFUND);
	}

	_isAdjustLike(data) {
		return data && (data.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.ADJUST || data.PAYMENT_TYPE == financeConfig.PAYMENT_TYPE.ADJUST);
	}

	async _assertAdjustReason(data) {
		if (!this._isAdjustLike(data)) return;
		if (!this._text(data.PAYMENT_NOTE || data.PAYMENT_REMARK || '', 300)) this.AppError('冲减必须填写原因/备注');
	}

	async _assertRefundUpperBound(order, data, existing = null) {
		if (!this._isRefundLike(data)) return;
		let refundAbsCent = Math.abs(moneyUtil.safeCent(data.PAYMENT_AMOUNT_CENT, 0));
		if (refundAbsCent <= 0) this.AppError('退款金额必须大于0');

		let payments = await WorkPaymentModel.getAll({
			PAYMENT_ORDER_ID: order._id,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		}, '*', { PAYMENT_DATE: 'asc', PAYMENT_ADD_TIME: 'asc' }, 1000);
		payments = (payments || []).filter(item => !existing || item._id != existing._id);

		let refPaymentId = this._text(data.PAYMENT_REF_PAYMENT_ID || '', 120);
		if (refPaymentId) {
			let refPayment = payments.find(item => item._id == refPaymentId || item.PAYMENT_ID == refPaymentId);
			if (!refPayment && existing && (existing._id == refPaymentId || existing.PAYMENT_ID == refPaymentId)) refPayment = existing;
			if (!refPayment) this.AppError('原收款记录不存在，不能退款');
			if (refPayment.PAYMENT_ORDER_ID != order._id) this.AppError('原收款不属于当前订单');
			if (refPayment.PAYMENT_DIRECTION != financeConfig.PAYMENT_DIRECTION.INCOME || moneyUtil.safeCent(refPayment.PAYMENT_AMOUNT_CENT, 0) <= 0) this.AppError('只能针对有效收入收款退款');
			let refundedCent = 0;
			for (let item of payments) {
				if (item._id == refPayment._id) continue;
				if (this._text(item.PAYMENT_REF_PAYMENT_ID || '', 120) != refPaymentId && this._text(item.PAYMENT_REF_PAYMENT_ID || '', 120) != refPayment.PAYMENT_ID) continue;
				if (item.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.REFUND) refundedCent += Math.abs(moneyUtil.safeCent(item.PAYMENT_AMOUNT_CENT, 0));
			}
			let maxCent = moneyUtil.safeCent(refPayment.PAYMENT_AMOUNT_CENT, 0) - refundedCent;
			if (refundAbsCent > maxCent) this.AppError('退款金额超过原收款可退余额，请改用冲减并填写原因');
			return;
		}

		let incomeCent = 0;
		let refundedCent = 0;
		for (let item of payments) {
			let cent = moneyUtil.safeCent(item.PAYMENT_AMOUNT_CENT, 0);
			if (item.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.INCOME) incomeCent += cent;
			else if (item.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.REFUND) refundedCent += Math.abs(cent);
		}
		let maxCent = incomeCent - refundedCent;
		if (refundAbsCent > maxCent) this.AppError('退款金额超过订单可退余额，请改用冲减并填写原因');
	}

	async _assertOrderRefundBalanceAfterData(order, data, existing = null) {
		let payments = await WorkPaymentModel.getAll({
			PAYMENT_ORDER_ID: order._id,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		}, '*', { PAYMENT_DATE: 'asc', PAYMENT_ADD_TIME: 'asc' }, 1000);
		let incomeCent = 0;
		let refundAbsCent = 0;
		for (let item of payments || []) {
			if (existing && item._id == existing._id) continue;
			let cent = moneyUtil.safeCent(item.PAYMENT_AMOUNT_CENT, 0);
			if (item.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.INCOME) incomeCent += cent;
			else if (item.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.REFUND) refundAbsCent += Math.abs(cent);
		}
		let nextCent = moneyUtil.safeCent(data.PAYMENT_AMOUNT_CENT, 0);
		if (data.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.INCOME) incomeCent += nextCent;
		else if (data.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.REFUND) refundAbsCent += Math.abs(nextCent);
		if (refundAbsCent > incomeCent) this.AppError('退款金额超过订单可退余额，请改用冲减并填写原因');
	}

	async _assertIncomeVoidBoundary(payment) {
		if (!payment || payment.PAYMENT_DIRECTION != financeConfig.PAYMENT_DIRECTION.INCOME) return;
		let payments = await WorkPaymentModel.getAll({
			PAYMENT_ORDER_ID: payment.PAYMENT_ORDER_ID,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		}, '*', { PAYMENT_DATE: 'asc', PAYMENT_ADD_TIME: 'asc' }, 1000);
		let refKeys = [payment._id, payment.PAYMENT_ID].filter(item => item !== undefined && item !== null && String(item).trim() !== '').map(item => String(item));
		let refRefund = (payments || []).find(item => item._id != payment._id
			&& item.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.REFUND
			&& refKeys.includes(String(item.PAYMENT_REF_PAYMENT_ID || '')));
		if (refRefund) this.AppError('该收入收款已有引用退款，需先作废/调整相关退款记录');
		let incomeCent = 0;
		let refundAbsCent = 0;
		for (let item of payments || []) {
			if (item._id == payment._id) continue;
			let cent = moneyUtil.safeCent(item.PAYMENT_AMOUNT_CENT, 0);
			if (item.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.INCOME) incomeCent += cent;
			else if (item.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.REFUND) refundAbsCent += Math.abs(cent);
		}
		if (refundAbsCent > incomeCent) this.AppError('作废该收入收款后退款将超过可退余额，请先作废/调整相关退款记录');
	}

	async _assertBizKeySafe(bizKey) {
		let cnt = await WorkPaymentModel.count({ PAYMENT_BIZ_KEY: bizKey });
		if (cnt > 1) this.AppError('收款幂等key存在重复，请人工核对：' + bizKey);
	}

	async _insertPayment(data, operatorStaff = null, logSource = financeConfig.FINANCE_LOG_SOURCE.SYSTEM) {
		let exists = await WorkPaymentModel.getOne({ PAYMENT_BIZ_KEY: data.PAYMENT_BIZ_KEY }, '*', { PAYMENT_VERSION: 'desc', PAYMENT_ADD_TIME: 'desc' });
		if (exists) {
			await this._assertBizKeySafe(data.PAYMENT_BIZ_KEY);
			if (exists.PAYMENT_ORDER_ID != data.PAYMENT_ORDER_ID) this.AppError('收款幂等key已属于其他订单，请刷新后重试');
			if (exists.PAYMENT_STATUS == financeConfig.PAYMENT_STATUS.VOID) this.AppError('收款幂等key对应记录已作废，请使用新的幂等key');
			return exists;
		}

		let id = await WorkPaymentModel.insert(data);
		let payment = await WorkPaymentModel.getOne(id);
		await this._assertBizKeySafe(data.PAYMENT_BIZ_KEY);
		await this._financeLog.log('CREATE', 'payment', id, null, payment, {
			source: logSource,
			operator: operatorStaff,
			bizKey: data.PAYMENT_BIZ_KEY,
		});
		return payment;
	}

	async _voidPaymentRecord(payment, reason = '', operatorStaff = null, options = {}) {
		if (!payment) this.AppError('收款记录不存在');
		if (payment.PAYMENT_STATUS == financeConfig.PAYMENT_STATUS.VOID) return payment;
		this._assertNotPayrollLocked(payment, '作废');
		await this._assertIncomeVoidBoundary(payment);

		let operator = this._operatorSnapshot(operatorStaff);
		let data = {
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.VOID,
			PAYMENT_VOID_REASON: this._text(reason || '作废', 300),
			PAYMENT_VOID_TIME: timeUtil.time(),
			PAYMENT_OPERATOR_STAFF_ID: operator.id,
			PAYMENT_OPERATOR_OPENID: '',
			PAYMENT_OPERATOR_NAME: operator.name,
		};
		let updated = await WorkPaymentModel.edit({
			_id: payment._id,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		}, data);
		if (updated != 1) {
			let latest = await WorkPaymentModel.getOne(payment._id);
			if (latest && latest.PAYMENT_STATUS == financeConfig.PAYMENT_STATUS.VOID) return latest;
			this.AppError('收款作废失败，请刷新后重试');
		}

		let after = await WorkPaymentModel.getOne(payment._id);
		await this._financeLog.log(options.action || 'VOID', 'payment', payment._id, payment, after, {
			source: options.logSource || financeConfig.FINANCE_LOG_SOURCE.SYSTEM,
			operator: operatorStaff,
			bizKey: payment.PAYMENT_BIZ_KEY,
			note: reason,
		});
		return after;
	}

	async _replaceLockedPayment(order, oldPayment, newData, operatorStaff = null, options = {}) {
		let version = Number(oldPayment.PAYMENT_VERSION || 1) + 1;
		newData.PAYMENT_VERSION = version;
		newData.PAYMENT_BIZ_KEY = financeConfig.buildPaymentBizKey(order._id, newData.PAYMENT_CLIENT_KEY, version);
		newData.PAYMENT_REPLACE_FROM_ID = oldPayment._id;
		newData.PAYMENT_REPLACE_TO_ID = '';
		newData.PAYMENT_IS_LOCKED = oldPayment.PAYMENT_IS_LOCKED;
		newData.PAYMENT_LOCK_KEY = oldPayment.PAYMENT_LOCK_KEY || newData.PAYMENT_LOCK_KEY || '';

		let existingNew = await WorkPaymentModel.getOne({ PAYMENT_BIZ_KEY: newData.PAYMENT_BIZ_KEY });
		if (existingNew) return existingNew;

		let voided = await this._voidPaymentRecord(oldPayment, options.reason || '已锁收款变更，作废旧版本', operatorStaff, {
			action: 'REPLACE_VOID',
			logSource: options.logSource,
		});
		let newPayment = await this._insertPayment(newData, operatorStaff, options.logSource);
		await WorkPaymentModel.edit(voided._id, { PAYMENT_REPLACE_TO_ID: newPayment._id });
		return newPayment;
	}

	async _saveOneOrderPayment(order, dto = {}, operatorStaff = null, options = {}) {
		let existing = await this._findPaymentForDto(order._id, dto);
		let logSource = options.logSource || financeConfig.FINANCE_LOG_SOURCE.ORDER_EDIT;

		if (this._isDeleteDto(dto)) {
			if (!existing) return null;
			return await this._voidPaymentRecord(existing, dto.PAYMENT_VOID_REASON || dto.reason || '订单编辑作废收款', operatorStaff, { logSource });
		}

		if (existing && existing.PAYMENT_STATUS == financeConfig.PAYMENT_STATUS.VOID) {
			let nextVersion = Number(existing.PAYMENT_VERSION || 1) + 1;
			dto = Object.assign({}, dto, {
				PAYMENT_VERSION: nextVersion,
				PAYMENT_CLIENT_KEY: dto.PAYMENT_CLIENT_KEY || dto.clientKey || dto.key || existing.PAYMENT_CLIENT_KEY,
				PAYMENT_BIZ_KEY: financeConfig.buildPaymentBizKey(order._id, dto.PAYMENT_CLIENT_KEY || dto.clientKey || dto.key || existing.PAYMENT_CLIENT_KEY, nextVersion),
			});
			delete dto.bizKey;
			existing = null;
		}

		let data = await this._buildPaymentData(order, dto, operatorStaff, Object.assign({}, options, { existing }));
		await this._assertAdjustReason(data);
		await this._assertRefundUpperBound(order, data, existing);
		await this._assertOrderRefundBalanceAfterData(order, data, existing);

		if (!existing) {
			return await this._insertPayment(data, operatorStaff, logSource);
		}

		data.PAYMENT_BIZ_KEY = existing.PAYMENT_BIZ_KEY;
		data.PAYMENT_CLIENT_KEY = existing.PAYMENT_CLIENT_KEY;
		data.PAYMENT_VERSION = existing.PAYMENT_VERSION;
		data.PAYMENT_REPLACE_FROM_ID = existing.PAYMENT_REPLACE_FROM_ID || '';
		data.PAYMENT_REPLACE_TO_ID = existing.PAYMENT_REPLACE_TO_ID || '';

		if (this._financialChanged(existing, data)) {
			this._assertNotPayrollLocked(existing, '修改财务字段');
			return await this._replaceLockedPayment(order, existing, data, operatorStaff, {
				logSource,
				reason: '收款财务字段变更，作废旧版本',
			});
		}

		if (Number(existing.PAYMENT_IS_LOCKED || 0) == financeConfig.LOCKED.YES) {
			let editData = this._lockedEditableData(data);
			let updated = await WorkPaymentModel.edit({
				_id: existing._id,
				PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
				PAYMENT_IS_LOCKED: financeConfig.LOCKED.YES,
			}, editData);
			if (updated != 1) this.AppError('已锁收款更新失败，请刷新后重试');
			let after = await WorkPaymentModel.getOne(existing._id);
			await this._financeLog.log('UPDATE_LOCKED_NOTE', 'payment', existing._id, existing, after, {
				source: logSource,
				operator: operatorStaff,
				bizKey: existing.PAYMENT_BIZ_KEY,
			});
			return after;
		}

		let editData = this._lockedEditableData(data);
		editData.PAYMENT_IS_LOCKED = financeConfig.LOCKED.NO;
		let updated = await WorkPaymentModel.edit({
			_id: existing._id,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
			PAYMENT_IS_LOCKED: financeConfig.LOCKED.NO,
		}, editData);
		if (updated != 1) this.AppError('收款更新失败，请刷新后重试');
		let after = await WorkPaymentModel.getOne(existing._id);
		await this._financeLog.log('UPDATE', 'payment', existing._id, existing, after, {
			source: logSource,
			operator: operatorStaff,
			bizKey: existing.PAYMENT_BIZ_KEY,
		});
		return after;
	}

	async getOrderPayments(orderId, options = {}) {
		let order = await this._getOrder(orderId);
		let includeVoid = !!(options && (options.includeVoid || options.withVoid));
		let where = { PAYMENT_ORDER_ID: order._id };
		if (!includeVoid) where.PAYMENT_STATUS = financeConfig.PAYMENT_STATUS.EFFECTIVE;
		return await WorkPaymentModel.getAll(where, '*', {
			PAYMENT_DATE: 'asc',
			PAYMENT_ADD_TIME: 'asc',
		}, 1000);
	}

	async saveOrderPayments(orderId, paymentDtos = [], operatorStaff = null, options = {}) {
		let order = await this._getOrder(orderId);
		if (!Array.isArray(paymentDtos)) paymentDtos = [paymentDtos];
		// B14 H-02: 对每个 DTO 应用字段白名单
		paymentDtos = paymentDtos.map(dto => WorkPaymentService.sanitizePaymentDto(dto));

		let saved = [];
		for (let dto of paymentDtos) {
			if (!dto) continue;
			let item = await this._saveOneOrderPayment(order, dto, operatorStaff, Object.assign({
				source: financeConfig.PAYMENT_SOURCE.ORDER_EDIT,
				logSource: financeConfig.FINANCE_LOG_SOURCE.ORDER_EDIT,
			}, options));
			if (item) saved.push(item);
		}

		let summary = await this.refreshOrderPaymentSummary(order._id, { operatorStaff });
		return { orderId: order._id, payments: saved, summary };
	}

	async saveAdminPayment(orderId, dto = {}, adminStaff = null, options = {}) {
		this._assertCommissionHandled(options, '后台新增/修改收款');
		dto = WorkPaymentService.sanitizePaymentDto(dto);
		if (!dto.PAYMENT_CLIENT_KEY && !dto.clientKey && !dto.key) dto.clientKey = 'admin:' + dataUtil.makeID();
		let ret = await this.saveOrderPayments(orderId, [dto], adminStaff, Object.assign({
			source: financeConfig.PAYMENT_SOURCE.ADMIN,
			logSource: financeConfig.FINANCE_LOG_SOURCE.MINI_ADMIN,
			allowGenerateClientKey: true,
		}, options));
		return { orderId: ret.orderId, payment: ret.payments[0] || null, summary: ret.summary };
	}

	async voidPayment(paymentId, reason = '', adminStaff = null, options = {}) {
		this._assertCommissionHandled(options, '后台作废收款');
		let payment = await this._getPaymentByAnyId(paymentId);
		if (!payment) this.AppError('收款记录不存在');
		let after = await this._voidPaymentRecord(payment, reason || '作废收款', adminStaff, {
			logSource: options.logSource || financeConfig.FINANCE_LOG_SOURCE.MINI_ADMIN,
			action: options.action || 'VOID',
		});
		let summary = null;
		if (!options.skipRefresh) summary = await this.refreshOrderPaymentSummary(payment.PAYMENT_ORDER_ID, { operatorStaff: adminStaff });
		return { payment: after, summary };
	}

	async voidRefundDeduct(paymentId, reason = '', adminStaff = null, options = {}) {
		this._assertCommissionHandled(options, '后台作废退款/冲减');
		let payment = await this._getPaymentByAnyId(paymentId);
		if (!payment) this.AppError('收款记录不存在');
		if (payment.PAYMENT_STATUS != financeConfig.PAYMENT_STATUS.VOID) {
			let amountCent = moneyUtil.safeCent(payment.PAYMENT_AMOUNT_CENT, 0);
			let negativeDirection = payment.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.REFUND || payment.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.ADJUST;
			if (amountCent >= 0 && !negativeDirection) this.AppError('该记录不是退款/冲减记录，不能使用退款冲减作废');
		}
		return await this.voidPayment(paymentId, reason || '作废退款/冲减', adminStaff, Object.assign({ action: 'VOID_REFUND_DEDUCT', commissionHandled: true }, options));
	}

	buildPaymentSummary(payments = []) {
		if (!Array.isArray(payments)) payments = [];
		let summary = {
			count: 0,
			totalRecordCount: payments.length,
			effectiveCount: 0,
			voidCount: 0,
			totalCent: 0,
			incomeCent: 0,
			refundCent: 0,
			refundAbsCent: 0,
			adjustCent: 0,
			shootCent: 0,
			extraCent: 0,
			allBaseCent: 0,
			byType: {},
			byDirection: {},
			byBaseType: {},
			latestPaymentDate: '',
		};

		for (let payment of payments) {
			if (Number(payment.PAYMENT_STATUS || 0) != financeConfig.PAYMENT_STATUS.EFFECTIVE) {
				summary.voidCount++;
				continue;
			}
			summary.effectiveCount++;
			let cent = moneyUtil.safeCent(payment.PAYMENT_AMOUNT_CENT, 0);
			let direction = payment.PAYMENT_DIRECTION || (cent < 0 ? financeConfig.PAYMENT_DIRECTION.REFUND : financeConfig.PAYMENT_DIRECTION.INCOME);
			let type = payment.PAYMENT_TYPE || 'unknown';
			let baseType = payment.PAYMENT_BASE_TYPE || financeConfig.PAYMENT_BASE_TYPE.SHOOT;

			summary.totalCent += cent;
			if (direction == financeConfig.PAYMENT_DIRECTION.INCOME) summary.incomeCent += cent;
			else if (direction == financeConfig.PAYMENT_DIRECTION.REFUND) {
				summary.refundCent += cent;
				summary.refundAbsCent += Math.abs(cent);
			} else if (direction == financeConfig.PAYMENT_DIRECTION.ADJUST) summary.adjustCent += cent;

			if (baseType == financeConfig.PAYMENT_BASE_TYPE.EXTRA) summary.extraCent += cent;
			else if (baseType == financeConfig.PAYMENT_BASE_TYPE.ALL) summary.allBaseCent += cent;
			else summary.shootCent += cent;

			summary.byType[type] = moneyUtil.safeCent(summary.byType[type], 0) + cent;
			summary.byDirection[direction] = moneyUtil.safeCent(summary.byDirection[direction], 0) + cent;
			summary.byBaseType[baseType] = moneyUtil.safeCent(summary.byBaseType[baseType], 0) + cent;
			if (payment.PAYMENT_DATE && payment.PAYMENT_DATE > summary.latestPaymentDate) summary.latestPaymentDate = payment.PAYMENT_DATE;
		}

		summary.count = summary.effectiveCount;
		summary.totalAmount = moneyUtil.centToYuan(summary.totalCent);
		summary.incomeAmount = moneyUtil.centToYuan(summary.incomeCent);
		summary.refundAmount = moneyUtil.centToYuan(summary.refundCent);
		summary.refundAbsAmount = moneyUtil.centToYuan(summary.refundAbsCent);
		summary.adjustAmount = moneyUtil.centToYuan(summary.adjustCent);
		summary.shootAmount = moneyUtil.centToYuan(summary.shootCent);
		summary.extraAmount = moneyUtil.centToYuan(summary.extraCent);
		summary.allBaseAmount = moneyUtil.centToYuan(summary.allBaseCent);
		return summary;
	}

	_buildOrderFinanceStatus(order, summary) {
		if (!summary || summary.effectiveCount <= 0) return financeConfig.ORDER_FINANCE_STATUS.NONE;
		if (order && order.ORDER_STATUS == WorkOrderModel.STATUS.CANCEL) {
			return summary.totalCent == 0 ? financeConfig.ORDER_FINANCE_STATUS.BALANCED : financeConfig.ORDER_FINANCE_STATUS.CANCEL_PENDING;
		}
		return financeConfig.ORDER_FINANCE_STATUS.NORMAL;
	}

	async refreshOrderPaymentSummary(orderId, options = {}) {
		let order = await this._getOrder(orderId);
		let payments = await WorkPaymentModel.getAll({ PAYMENT_ORDER_ID: order._id }, '*', {
			PAYMENT_DATE: 'asc',
			PAYMENT_ADD_TIME: 'asc',
		}, 1000);
		let summary = this.buildPaymentSummary(payments);
		let before = {
			_id: order._id,
			ORDER_ID: order.ORDER_ID,
			ORDER_PAYMENT_SUMMARY: order.ORDER_PAYMENT_SUMMARY || {},
			ORDER_PAYMENT_SYNC_TIME: order.ORDER_PAYMENT_SYNC_TIME || 0,
			ORDER_FINANCE_STATUS: order.ORDER_FINANCE_STATUS || financeConfig.ORDER_FINANCE_STATUS.NONE,
			ORDER_STATUS: order.ORDER_STATUS,
		};
		let data = {
			ORDER_PAYMENT_SUMMARY: summary,
			ORDER_PAYMENT_SYNC_TIME: timeUtil.time(),
			ORDER_FINANCE_STATUS: this._buildOrderFinanceStatus(order, summary),
		};
		let updated = await WorkOrderModel.edit(order._id, data);
		if (updated != 1) this.AppError('订单收款摘要刷新失败');
		let after = Object.assign({}, before, data);
		await this._financeLog.log('REFRESH_PAYMENT_SUMMARY', 'order', order._id, before, after, {
			source: (options && options.logSource) || financeConfig.FINANCE_LOG_SOURCE.SYSTEM,
			operator: options.operatorStaff || options.adminStaff || null,
		});
		return summary;
	}

	async listPayments(params = {}, adminStaff = null) {
		params = params || {};
		let where = {};
		let keyword = this._text(params.keyword || params.search || '', 64);
		let orWhere = [];

		if (params.orderId) where.PAYMENT_ORDER_ID = this._text(params.orderId, 120);
		if (params.orderNo) where.PAYMENT_ORDER_NO = ['like', params.orderNo];
		if (params.staffId) where.PAYMENT_STAFF_ID = this._text(params.staffId, 120);
		if (params.type) where.PAYMENT_TYPE = this._normalizePaymentType(params.type);
		if (params.direction) where.PAYMENT_DIRECTION = this._normalizeDirection(params.direction, '');
		if (params.source) where.PAYMENT_SOURCE = this._text(params.source, 40);
		if (params.month) where.PAYMENT_MONTH = financeConfig.normalizeMonth(params.month);
		if (params.status !== undefined && params.status !== null && String(params.status).trim() !== '') where.PAYMENT_STATUS = Number(params.status);
		if (params.startDate && params.endDate) where.PAYMENT_DATE = ['between', this._normalizeDate(params.startDate), this._normalizeDate(params.endDate)];
		else if (params.startDate) where.PAYMENT_DATE = ['>=', this._normalizeDate(params.startDate)];
		else if (params.endDate) where.PAYMENT_DATE = ['<=', this._normalizeDate(params.endDate)];

		if (keyword) {
			orWhere.push({ PAYMENT_ORDER_NO: ['like', keyword] });
			orWhere.push({ PAYMENT_CUSTOMER_NAME: ['like', keyword] });
			orWhere.push({ PAYMENT_CUSTOMER_SURNAME: ['like', keyword] });
			orWhere.push({ PAYMENT_STAFF_NAME: ['like', keyword] });
		}

		return await WorkPaymentModel.getList(this._withProjectWhere(where, orWhere), '*', {
			PAYMENT_DATE: 'desc',
			PAYMENT_ADD_TIME: 'desc',
		}, this._page(params.page), this._size(params.size), params.isTotal !== false, Number(params.oldTotal || 0), false);
	}

	async searchOrders(params = {}, adminStaff = null) {
		params = params || {};
		let where = {};
		let keyword = this._text(params.keyword || params.search || '', 64);
		let orWhere = [];

		if (params.status !== undefined && params.status !== null && String(params.status).trim() !== '') where.ORDER_STATUS = Number(params.status);
		if (params.financeStatus !== undefined && params.financeStatus !== null && String(params.financeStatus).trim() !== '') where.ORDER_FINANCE_STATUS = Number(params.financeStatus);
		if (params.month) {
			let month = financeConfig.normalizeMonth(params.month);
			if (month) where.ORDER_DATE = ['between', month + '-01', month + '-31'];
		}
		if (params.startDate && params.endDate) where.ORDER_DATE = ['between', this._normalizeDate(params.startDate), this._normalizeDate(params.endDate)];
		else if (params.startDate) where.ORDER_DATE = ['>=', this._normalizeDate(params.startDate)];
		else if (params.endDate) where.ORDER_DATE = ['<=', this._normalizeDate(params.endDate)];

		if (keyword) {
			orWhere.push({ ORDER_ID: ['like', keyword] });
			orWhere.push({ ORDER_CUSTOMER_NAME: ['like', keyword] });
			orWhere.push({ ORDER_CUSTOMER_SURNAME: ['like', keyword] });
			orWhere.push({ ORDER_TYPE_NAME: ['like', keyword] });
		}

		let fields = '_id,ORDER_ID,ORDER_DATE,ORDER_TIME,ORDER_TYPE_NAME,ORDER_CUSTOMER_NAME,ORDER_CUSTOMER_SURNAME,ORDER_AMOUNT,ORDER_AMOUNT_CENT,ORDER_PAYMENT_SUMMARY,ORDER_PAYMENT_SYNC_TIME,ORDER_FINANCE_STATUS,ORDER_PROGRESS,ORDER_SETTLE_STATUS,ORDER_STATUS,ORDER_CANCEL_REASON';
		return await WorkOrderModel.getList(this._withProjectWhere(where, orWhere), fields, {
			ORDER_DATE: 'desc',
			ORDER_ADD_TIME: 'desc',
		}, this._page(params.page), this._size(params.size), params.isTotal !== false, Number(params.oldTotal || 0), false);
	}

	async cancelOrderWithFinanceCheck(orderId, reason = '', operatorStaff = null, options = {}) {
		let order = await this._getOrder(orderId);
		if (order.ORDER_STATUS == WorkOrderModel.STATUS.CANCEL) {
			return { canceled: true, alreadyCanceled: true, orderId: order._id };
		}
		let payments = await WorkPaymentModel.getAll({
			PAYMENT_ORDER_ID: order._id,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		}, '*', { PAYMENT_DATE: 'asc' }, 1000);
		let summary = this.buildPaymentSummary(payments);
		if (summary.totalCent !== 0) {
			await WorkOrderModel.edit(order._id, {
				ORDER_FINANCE_STATUS: financeConfig.ORDER_FINANCE_STATUS.CANCEL_PENDING,
				ORDER_PAYMENT_SUMMARY: summary,
				ORDER_PAYMENT_SYNC_TIME: timeUtil.time(),
			});
			return {
				canceled: false,
				needFinance: true,
				orderId: order._id,
				summary,
				message: '该订单收款合计不为0，请先作废或录入退款/冲减后再取消',
			};
		}

		let operator = this._operatorSnapshot(operatorStaff);
		let before = {
			_id: order._id,
			ORDER_ID: order.ORDER_ID,
			ORDER_STATUS: order.ORDER_STATUS,
			ORDER_CANCEL_REASON: order.ORDER_CANCEL_REASON || '',
			ORDER_FINANCE_STATUS: order.ORDER_FINANCE_STATUS || financeConfig.ORDER_FINANCE_STATUS.NONE,
			ORDER_PAYMENT_SUMMARY: order.ORDER_PAYMENT_SUMMARY || {},
			ORDER_PAYMENT_SYNC_TIME: order.ORDER_PAYMENT_SYNC_TIME || 0,
		};
		let data = {
			ORDER_STATUS: WorkOrderModel.STATUS.CANCEL,
			ORDER_CANCEL_REASON: this._text(reason || '', 300),
			ORDER_CANCEL_STAFF_ID: operator.id,
			ORDER_CANCEL_STAFF_NAME: operator.name,
			ORDER_CANCEL_TIME: timeUtil.time(),
			ORDER_FINANCE_STATUS: summary.effectiveCount > 0 ? financeConfig.ORDER_FINANCE_STATUS.BALANCED : financeConfig.ORDER_FINANCE_STATUS.NONE,
			ORDER_PAYMENT_SUMMARY: summary,
			ORDER_PAYMENT_SYNC_TIME: timeUtil.time(),
		};
		let updated = await WorkOrderModel.edit(order._id, data);
		if (updated != 1) this.AppError('订单取消失败，请刷新后重试');
		let after = Object.assign({}, before, data);
		await this._financeLog.log('CANCEL_ORDER_NO_PAYMENT', 'order', order._id, before, after, {
			source: options.logSource || financeConfig.FINANCE_LOG_SOURCE.SYSTEM,
			operator: operatorStaff,
			note: reason,
		});
		return { canceled: true, needFinance: false, orderId: order._id };
	}
}

module.exports = WorkPaymentService;
