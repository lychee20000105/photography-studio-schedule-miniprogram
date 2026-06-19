/**
 * Notes: 云屿摄影内部档期工作台
 */

const BaseProjectService = require('./base_project_service.js');
const WorkPermissionService = require('./work_permission_service.js');
const WorkPaymentService = require('./work_payment_service.js');
const WorkCommissionService = require('./work_commission_service.js');
const WorkPayrollService = require('./work_payroll_service.js');
const financeConfig = require('./work_finance_config.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const dataUtil = require('../../../framework/utils/data_util.js');

const WorkStaffModel = require('../model/work_staff_model.js');
const WorkTypeModel = require('../model/work_type_model.js');
const WorkOrderModel = require('../model/work_order_model.js');
const WorkNoteModel = require('../model/work_note_model.js');
const WorkItemModel = require('../model/work_item_model.js');
const WorkRestModel = require('../model/work_rest_model.js');
const WorkMessageModel = require('../model/work_message_model.js');
const WorkPayrollModel = require('../model/work_payroll_model.js');
const WorkCommissionModel = require('../model/work_commission_model.js');
const WorkCustomerModel = require('../model/work_customer_model.js');

const DEFAULT_ROLES = ['销售', '摄影', '摄像', '化妆', '选片', '后期', '助理', '运营'];
const DEFAULT_SOURCES = ['直客', '合作方', '转介绍', '小红书', '抖音', '视频号', '微信', '其他'];
const FEEDBACK_BOX_STAFF_ID = '__ADMIN_FEEDBACK__';
const DEFAULT_TYPES = [
	['跟拍', '#d9001b'],
	['生日跟拍', '#ff7a70'],
	['百日宴', '#ff8a00'],
	['婚礼跟拍', '#d9001b'],
	['订婚宴', '#bf2bd6'],
	['寿宴跟拍', '#c43ac9'],
	['乔迁跟拍', '#e85d04'],
	['活动跟拍', '#d9001b'],
	['内景写真', '#2f6f4e'],
	['外景写真', '#2f6df6'],
	['艺术肖像', '#9c27b0'],
	['商拍', '#9b6bc7'],
	['亲子照', '#c12bd4'],
	['证件照', '#a57ad1'],
	['化妆', '#92008d'],
	['摄像', '#0052cc'],
	['选片', '#00a3a3'],
	['其他', '#49cdbf', 1],
];

class WorkService extends BaseProjectService {

	constructor() {
		super();
		this._permission = new WorkPermissionService();
		this._payment = new WorkPaymentService();
		this._commission = new WorkCommissionService();
		this._payroll = new WorkPayrollService();
	}

	getDefaultRoles() {
		return DEFAULT_ROLES;
	}

	getDefaultSources() {
		return DEFAULT_SOURCES;
	}

	async ensureDefaults() {
		let cnt = await WorkTypeModel.count({});
		if (cnt == 0) {
			for (let i = 0; i < DEFAULT_TYPES.length; i++) {
				await WorkTypeModel.insert({
					TYPE_NAME: DEFAULT_TYPES[i][0],
					TYPE_COLOR: DEFAULT_TYPES[i][1],
					TYPE_ORDER: i + 1,
					TYPE_IS_OTHER: DEFAULT_TYPES[i][2] || 0,
					TYPE_STATUS: 1,
				});
			}
		}
	}

	_money(val) {
		if (val === undefined || val === null || String(val).trim() === '') return 0;
		let str = String(val).trim().replace(/,/g, '');
		if (!/^-?\d+(\.\d+)?$/.test(str)) this.AppError('金额必须是合法数字');
		val = Number(str);
		if (!Number.isFinite(val)) this.AppError('金额必须是合法数字');
		return Math.round(val * 100) / 100;
	}

	_moneyCent(val, label = '金额') {
		if (val === undefined || val === null || String(val).trim() === '') return 0;
		let cent = this._moneyCentStrict(val, label);
		if (cent < 0) this.AppError(label + '不能为负数');
		return cent;
	}

	_getSurname(name) {
		name = String(name || '').trim();
		return name ? name.substr(0, 1) : '';
	}

	_getRoleBase(roleName) {
		roleName = String(roleName || '');
		if (roleName.includes('选片') || roleName.includes('产品')) return 'extra';
		return 'shoot';
	}

	_monthRange(month) {
		if (!month) month = timeUtil.time('Y-M');
		let arr = month.split('-');
		let y = Number(arr[0]);
		let m = Number(arr[1]);
		let endDay = new Date(y, m, 0).getDate();
		return {
			month,
			start: month + '-01',
			end: month + '-' + String(endDay).padStart(2, '0'),
		};
	}

	_getProgressDesc(val) {
		return WorkOrderModel.getDesc('PROGRESS', Number(val || 10));
	}

	_getSettleDesc(val) {
		return WorkOrderModel.getDesc('SETTLE', Number(val || 0));
	}

	async getStaffByOpenId(openId, must = true) {
		return await this._permission.getStaffByOpenId(openId, must);
	}

	async getMe(openId) {
		let staff = await this.getStaffByOpenId(openId, false);
		if (!staff) return { isBind: false };

		await this._permission.touchLogin(staff._id);
		return {
			isBind: true,
			staff: this._cleanStaff(staff, true, true),
		};
	}

	async bindStaff(openId, mobile, code) {
		let staff = await WorkStaffModel.getOne({
			STAFF_MOBILE: mobile,
			STAFF_BIND_CODE: code,
		});
		if (!staff) this.AppError('手机号或绑定码不正确');
		if (staff.STAFF_STATUS != WorkStaffModel.STATUS.COMM) this.AppError('该员工已停用，无法绑定');

		if (staff.STAFF_OPENID && staff.STAFF_OPENID != openId) this.AppError('该员工已绑定其他微信，请联系管理员');

		let bindList = await this._permission.getEnabledStaffListByOpenId(openId);
		let other = bindList.find(item => item._id != staff._id);
		if (other) this.AppError('当前微信已绑定其他启用员工，请联系管理员');

		let data = {
			STAFF_OPENID: openId,
			STAFF_OPENID_BIND_STATUS: 1,
			STAFF_LOGIN_TIME: timeUtil.time(),
		};
		if (!staff.STAFF_OPENID_BIND_TIME) data.STAFF_OPENID_BIND_TIME = data.STAFF_LOGIN_TIME;

		await WorkStaffModel.edit(staff._id, data);
		staff.STAFF_OPENID = openId;
		staff.STAFF_OPENID_BIND_STATUS = 1;
		if (!staff.STAFF_OPENID_BIND_TIME) staff.STAFF_OPENID_BIND_TIME = data.STAFF_OPENID_BIND_TIME;
		return this._cleanStaff(staff, true, true);
	}

	_cleanStaff(staff, withRules = false, withPrivate = false) {
		return this._permission.cleanStaff(staff, withRules, withPrivate);
	}

	async getOptions(openId) {
		await this.ensureDefaults();
		let staff = await this.getStaffByOpenId(openId, false);
		let types = await WorkTypeModel.getAll({
			TYPE_STATUS: 1,
		}, 'TYPE_NAME,TYPE_COLOR,TYPE_ORDER,TYPE_IS_OTHER', {
			TYPE_ORDER: 'asc',
			TYPE_ADD_TIME: 'asc',
		}, 1000);

		let staffList = [];
		if (staff) {
			staffList = await WorkStaffModel.getAll({
				STAFF_STATUS: WorkStaffModel.STATUS.COMM,
			}, 'STAFF_NAME,STAFF_ROLES,STAFF_STATUS', {
				STAFF_NAME: 'asc',
			}, 1000);
		}

		let finance = {
			cutover: { month: financeConfig.getCutoverMonth() },
			cutoverMonth: financeConfig.getCutoverMonth(),
			paymentTypes: financeConfig.PAYMENT_TYPE,
			baseTypes: financeConfig.PAYMENT_BASE_TYPE,
			directions: financeConfig.PAYMENT_DIRECTION,
			paymentStatus: financeConfig.PAYMENT_STATUS,
			orderFinanceStatus: financeConfig.ORDER_FINANCE_STATUS,
			orderCommissionStatus: financeConfig.ORDER_COMMISSION_STATUS,
		};

		return {
			staff: staff ? this._cleanStaff(staff, true, true) : null,
			roles: DEFAULT_ROLES,
			sources: DEFAULT_SOURCES,
			types,
			staffList: staffList.map(item => this._cleanStaff(item, false, staff.STAFF_IS_ADMIN == 1)),
			finance,
			progressOptions: [
				{ label: '已定档', value: WorkOrderModel.PROGRESS.BOOKED },
				{ label: '已拍摄', value: WorkOrderModel.PROGRESS.SHOT },
				{ label: '已选片', value: WorkOrderModel.PROGRESS.SELECTED },
				{ label: '已完成', value: WorkOrderModel.PROGRESS.DONE },
			],
			calcModes: [
				{ label: '按比例', value: 'percent' },
				{ label: '固定金额', value: 'fixed' },
				{ label: '手动金额', value: 'manual' },
				{ label: '不计提成', value: 'none' },
			],
		};
	}

	_canSeeFullOrder(order, staff) {
		if (!order || !staff) return false;
		if (staff.STAFF_IS_ADMIN == 1) return true;
		if (order.ORDER_CREATOR_STAFF_ID == staff._id || order.ORDER_CREATOR_OPENID == staff.STAFF_OPENID) return true;
		return this._isParticipant(order, staff._id);
	}

	_canEditOrder(order, staff) {
		if (!order || !staff) return false;
		if (staff.STAFF_IS_ADMIN == 1) return true;
		return order.ORDER_CREATOR_STAFF_ID == staff._id || order.ORDER_CREATOR_OPENID == staff.STAFF_OPENID;
	}

	_isParticipant(order, staffId) {
		let participants = order.ORDER_PARTICIPANTS || [];
		return participants.some(item => item.staffId == staffId);
	}

	_isCreator(order, staff) {
		if (!order || !staff) return false;
		return order.ORDER_CREATOR_STAFF_ID == staff._id || order.ORDER_CREATOR_OPENID == staff.STAFF_OPENID;
	}

	_isInCalendarScope(order, staff, scope) {
		if (scope == 'joined') return this._isParticipant(order, staff._id);
		if (scope == 'created' || scope == 'mine') return this._isCreator(order, staff);
		return true;
	}

	_isItemInCalendarScope(item, staff, scope) {
		if (scope == 'joined') return false;
		if (scope == 'created' || scope == 'mine') return item.ITEM_CREATOR_STAFF_ID == staff._id || item.ITEM_CREATOR_OPENID == staff.STAFF_OPENID;
		return true;
	}

	_isRestInCalendarScope(rest, staff, scope) {
		if (scope == 'joined') return rest.REST_STAFF_ID == staff._id;
		if (scope == 'created' || scope == 'mine') return rest.REST_STAFF_ID == staff._id;
		return true;
	}

	_hasInputValue(value) {
		return value !== undefined && value !== null && String(value).trim() !== '';
	}

	_centInput(val, fallback, label = '金额分') {
		if (val !== undefined && val !== null) {
			let str = String(val).trim();
			if (!str) this.AppError(label + '不能为空');
			if (str.startsWith('-')) this.AppError(label + '不能为负数');
			if (!/^\d+$/.test(str)) this.AppError(label + '必须是整数');
			let cent = Number(str);
			if (!Number.isSafeInteger(cent)) this.AppError(label + '必须是安全整数');
			return cent;
		}

		if (fallback === undefined || fallback === null || String(fallback).trim() === '') return 0;
		let str = String(fallback).trim();
		if (str.startsWith('-')) this.AppError(label + '不能为负数');
		if (!/^\d+$/.test(str)) this.AppError(label + '默认值不合法');
		let cent = Number(str);
		if (!Number.isSafeInteger(cent)) this.AppError(label + '默认值不合法');
		return cent;
	}

	_safeCentSnapshot(value, fallback = 0, label = '金额分') {
		if (value === undefined || value === null || String(value).trim() === '') return fallback;
		return this._centInput(value, fallback, label);
	}

	_legacyYuanToCentSnapshot(value, label = '金额') {
		if (value === undefined || value === null || String(value).trim() === '') return 0;
		return this._moneyCent(value, label);
	}

	_financeDueCentSnapshot(centValue, legacyYuanValue, label = '金额分', legacyLabel = '金额', zeroMeansMissing = false) {
		let legacyCent = this._legacyYuanToCentSnapshot(legacyYuanValue, legacyLabel);
		let cent = this._safeCentSnapshot(centValue, null, label);
		if (cent === null) return legacyCent;
		if (zeroMeansMissing && cent === 0 && legacyCent > 0) return legacyCent;
		return cent;
	}

	_normalizeParticipantBaseType(item = {}) {
		let baseType = String(item.baseType || item.BASE_TYPE || item.base || item.PAYMENT_BASE_TYPE || item.COMMISSION_BASE_TYPE || '').trim().toLowerCase();
		if (baseType == financeConfig.PAYMENT_BASE_TYPE.EXTRA || baseType == 'extra' || baseType == 'product' || baseType == 'products' || baseType == '加选' || baseType == '产品') return financeConfig.PAYMENT_BASE_TYPE.EXTRA;
		if (baseType == financeConfig.PAYMENT_BASE_TYPE.ALL || baseType == 'all' || baseType == 'whole' || baseType == 'total' || baseType == 'order' || baseType == '整单' || baseType == '全部') return financeConfig.PAYMENT_BASE_TYPE.ALL;
		if (baseType == financeConfig.PAYMENT_BASE_TYPE.SHOOT || baseType == 'shoot' || baseType == 'shooting' || baseType == 'photo' || baseType == '拍摄') return financeConfig.PAYMENT_BASE_TYPE.SHOOT;
		return this._getRoleBase(item.roleName || item.ROLE_NAME || item.role || '');
	}

	_hasMeaningfulPaymentValue(value) {
		if (value === undefined || value === null) return false;
		if (typeof value == 'boolean') return value === true;
		if (typeof value == 'number') return value !== 0;
		if (typeof value == 'string') {
			let str = value.trim();
			if (str === '' || str.toLowerCase() === 'false') return false;
			if (/^-?\d+(\.\d+)?$/.test(str)) return Number(str) !== 0;
			return true;
		}
		if (Array.isArray(value)) return value.length > 0;
		if (typeof value == 'object') return Object.keys(value).length > 0;
		return true;
	}

	_pickPaymentValue(dto, fields) {
		dto = dto || {};
		for (let field of fields) {
			if (this._hasInputValue(dto[field])) return dto[field];
		}
		return undefined;
	}

	_hasPaymentIdentifier(dto = {}) {
		return this._pickPaymentValue(dto, ['_id', 'id', 'PAYMENT_ID', 'PAYMENT_BIZ_KEY', 'bizKey', 'PAYMENT_CLIENT_KEY', 'clientKey', 'key']) !== undefined;
	}

	_hasOrderPaymentDto(dto) {
		if (!dto) return false;
		if (typeof dto != 'object' || Array.isArray(dto)) return this._hasMeaningfulPaymentValue(dto);
		let meaningfulFields = [
			'_id', 'id', 'PAYMENT_ID', 'PAYMENT_BIZ_KEY', 'bizKey', 'PAYMENT_CLIENT_KEY', 'clientKey', 'key',
			'PAYMENT_TYPE', 'type', 'PAYMENT_DIRECTION', 'direction', 'PAYMENT_BASE_TYPE', 'baseType',
			'PAYMENT_AMOUNT', 'amount', 'paymentAmount', 'PAYMENT_DATE', 'PAYMENT_PAY_DATE', 'date', 'payDate',
			'PAYMENT_MONTH', 'month', 'PAYMENT_STAFF_ID', 'PAYMENT_OWNER_STAFF_ID', 'staffId', 'ownerStaffId',
			'PAYMENT_REF_PAYMENT_ID', 'refPaymentId', 'PAYMENT_NOTE', 'note', 'remark', 'IS_DELETE', 'status'
		];
		for (let field of meaningfulFields) {
			if (this._hasMeaningfulPaymentValue(dto[field])) return true;
		}
		let centRaw = this._pickPaymentValue(dto, ['PAYMENT_AMOUNT_CENT', 'amountCent']);
		if (centRaw === undefined) return false;
		if (!this._hasMeaningfulPaymentValue(centRaw)) return false;
		let str = String(centRaw).trim();
		if (!str) return false;
		if (/^-?\d+$/.test(str)) return Number(str) != 0;
		return true;
	}

	_isDeletePaymentDto(dto = {}) {
		return dto.IS_DELETE === true || dto.IS_DELETE == 1 || Number(dto.PAYMENT_STATUS || 0) == financeConfig.PAYMENT_STATUS.VOID || dto.status == 'delete' || dto.status == 'void';
	}

	_normalizePaymentTypeForValidate(type) {
		type = String(type || '').trim().toLowerCase();
		let valid = Object.values(financeConfig.PAYMENT_TYPE);
		if (!type) this.AppError('收款类型不能为空');
		if (!valid.includes(type)) this.AppError('收款类型不合法');
		return type;
	}

	_normalizePaymentDirectionForValidate(direction) {
		direction = String(direction || '').trim().toLowerCase();
		let valid = Object.values(financeConfig.PAYMENT_DIRECTION);
		if (!direction) this.AppError('收款方向不能为空');
		if (!valid.includes(direction)) this.AppError('收款方向不合法');
		return direction;
	}

	_moneyCentStrict(val, label = '金额') {
		if (val === undefined || val === null || String(val).trim() === '') this.AppError(label + '不能为空');
		let str = String(val).trim().replace(/,/g, '');
		if (!/^-?\d+(\.\d{1,2})?$/.test(str)) this.AppError(label + '必须是合法金额');

		let negative = str.startsWith('-');
		if (negative) str = str.substring(1);
		let parts = str.split('.');
		let yuan = Number(parts[0] || 0);
		let frac = (parts[1] || '').padEnd(2, '0');
		let cent = yuan * 100 + Number(frac || 0);
		if (negative) cent = -cent;
		if (!Number.isSafeInteger(cent)) this.AppError(label + '金额过大');
		return cent;
	}

	_paymentAmountCentForValidate(dto = {}) {
		let centRaw = this._pickPaymentValue(dto, ['PAYMENT_AMOUNT_CENT', 'amountCent']);
		if (centRaw !== undefined) {
			let str = String(centRaw).trim();
			if (!/^-?\d+$/.test(str)) this.AppError('收款金额分必须是整数');
			let cent = Number(str);
			if (!Number.isSafeInteger(cent)) this.AppError('收款金额分必须是安全整数');
			return cent;
		}

		let yuanRaw = this._pickPaymentValue(dto, ['PAYMENT_AMOUNT', 'amount', 'paymentAmount']);
		if (yuanRaw !== undefined) return this._moneyCentStrict(yuanRaw, '收款金额');
		this.AppError('缺少收款金额');
	}

	async _validateOrderPaymentsBeforeSave(orderPayments, order = {}, operatorStaff = null) {
		if (!orderPayments.length) return;
		for (let dto of orderPayments) {
			if (!dto || typeof dto != 'object' || Array.isArray(dto)) this.AppError('收款数据格式错误');

			if (this._isDeletePaymentDto(dto)) {
				if (!this._hasPaymentIdentifier(dto)) this.AppError('作废收款缺少记录标识');
				continue;
			}

			let clientKey = this._pickPaymentValue(dto, ['PAYMENT_CLIENT_KEY', 'clientKey', 'key']);
			if (!clientKey) this.AppError('缺少收款幂等key');

			let type = this._normalizePaymentTypeForValidate(this._pickPaymentValue(dto, ['PAYMENT_TYPE', 'type']));
			let direction = this._normalizePaymentDirectionForValidate(this._pickPaymentValue(dto, ['PAYMENT_DIRECTION', 'direction']));
			if (type == financeConfig.PAYMENT_TYPE.REFUND && direction != financeConfig.PAYMENT_DIRECTION.REFUND) this.AppError('退款类型必须使用退款方向');
			if (type == financeConfig.PAYMENT_TYPE.ADJUST && direction != financeConfig.PAYMENT_DIRECTION.ADJUST) this.AppError('冲减类型必须使用冲减方向');
			if (direction == financeConfig.PAYMENT_DIRECTION.REFUND && type != financeConfig.PAYMENT_TYPE.REFUND) this.AppError('退款方向必须使用退款类型');
			if (direction == financeConfig.PAYMENT_DIRECTION.ADJUST && type != financeConfig.PAYMENT_TYPE.ADJUST) this.AppError('冲减方向必须使用冲减类型');

			let baseType = this._pickPaymentValue(dto, ['PAYMENT_BASE_TYPE', 'baseType']);
			if (baseType !== undefined && !Object.values(financeConfig.PAYMENT_BASE_TYPE).includes(String(baseType).trim().toLowerCase())) this.AppError('收款基数类型不合法');

			let amountCent = this._paymentAmountCentForValidate(dto);
			if (direction == financeConfig.PAYMENT_DIRECTION.INCOME && amountCent <= 0) this.AppError('收入收款金额必须大于0');
			if ((direction == financeConfig.PAYMENT_DIRECTION.REFUND || direction == financeConfig.PAYMENT_DIRECTION.ADJUST) && amountCent == 0) this.AppError('退款/冲减金额不能为0');

			let date = this._pickPaymentValue(dto, ['PAYMENT_DATE', 'PAYMENT_PAY_DATE', 'date', 'payDate']);
			if (date !== undefined) {
				date = String(date).trim().replace(/\//g, '-');
				if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) this.AppError('收款日期格式错误');
			}

			let month = this._pickPaymentValue(dto, ['PAYMENT_MONTH', 'month']);
			if (month !== undefined && !financeConfig.normalizeMonth(month)) this.AppError('收款月份格式错误');

			if (this._pickPaymentValue(dto, ['PAYMENT_STAFF_ID', 'PAYMENT_OWNER_STAFF_ID', 'staffId', 'ownerStaffId']) !== undefined
				&& this._payment && typeof this._payment.resolvePaymentOwner == 'function') {
				await this._payment.resolvePaymentOwner(dto, order, operatorStaff);
			}
		}
	}

	_participantFinanceSnapshot(participants) {
		return (participants || []).map(item => ({
			id: item.id || '',
			staffId: item.staffId || '',
			roleName: item.roleName || '',
			calcMode: item.calcMode || '',
			baseType: this._normalizeParticipantBaseType(item),
			percent: this._money(item.percent),
			fixedAmount: this._money(item.fixedAmount),
			manualAmount: this._money(item.manualAmount),
			amount: this._money(item.amount),
		})).sort((a, b) => {
			let ak = [a.id, a.staffId, a.roleName, a.baseType, a.calcMode].join('|');
			let bk = [b.id, b.staffId, b.roleName, b.baseType, b.calcMode].join('|');
			return ak > bk ? 1 : (ak < bk ? -1 : 0);
		});
	}

	_participantsChanged(oldParticipants, newParticipants) {
		let oldSnap = this._participantFinanceSnapshot(oldParticipants);
		let newSnap = this._participantFinanceSnapshot(newParticipants);
		return JSON.stringify(oldSnap) != JSON.stringify(newSnap);
	}

	_financeBaseSnapshot(order) {
		order = order || {};
		let shootCent = this._financeDueCentSnapshot(order.ORDER_SHOOT_DUE_CENT, order.ORDER_AMOUNT, '拍摄应收分', '订单总应收', true);
		let extraCent = this._financeDueCentSnapshot(order.ORDER_EXTRA_DUE_CENT, order.ORDER_EXTRA, '加选应收分', '加选金额', true);

		let amountCent = this._safeCentSnapshot(order.ORDER_AMOUNT_CENT, null, '订单总应收分');
		if (amountCent === null) amountCent = shootCent + extraCent;
		else if (amountCent === 0 && shootCent + extraCent > 0) amountCent = shootCent + extraCent;

		return {
			ORDER_AMOUNT_CENT: amountCent,
			ORDER_SHOOT_DUE_CENT: shootCent,
			ORDER_EXTRA_DUE_CENT: extraCent,
			ORDER_AMOUNT: this._money(order.ORDER_AMOUNT),
			ORDER_EXTRA: this._money(order.ORDER_EXTRA),
		};
	}

	_financeBaseChanged(oldOrder, newOrder) {
		let oldSnap = this._financeBaseSnapshot(oldOrder);
		let newSnap = this._financeBaseSnapshot(newOrder);
		return JSON.stringify(oldSnap) != JSON.stringify(newSnap);
	}

	_hasSettlementMarker(item = {}) {
		return Number(item.isSettled || item.IS_SETTLED || 0) == 1
			|| !!(item.settledPayrollId || item.SETTLED_PAYROLL_ID || item.payrollId || item.PAYROLL_ID)
			|| Number(item.settledTime || item.SETTLED_TIME || 0) > 0
			|| !!(item.settledMonth || item.SETTLED_MONTH || item.payrollMonth || item.PAYROLL_MONTH);
	}

	_payrollContainsOrder(payroll, order) {
		let keys = [order && order._id, order && order.ORDER_ID].filter(item => item !== undefined && item !== null && String(item).trim() !== '').map(item => String(item));
		if (!keys.length) return false;

		let fields = ['orderId', 'ORDER_ID', 'ORDER_ORDER_ID', 'COMMISSION_ORDER_ID', 'PAYMENT_ORDER_ID'];
		let arrays = [payroll.PAYROLL_ITEMS, payroll.PAYROLL_ADJUSTMENTS, payroll.PAYROLL_COMMISSION_REFS];
		for (let arr of arrays) {
			if (!Array.isArray(arr)) continue;
			for (let item of arr) {
				if (!item || typeof item != 'object') continue;
				for (let field of fields) {
					if (item[field] !== undefined && item[field] !== null && keys.includes(String(item[field]))) return true;
				}
			}
		}
		return false;
	}

	async _hasPayrollOrderMarker(oldOrder) {
		let page = 1;
		let size = 1000;
		let total = 0;
		let fields = 'PAYROLL_ID,PAYROLL_ITEMS,PAYROLL_ADJUSTMENTS,PAYROLL_COMMISSION_REFS,PAYROLL_STATUS';
		let orderBy = {
			PAYROLL_ADD_TIME: 'desc',
		};

		while (true) {
			let data = await WorkPayrollModel.getList({}, fields, orderBy, page, size, page == 1, total);
			let list = (data && data.list) || [];
			if (page == 1) total = Number(data.total || 0);
			if (list.some(payroll => this._payrollContainsOrder(payroll, oldOrder))) return true;
			if (!list.length || list.length < size) break;
			if (data.count && page >= data.count) break;
			page++;
		}

		return false;
	}

	async _hasLegacySettlementLock(oldOrder) {
		if (!oldOrder) return false;
		let settleStatus = Number(oldOrder.ORDER_SETTLE_STATUS || 0);
		if (settleStatus == WorkOrderModel.SETTLE.WAIT_PAY || settleStatus == WorkOrderModel.SETTLE.PAID) return true;
		if ((oldOrder.ORDER_PARTICIPANTS || []).some(item => this._hasSettlementMarker(item))) return true;
		if ((oldOrder.ORDER_ADJUSTMENTS || []).some(item => this._hasSettlementMarker(item))) return true;
		return await this._hasPayrollOrderMarker(oldOrder);
	}

	async _hasEffectiveOrderCommission(oldOrder) {
		if (!oldOrder) return false;
		let orderKeys = [oldOrder._id, oldOrder.ORDER_ID].filter(item => item !== undefined && item !== null && String(item).trim() !== '').map(item => String(item));
		for (let orderKey of orderKeys) {
			let count = await WorkCommissionModel.count({
				COMMISSION_ORDER_ID: orderKey,
				COMMISSION_STATUS: ['!=', financeConfig.COMMISSION_STATUS.VOID],
				COMMISSION_KIND: ['!=', financeConfig.COMMISSION_KIND.VOID],
			});
			if (count > 0) return true;
		}
		return false;
	}

	async _hasOrderLedgerLock(oldOrder) {
		if (!oldOrder) return false;
		if (Number(oldOrder.ORDER_PAYMENT_SYNC_TIME || 0) > 0) return true;
		if (Number(oldOrder.ORDER_FINANCE_STATUS || 0) != financeConfig.ORDER_FINANCE_STATUS.NONE) return true;
		if (Number(oldOrder.ORDER_COMMISSION_STATUS || 0) != financeConfig.ORDER_COMMISSION_STATUS.NONE) return true;
		if (await this._hasEffectiveOrderCommission(oldOrder)) return true;

		let summary = oldOrder.ORDER_PAYMENT_SUMMARY || {};
		if (Number(summary.totalRecordCount || summary.effectiveCount || summary.count || summary.voidCount || 0) > 0) return true;

		let payments = await this._payment.getOrderPayments(oldOrder._id, { includeVoid: true });
		return Array.isArray(payments) && payments.length > 0;
	}

	async _assertCanChangeFinanceSnapshot(oldOrder, newData, newParticipants) {
		if (!oldOrder) return;
		let participantsChanged = this._participantsChanged(oldOrder.ORDER_PARTICIPANTS, newParticipants);
		let financeBaseChanged = this._financeBaseChanged(oldOrder, newData);
		if (!participantsChanged && !financeBaseChanged) return;

		if (await this._hasLegacySettlementLock(oldOrder)) this.AppError('该订单已有结算或工资记录，禁止直接修改参与人/应收基数，请走财务调整流程');
		if (await this._hasOrderLedgerLock(oldOrder)) this.AppError('该订单已有财务账本记录，禁止直接修改参与人/应收基数，请走财务调整流程');
		await this._commission.assertCanChangeParticipants(oldOrder._id);
	}

	_extractPayments(ret) {
		if (!ret) return [];
		if (Array.isArray(ret)) return ret;
		if (Array.isArray(ret.payments)) return ret.payments;
		if (Array.isArray(ret.list)) return ret.list;
		if (ret.payment) return [ret.payment];
		if (ret.data) return this._extractPayments(ret.data);
		return [];
	}

	_assertCommissionVoidNotBlocked(ret, action = '收款提成同步') {
		let blocked = ret && Array.isArray(ret.blocked) ? ret.blocked : [];
		if (!blocked.length) return;

		let first = blocked[0] || {};
		let msg = action + '失败：存在无法安全作废/反向调整的提成记录';
		if (first.commissionId) msg += '（' + first.commissionId + '）';
		if (first.kind) msg += '[' + first.kind + ']';
		if (first.reason) msg += '：' + first.reason;
		if (blocked.length > 1) msg += '；另有' + (blocked.length - 1) + '条';
		this.AppError(msg);
	}

	async _preflightPaymentCommissionVoid(payment, reason = '', operatorStaff = null, action = '收款提成同步') {
		if (!payment || Number(payment.PAYMENT_STATUS || 0) == financeConfig.PAYMENT_STATUS.VOID) return;
		let ret = await this._commission.voidCommissionsByPayment(payment, reason, operatorStaff, { dryRun: true });
		this._assertCommissionVoidNotBlocked(ret, action);
	}

	async _preflightOrderPaymentCommissionVoids(orderId, paymentDtos, operatorStaff) {
		paymentDtos = paymentDtos || [];
		if (!paymentDtos.length) return;
		let order = await WorkOrderModel.getOne(orderId);
		if (!order) this.AppError('订单不存在');

		for (let dto of paymentDtos) {
			if (!dto) continue;
			let existing = null;
			if (this._payment && typeof this._payment._findPaymentForDto == 'function') {
				existing = await this._payment._findPaymentForDto(order._id, dto);
			}
			if (!existing) continue;

			if (this._isDeletePaymentDto(dto)) {
				await this._preflightPaymentCommissionVoid(existing, dto.PAYMENT_VOID_REASON || dto.reason || '订单编辑作废收款', operatorStaff, '收款作废同步提成');
				continue;
			}

			if (Number(existing.PAYMENT_STATUS || 0) == financeConfig.PAYMENT_STATUS.VOID) continue;
			if (this._payment && typeof this._payment._buildPaymentData == 'function' && typeof this._payment._financialChanged == 'function') {
				let nextData = await this._payment._buildPaymentData(order, dto, operatorStaff, { existing });
				if (this._payment._financialChanged(existing, nextData)) {
					await this._preflightPaymentCommissionVoid(existing, '收款财务字段变更，预检查旧版本提成', operatorStaff, '收款替换同步提成');
				}
			}
		}
	}

	async _syncOrderFinanceAfterSave(orderId, paymentDtos, operatorStaff, options = {}) {
		paymentDtos = (paymentDtos || []).filter(dto => this._hasOrderPaymentDto(dto));
		if (!paymentDtos.length) return null;

		let ret = await this._payment.saveOrderPayments(orderId, paymentDtos, operatorStaff, options);
		let payments = this._extractPayments(ret);
		if (!payments.length) payments = await this._payment.getOrderPayments(orderId, { includeVoid: true });

		for (let payment of payments) {
			if (!payment) continue;
			if (payment.PAYMENT_REPLACE_FROM_ID) {
				let voidRet = await this._commission.voidCommissionsByPayment(payment.PAYMENT_REPLACE_FROM_ID, '收款替换，同步作废旧提成', operatorStaff);
				this._assertCommissionVoidNotBlocked(voidRet, '收款替换同步提成');
			}
			if (Number(payment.PAYMENT_STATUS || 0) == financeConfig.PAYMENT_STATUS.VOID) {
				let voidRet = await this._commission.voidCommissionsByPayment(payment, '收款作废，同步作废提成', operatorStaff);
				this._assertCommissionVoidNotBlocked(voidRet, '收款作废同步提成');
			} else {
				await this._commission.generateByPayment(payment, operatorStaff);
			}
		}
		await this._commission.refreshOrderCommissionStatus(orderId, { operatorStaff });
		return ret;
	}

	async saveAdminOrderPayment(orderId, paymentDto = {}, adminStaff = null) {
		let payment = Object.assign({}, paymentDto || {});
		if (!payment.PAYMENT_CLIENT_KEY && !payment.clientKey && !payment.key) payment.clientKey = 'admin:' + dataUtil.makeID();
		let order = await WorkOrderModel.getOne(orderId);
		if (!order) order = await WorkOrderModel.getOne({ ORDER_ID: orderId });
		if (!order) this.AppError('订单不存在');
		await this._validateOrderPaymentsBeforeSave([payment], order, adminStaff);
		await this._preflightOrderPaymentCommissionVoids(order._id, [payment], adminStaff);
		let ret = await this._syncOrderFinanceAfterSave(order._id, [payment], adminStaff, {
			source: financeConfig.PAYMENT_SOURCE.ADMIN,
			logSource: financeConfig.FINANCE_LOG_SOURCE.MINI_ADMIN,
			allowGenerateClientKey: true,
		});
		let payments = this._extractPayments(ret);
		return { orderId: ret.orderId, payment: payments[0] || null, payments, summary: ret.summary };
	}

	async voidAdminOrderPayment(paymentId, reason = '', adminStaff = null) {
		let payment = await this._payment.getPaymentByAnyId(paymentId);
		if (!payment) this.AppError('收款记录不存在');
		await this._preflightPaymentCommissionVoid(payment, reason || '后台作废收款同步提成', adminStaff, '后台作废收款同步提成');
		let ret = await this._syncOrderFinanceAfterSave(payment.PAYMENT_ORDER_ID, [{
			_id: payment._id,
			PAYMENT_ID: payment.PAYMENT_ID,
			PAYMENT_CLIENT_KEY: payment.PAYMENT_CLIENT_KEY,
			IS_DELETE: 1,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.VOID,
			PAYMENT_VOID_REASON: reason,
			reason,
		}], adminStaff, {
			source: financeConfig.PAYMENT_SOURCE.ADMIN,
			logSource: financeConfig.FINANCE_LOG_SOURCE.MINI_ADMIN,
		});
		let payments = this._extractPayments(ret);
		return { orderId: ret.orderId, payment: payments[0] || null, payments, summary: ret.summary };
	}

	_cleanOrderForStaff(order, staff) {
		let canFull = this._canSeeFullOrder(order, staff);
		let canEdit = this._canEditOrder(order, staff);
		let base = {
			_id: order._id,
			ORDER_DATE: order.ORDER_DATE,
			ORDER_TIME: order.ORDER_TIME,
			ORDER_END_TIME: order.ORDER_END_TIME,
			ORDER_TYPE_NAME: order.ORDER_TYPE_NAME,
			ORDER_TYPE_COLOR: order.ORDER_TYPE_COLOR,
			ORDER_PROGRESS: order.ORDER_PROGRESS,
			ORDER_PROGRESS_DESC: this._getProgressDesc(order.ORDER_PROGRESS),
			ORDER_SETTLE_STATUS: order.ORDER_SETTLE_STATUS,
			ORDER_SETTLE_STATUS_DESC: this._getSettleDesc(order.ORDER_SETTLE_STATUS),
			ORDER_STATUS: order.ORDER_STATUS,
			ORDER_CUSTOMER_SURNAME: order.ORDER_CUSTOMER_SURNAME || this._getSurname(order.ORDER_CUSTOMER_NAME),
			canFull,
			canEdit,
		};

		if (!canFull) return base;

		let node = JSON.parse(JSON.stringify(order));
		node.ORDER_PROGRESS_DESC = base.ORDER_PROGRESS_DESC;
		node.ORDER_SETTLE_STATUS_DESC = base.ORDER_SETTLE_STATUS_DESC;
		node.canFull = canFull;
		node.canEdit = canEdit;
		node.ORDER_PARTICIPANTS = (node.ORDER_PARTICIPANTS || []).map(p => {
			if (staff.STAFF_IS_ADMIN == 1 || p.staffId == staff._id) return p;
			return {
				id: p.id,
				staffId: p.staffId,
				staffName: p.staffName,
				roleName: p.roleName,
				calcMode: p.calcMode,
				isSettled: p.isSettled || 0,
			};
		});
		return this._enrichOrderListItem(node);
	}

	async getCalendar(openId, month, scope = 'all', staffId = '') {
		let staff = await this.getStaffByOpenId(openId);
		let range = this._monthRange(month);
		let where = {
			ORDER_DATE: ['between', range.start, range.end],
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
		};
		let orders = await WorkOrderModel.getAll(where, '*', {
			ORDER_DATE: 'asc',
			ORDER_TIME: 'asc',
			ORDER_ADD_TIME: 'asc',
		}, 1000);

		let items = await WorkItemModel.getAll({
			ITEM_DATE: ['between', range.start, range.end],
			ITEM_STATUS: 1,
		}, '*', {
			ITEM_DATE: 'asc',
		}, 1000);

		let rests = await WorkRestModel.getAll({
			REST_DATE: ['between', range.start, range.end],
			REST_STATUS: 1,
		}, '*', {
			REST_DATE: 'asc',
		}, 1000);

		let days = {};
		let filterStaffId = staffId;

		for (let order of orders) {
			if (filterStaffId && !this._isParticipant(order, filterStaffId) && order.ORDER_CREATOR_STAFF_ID != filterStaffId) continue;
			if (!filterStaffId && !this._isInCalendarScope(order, staff, scope)) continue;
			if (!days[order.ORDER_DATE]) days[order.ORDER_DATE] = [];
			let canFull = this._canSeeFullOrder(order, staff);
			days[order.ORDER_DATE].push({
				kind: 'order',
				id: order._id,
				typeName: order.ORDER_TYPE_NAME,
				color: order.ORDER_TYPE_COLOR,
				time: order.ORDER_TIME,
				title: order.ORDER_TYPE_NAME,
				customer: canFull ? order.ORDER_CUSTOMER_NAME : (order.ORDER_CUSTOMER_SURNAME || this._getSurname(order.ORDER_CUSTOMER_NAME)),
				canFull,
			});
		}

		for (let item of items) {
			if (!this._isItemInCalendarScope(item, staff, scope)) continue;
			if (!days[item.ITEM_DATE]) days[item.ITEM_DATE] = [];
			days[item.ITEM_DATE].push({
				kind: 'item',
				id: item._id,
				typeName: '事项',
				color: '#1f7a8c',
				time: item.ITEM_TIME,
				title: item.ITEM_TITLE,
				customer: '',
				canFull: true,
			});
		}

		for (let rest of rests) {
			if (filterStaffId && rest.REST_STAFF_ID != filterStaffId) continue;
			if (!filterStaffId && !this._isRestInCalendarScope(rest, staff, scope)) continue;
			if (!days[rest.REST_DATE]) days[rest.REST_DATE] = [];
			days[rest.REST_DATE].push({
				kind: 'rest',
				id: rest._id,
				typeName: '休息',
				color: '#8a8a8a',
				time: '',
				title: rest.REST_STAFF_NAME + '休息',
				customer: '',
				canFull: true,
			});
		}

		return {
			month: range.month,
			days,
		};
	}

	_enrichOrderListItem(order) {
		let node = Object.assign({}, order);
		let summary = node.ORDER_PAYMENT_SUMMARY || {};
		let hasLedgerSummary = summary && (summary.effectiveCount !== undefined || summary.totalCent !== undefined || summary.totalAmount !== undefined);
		let paid = hasLedgerSummary ? summary.totalAmount : undefined;
		if (paid === undefined || paid === null) paid = this._money((node.ORDER_DEPOSIT || 0) + (node.ORDER_FINAL || 0) + (node.ORDER_EXTRA || 0));
		node.PAID_AMOUNT = this._money(paid);
		node.PAID_INCOME_AMOUNT = hasLedgerSummary ? this._money(summary.incomeAmount || 0) : node.PAID_AMOUNT;
		node.UNPAID_AMOUNT = Math.max(0, this._money((node.ORDER_AMOUNT || 0) - node.PAID_AMOUNT));
		return node;
	}

	_isOrderInListScope(order, range, scope, month) {
		if (scope != 'month' || !month || month == 'all') return true;
		if (!order.ORDER_DATE) return true;
		return order.ORDER_DATE >= range.start && order.ORDER_DATE <= range.end;
	}

	async getOrderList(openId, month = '', scope = 'month') {
		let staff = await this.getStaffByOpenId(openId);
		if (month == 'all') scope = 'all';
		let range = (scope == 'month' && month && month != 'all') ? this._monthRange(month) : null;
		let orders = await WorkOrderModel.getAll({
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
		}, '*', {
			ORDER_DATE: 'desc',
			ORDER_TIME: 'asc',
			ORDER_ADD_TIME: 'desc',
		}, 1000);

		orders = orders.filter(order => this._isOrderInListScope(order, range, scope, month));
		if (staff.STAFF_IS_ADMIN != 1) {
			orders = orders.filter(order => this._isParticipant(order, staff._id) || order.ORDER_CREATOR_STAFF_ID == staff._id || order.ORDER_CREATOR_OPENID == staff.STAFF_OPENID);
		}

		if (scope != 'month' || month == 'all') orders = orders.slice(0, 500);

		return {
			list: orders.map(order => this._enrichOrderListItem(this._cleanOrderForStaff(order, staff))),
		};
	}

	async getDayList(openId, day, scope = 'all') {
		let staff = await this.getStaffByOpenId(openId);
		let orders = await WorkOrderModel.getAll({
			ORDER_DATE: day,
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
		}, '*', {
			ORDER_TIME: 'asc',
			ORDER_ADD_TIME: 'asc',
		}, 1000);

		if (scope == 'joined' || scope == 'created' || scope == 'mine') {
			orders = orders.filter(order => this._isInCalendarScope(order, staff, scope));
		}

		let items = await WorkItemModel.getAll({
			ITEM_DATE: day,
			ITEM_STATUS: 1,
		}, '*', {
			ITEM_TIME: 'asc',
		}, 1000);

		let rests = await WorkRestModel.getAll({
			REST_DATE: day,
			REST_STATUS: 1,
		}, '*', {
			REST_STAFF_NAME: 'asc',
		}, 1000);

		if (scope == 'joined' || scope == 'created' || scope == 'mine') {
			items = items.filter(item => this._isItemInCalendarScope(item, staff, scope));
			rests = rests.filter(rest => this._isRestInCalendarScope(rest, staff, scope));
		}

		return {
			orders: orders.map(order => this._cleanOrderForStaff(order, staff)),
			items,
			rests,
		};
	}

	async submitFeedback(openId, content) {
		let staff = await this.getStaffByOpenId(openId);
		content = String(content || '').trim();
		if (!content) this.AppError('请填写反馈内容');
		if (content.length > 800) this.AppError('反馈内容不能超过800字');

		let id = await WorkMessageModel.insert({
			MSG_STAFF_ID: FEEDBACK_BOX_STAFF_ID,
			MSG_TITLE: '问题反馈',
			MSG_CONTENT: content,
			MSG_REF_TYPE: 'feedback',
			MSG_REF_ID: staff._id,
			MSG_IS_READ: 0,
		});

		let admins = await WorkStaffModel.getAll({
			STAFF_STATUS: WorkStaffModel.STATUS.COMM,
			STAFF_IS_ADMIN: 1,
		}, '_id', {}, 1000);
		for (let admin of (admins || [])) {
			await this._notifyStaff(admin._id, '收到新的问题反馈', `${staff.STAFF_NAME || '员工'}：${content}`, 'feedback', id);
		}
		return { id };
	}

	async getAdminFeedbackList(openId) {
		await this._permission.assertAdmin(openId);
		let list = await WorkMessageModel.getAll({
			MSG_STAFF_ID: FEEDBACK_BOX_STAFF_ID,
			MSG_REF_TYPE: 'feedback',
		}, '*', {
			MSG_ADD_TIME: 'desc',
		}, 1000);

		let staffIds = [...new Set((list || []).map(item => item.MSG_REF_ID).filter(id => id))];
		let staffMap = {};
		if (staffIds.length) {
			let staffList = await WorkStaffModel.getAll({
				_id: ['in', staffIds],
			}, '_id,STAFF_NAME,STAFF_MOBILE', {}, 1000);
			for (let staff of (staffList || [])) staffMap[staff._id] = staff;
		}

		return (list || []).map(item => {
			let staff = staffMap[item.MSG_REF_ID] || {};
			return {
				_id: item._id,
				FEEDBACK_STAFF_ID: item.MSG_REF_ID || '',
				FEEDBACK_STAFF_NAME: staff.STAFF_NAME || '',
				FEEDBACK_STAFF_MOBILE: staff.STAFF_MOBILE || '',
				FEEDBACK_CONTENT: item.MSG_CONTENT || '',
				FEEDBACK_STATUS: item.MSG_IS_READ || 0,
				FEEDBACK_ADD_TIME: item.MSG_ADD_TIME || 0,
			};
		});
	}

	async getOrderDetail(openId, id) {
		let staff = await this.getStaffByOpenId(openId);
		let order = await WorkOrderModel.getOne(id);
		if (!order) this.AppError('订单不存在');
		let detail = this._cleanOrderForStaff(order, staff);
		if (detail.canFull) detail.ORDER_PAYMENTS = await this._payment.getOrderPayments(id);
		return detail;
	}

	_getParticipantRule(staff, roleName) {
		let rules = staff.STAFF_RULES || [];
		let rule = rules.find(item => item.roleName == roleName);
		if (!rule) {
			return {
				mode: 'percent',
				percent: 0,
				amount: 0,
			};
		}
		return rule;
	}

	_calcParticipantAmount(participant, order, useEstimate = false) {
		let shootBase = useEstimate ? this._money(order.ORDER_AMOUNT) : this._money(order.ORDER_DEPOSIT + order.ORDER_FINAL);
		let extraBase = this._money(order.ORDER_EXTRA);
		let base = participant.baseType == 'extra' ? extraBase : shootBase;
		if (participant.calcMode == 'manual') return this._money(participant.manualAmount);
		if (participant.calcMode == 'fixed') return this._money(participant.fixedAmount);
		if (participant.calcMode == 'none') return 0;
		return this._money(base * this._money(participant.percent) / 100);
	}

	async _buildParticipants(rawParticipants, order, oldParticipants = []) {
		if (!Array.isArray(rawParticipants)) rawParticipants = [];
		let list = [];
		for (let raw of rawParticipants) {
			if (!raw || !raw.staffId || !raw.roleName) continue;

			let staff = await WorkStaffModel.getOne(raw.staffId);
			if (!staff) this.AppError('参与员工不存在');
			if (staff.STAFF_STATUS != WorkStaffModel.STATUS.COMM) continue;

			let old = oldParticipants.find(item => item.id && item.id == raw.id)
				|| oldParticipants.find(item => item.staffId == raw.staffId && item.roleName == raw.roleName && !list.find(x => x.staffId == item.staffId && x.roleName == item.roleName));

			let rule = this._getParticipantRule(staff, raw.roleName);
			let calcMode = raw.calcMode || rule.mode || 'percent';
			if (!['percent', 'fixed', 'manual', 'none'].includes(calcMode)) calcMode = 'percent';

			let node = {
				id: raw.id || (old && old.id) || dataUtil.makeID(),
				staffId: staff._id,
				staffName: staff.STAFF_NAME,
				roleName: raw.roleName,
				calcMode,
				baseType: this._getRoleBase(raw.roleName),
				percent: this._money(rule.percent),
				fixedAmount: this._money(rule.amount),
				manualAmount: this._money(raw.manualAmount),
				isSettled: old ? (old.isSettled || 0) : 0,
				settledAmount: old ? this._money(old.settledAmount) : 0,
				settledPayrollId: old ? (old.settledPayrollId || '') : '',
				settledTime: old ? (old.settledTime || 0) : 0,
				settledMonth: old ? (old.settledMonth || '') : '',
			};
			node.amount = this._calcParticipantAmount(node, order);
			list.push(node);
		}
		return list;
	}

	_normalizeOrderDuplicateText(text, max = 80) {
		return String(text || '').trim().slice(0, max)
			.replace(/\s+/g, '')
			.replace(/[，,。；;、]/g, '')
			.replace(/^(客户|客人|姓名)[:：]?/, '');
	}

	_normalizeOrderCustomerName(name) {
		let text = this._normalizeOrderDuplicateText(name, 80);
		let stripped = text.replace(/(先生|女士|小姐|老师|客户)$/g, '');
		return stripped.length >= 2 ? stripped : text;
	}

	_normalizeOrderMobile(mobile) {
		let text = String(mobile || '').replace(/\D/g, '');
		if (text.length > 11 && text.startsWith('86')) text = text.slice(-11);
		return text.length >= 7 ? text : '';
	}

	_normalizeOrderTimeForCompare(text) {
		text = String(text || '').trim().replace(/\s+/g, '');
		if (!text) return '';

		let isPm = /下午|晚上|晚间|傍晚/.test(text);
		let isNoon = /中午/.test(text);
		let isDawn = /凌晨/.test(text);
		let isLateNight = /晚上|晚间/.test(text);
		text = text
			.replace(/上午|早上|早晨|凌晨|下午|晚上|晚间|傍晚|中午/g, '')
			.replace(/[：.]/g, ':');

		let m = text.match(/^(\d{1,2})点半$/);
		let hour, minute;
		if (m) {
			hour = Number(m[1]);
			minute = 30;
		} else {
			m = text.match(/^(\d{1,2})点(?:(\d{1,2})分?)?$/);
			if (m) {
				hour = Number(m[1]);
				minute = Number(m[2] || 0);
			} else {
				m = text.match(/^(\d{1,2}):(\d{1,2})$/);
				if (m) {
					hour = Number(m[1]);
					minute = Number(m[2]);
				} else {
					m = text.match(/^(\d{1,2})$/);
					if (m) {
						hour = Number(m[1]);
						minute = 0;
					}
				}
			}
		}

		if (!Number.isInteger(hour) || !Number.isInteger(minute)) return text;
		if (hour === 12 && (isDawn || isLateNight)) hour = 0;
		else if ((isPm || (isNoon && hour < 11)) && hour < 12) hour += 12;
		if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return text;
		return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
	}

	_isSameOrderCustomerName(a, b) {
		a = this._normalizeOrderCustomerName(a);
		b = this._normalizeOrderCustomerName(b);
		if (!a || !b) return false;
		if (a == b) return true;
		if (a.length < 2 || b.length < 2) return false;
		return a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
	}

	_isSameOrderTypeName(a, b) {
		a = this._normalizeOrderDuplicateText(a, 60);
		b = this._normalizeOrderDuplicateText(b, 60);
		if (!a || !b) return false;
		if (a == b) return true;
		if (a.length < 2 || b.length < 2) return false;
		return a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
	}

	_isSameOrderPlace(a, b) {
		a = this._normalizeOrderDuplicateText(a, 120);
		b = this._normalizeOrderDuplicateText(b, 120);
		if (!a || !b || a.length < 2 || b.length < 2) return false;
		return a == b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
	}

	isSameOrderForDuplicate(order = {}, old = {}) {
		if (!order.ORDER_DATE || !old.ORDER_DATE || order.ORDER_DATE != old.ORDER_DATE) return false;

		let mobile = this._normalizeOrderMobile(order.ORDER_CUSTOMER_MOBILE);
		let oldMobile = this._normalizeOrderMobile(old.ORDER_CUSTOMER_MOBILE);
		let sameMobile = mobile && oldMobile && mobile == oldMobile;
		let sameName = this._isSameOrderCustomerName(order.ORDER_CUSTOMER_NAME, old.ORDER_CUSTOMER_NAME);
		if (!sameMobile && !sameName) return false;

		let sameType = this._isSameOrderTypeName(order.ORDER_TYPE_NAME, old.ORDER_TYPE_NAME);
		if (!sameType) return false;

		let time = this._normalizeOrderTimeForCompare(order.ORDER_TIME);
		let oldTime = this._normalizeOrderTimeForCompare(old.ORDER_TIME);
		if (time && oldTime && time == oldTime) return true;

		let samePlace = this._isSameOrderPlace(order.ORDER_PLACE, old.ORDER_PLACE);
		if (!time || !oldTime) {
			if (sameMobile) return true;
			if (sameName && (samePlace || !order.ORDER_PLACE || !old.ORDER_PLACE)) return true;
		}
		return false;
	}

	async findDuplicateOrder(order = {}, excludeId = '') {
		if (!order.ORDER_DATE || !order.ORDER_CUSTOMER_NAME) return null;
		let list = await WorkOrderModel.getAll({
			ORDER_DATE: order.ORDER_DATE,
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
		}, '*', {
			ORDER_TIME: 'asc',
			ORDER_ADD_TIME: 'asc',
		}, 300);
		for (let old of (list || [])) {
			if (excludeId && old._id == excludeId) continue;
			if (this.isSameOrderForDuplicate(order, old)) return old;
		}
		return null;
	}

	async _assertNoDuplicateOrder(order = {}, excludeId = '') {
		let duplicate = await this.findDuplicateOrder(order, excludeId);
		if (!duplicate) return;
		this.AppError('系统已存在同日同客户且同类型的订单，请先确认是否重复录入');
	}

	async _upsertCustomer(order) {
		if (!order.ORDER_CUSTOMER_NAME && !order.ORDER_CUSTOMER_MOBILE) return;
		let where = order.ORDER_CUSTOMER_MOBILE ? {
			CUSTOMER_MOBILE: order.ORDER_CUSTOMER_MOBILE,
		} : {
			CUSTOMER_NAME: order.ORDER_CUSTOMER_NAME,
		};
		let old = await WorkCustomerModel.getOne(where, 'CUSTOMER_ORDER_CNT');
		let data = {
			CUSTOMER_NAME: order.ORDER_CUSTOMER_NAME,
			CUSTOMER_SURNAME: order.ORDER_CUSTOMER_SURNAME,
			CUSTOMER_MOBILE: order.ORDER_CUSTOMER_MOBILE,
			CUSTOMER_SOURCE: order.ORDER_SOURCE,
			CUSTOMER_ORDER_CNT: old ? (old.CUSTOMER_ORDER_CNT || 0) + 1 : 1,
			CUSTOMER_LAST_ORDER_ID: order._id || '',
			CUSTOMER_LAST_ORDER_TIME: timeUtil.time(),
		};
		await WorkCustomerModel.insertOrUpdate(where, data);
	}

	async saveOrder(openId, orderInput) {
		let staff = await this.getStaffByOpenId(openId);
		orderInput = orderInput || {};
		let paymentDtos = Array.isArray(orderInput.ORDER_PAYMENTS) ? orderInput.ORDER_PAYMENTS : (orderInput.ORDER_PAYMENTS ? [orderInput.ORDER_PAYMENTS] : []);
		paymentDtos = paymentDtos.filter(dto => this._hasOrderPaymentDto(dto));
		let id = orderInput._id || orderInput.id || '';
		let old = id ? await WorkOrderModel.getOne(id) : null;
		if (id && !old) this.AppError('订单不存在');
		if (old && !this._canEditOrder(old, staff)) this.AppError('你无权修改该订单');
		if (old && old.ORDER_STATUS == WorkOrderModel.STATUS.CANCEL) this.AppError('订单已取消，请先恢复');

		let type = null;
		if (orderInput.ORDER_TYPE_ID) type = await WorkTypeModel.getOne(orderInput.ORDER_TYPE_ID);

		let order = {
			ORDER_DATE: String(orderInput.ORDER_DATE || '').trim(),
			ORDER_TIME: orderInput.ORDER_TIME || '',
			ORDER_END_TIME: orderInput.ORDER_END_TIME || '',
			ORDER_TYPE_ID: type ? type._id : (orderInput.ORDER_TYPE_ID || ''),
			ORDER_TYPE_NAME: type ? type.TYPE_NAME : (orderInput.ORDER_TYPE_NAME || '其他'),
			ORDER_TYPE_COLOR: type ? type.TYPE_COLOR : (orderInput.ORDER_TYPE_COLOR || '#49cdbf'),
			ORDER_CUSTOMER_NAME: String(orderInput.ORDER_CUSTOMER_NAME || '').trim(),
			ORDER_CUSTOMER_MOBILE: String(orderInput.ORDER_CUSTOMER_MOBILE || '').trim(),
			ORDER_SOURCE: orderInput.ORDER_SOURCE || '',
			ORDER_CONTENT: orderInput.ORDER_CONTENT || '',
			ORDER_PLACE: orderInput.ORDER_PLACE || '',
			ORDER_IS_OLD_CUSTOMER: Number(orderInput.ORDER_IS_OLD_CUSTOMER || 0),
			ORDER_AMOUNT: this._money(orderInput.ORDER_AMOUNT),
			ORDER_DEPOSIT: this._money(orderInput.ORDER_DEPOSIT),
			ORDER_FINAL: this._money(orderInput.ORDER_FINAL),
			ORDER_EXTRA: this._money(orderInput.ORDER_EXTRA),
			ORDER_PROGRESS: Number(orderInput.ORDER_PROGRESS || (old && old.ORDER_PROGRESS) || WorkOrderModel.PROGRESS.BOOKED),
			ORDER_ATTACHMENTS: Array.isArray(orderInput.ORDER_ATTACHMENTS) ? orderInput.ORDER_ATTACHMENTS : ((old && old.ORDER_ATTACHMENTS) || []),
		};

		if (!order.ORDER_CUSTOMER_NAME) this.AppError('请填写客户名称');

		order.ORDER_CUSTOMER_SURNAME = this._getSurname(order.ORDER_CUSTOMER_NAME);
		await this._assertNoDuplicateOrder(order, id);
		order.ORDER_ACTUAL_AMOUNT = this._money(order.ORDER_DEPOSIT + order.ORDER_FINAL + order.ORDER_EXTRA);
		order.ORDER_SHOOT_DUE_CENT = this._centInput(orderInput.ORDER_SHOOT_DUE_CENT, this._moneyCent(order.ORDER_AMOUNT));
		order.ORDER_EXTRA_DUE_CENT = this._centInput(orderInput.ORDER_EXTRA_DUE_CENT, this._moneyCent(order.ORDER_EXTRA));
		order.ORDER_AMOUNT_CENT = this._centInput(orderInput.ORDER_AMOUNT_CENT, order.ORDER_SHOOT_DUE_CENT + order.ORDER_EXTRA_DUE_CENT);
		order.ORDER_PARTICIPANTS = await this._buildParticipants(orderInput.ORDER_PARTICIPANTS || [], order, old ? old.ORDER_PARTICIPANTS : []);

		if (old) await this._assertCanChangeFinanceSnapshot(old, order, order.ORDER_PARTICIPANTS);
		await this._validateOrderPaymentsBeforeSave(paymentDtos, old || order, staff);
		if (old) await this._preflightOrderPaymentCommissionVoids(id, paymentDtos, staff);

		if (old) {
			if (old.ORDER_SETTLE_STATUS == WorkOrderModel.SETTLE.WAIT_AUDIT && order.ORDER_PROGRESS == WorkOrderModel.PROGRESS.DONE) {
				order.ORDER_SETTLE_STATUS = WorkOrderModel.SETTLE.WAIT_AUDIT;
			} else if (old.ORDER_SETTLE_STATUS == WorkOrderModel.SETTLE.PAID) {
				order.ORDER_SETTLE_STATUS = WorkOrderModel.SETTLE.PAID;
			} else if (order.ORDER_PROGRESS < WorkOrderModel.PROGRESS.DONE) {
				order.ORDER_SETTLE_STATUS = WorkOrderModel.SETTLE.NONE;
			} else {
				order.ORDER_SETTLE_STATUS = old.ORDER_SETTLE_STATUS || WorkOrderModel.SETTLE.NONE;
			}
			await WorkOrderModel.edit(id, order);
			order._id = id;
		} else {
			order.ORDER_CREATOR_OPENID = openId;
			order.ORDER_CREATOR_STAFF_ID = staff._id;
			order.ORDER_CREATOR_NAME = staff.STAFF_NAME;
			order.ORDER_STATUS = WorkOrderModel.STATUS.COMM;
			order.ORDER_SETTLE_STATUS = WorkOrderModel.SETTLE.NONE;
			id = await WorkOrderModel.insert(order);
			order._id = id;
		}

		await this._syncOrderFinanceAfterSave(id, paymentDtos, staff);
		await this._upsertCustomer(order);
		return { id };
	}

	async joinOrder(openId, id, roleName = '') {
		let staff = await this.getStaffByOpenId(openId);
		let order = await WorkOrderModel.getOne(id);
		if (!order) this.AppError('订单不存在');
		if (order.ORDER_STATUS == WorkOrderModel.STATUS.CANCEL) this.AppError('订单已取消，不能加入参与人');
		if (order.ORDER_SETTLE_STATUS == WorkOrderModel.SETTLE.PAID) this.AppError('订单已结算，不能自助加入参与人，请联系管理员调整');
		if (this._isParticipant(order, staff._id)) {
			return { id, already: true };
		}
		let roles = Array.isArray(staff.STAFF_ROLES) ? staff.STAFF_ROLES : [];
		roleName = String(roleName || '').trim() || roles[0] || '摄影';
		if (roles.length && !roles.includes(roleName)) roleName = roles[0];
		let nextRaw = (order.ORDER_PARTICIPANTS || []).concat([{
			staffId: staff._id,
			roleName,
			calcMode: 'percent',
		}]);
		let participants = await this._buildParticipants(nextRaw, order, order.ORDER_PARTICIPANTS || []);
		await WorkOrderModel.edit(id, { ORDER_PARTICIPANTS: participants });
		let joined = participants.find(item => item.staffId == staff._id && item.roleName == roleName) || participants.find(item => item.staffId == staff._id);
		let payments = await this._payment.getOrderPayments(id);
		let commissions = [];
		for (let payment of (payments || [])) {
			let created = await this._commission.generateByPayment(payment, staff);
			commissions = commissions.concat(created || []);
		}
		await this._commission.refreshOrderCommissionStatus(id, { operatorStaff: staff });
		if (order.ORDER_CREATOR_STAFF_ID && order.ORDER_CREATOR_STAFF_ID != staff._id) {
			await this._notifyStaff(order.ORDER_CREATOR_STAFF_ID, '订单新增参与人', `${staff.STAFF_NAME || '员工'}已将自己加入订单参与人：${order.ORDER_DATE || ''} ${order.ORDER_TYPE_NAME || '订单'}，岗位：${roleName}`, 'order', id);
		}
		let mine = commissions.filter(item => item && (item.COMMISSION_PARTICIPANT_ID == (joined && joined.id) || item.COMMISSION_STAFF_ID == staff._id));
		await this._notifyStaff(staff._id, '参与提成待核实', `你已加入订单：${order.ORDER_DATE || ''} ${order.ORDER_TYPE_NAME || '订单'}，岗位：${roleName}。系统已按当前员工规则核算${mine.length ? mine.length + '条提成记录' : '待计算提成'}，如有问题请向管理员申诉。`, 'order', id);
		return { id, roleName, commissionCount: mine.length };
	}

	async completeOrder(openId, id) {
		let staff = await this.getStaffByOpenId(openId);
		let order = await WorkOrderModel.getOne(id);
		if (!order) this.AppError('订单不存在');
		if (!this._canEditOrder(order, staff)) this.AppError('你无权完成该订单');
		if (order.ORDER_STATUS == WorkOrderModel.STATUS.CANCEL) this.AppError('订单已取消');

		order.ORDER_ACTUAL_AMOUNT = this._money(order.ORDER_DEPOSIT + order.ORDER_FINAL + order.ORDER_EXTRA);
		let nextParticipants = await this._buildParticipants(order.ORDER_PARTICIPANTS, order, order.ORDER_PARTICIPANTS);
		let participantsChanged = this._participantsChanged(order.ORDER_PARTICIPANTS, nextParticipants);
		if (participantsChanged) await this._assertCanChangeFinanceSnapshot(order, order, nextParticipants);

		let editData = {
			ORDER_PROGRESS: WorkOrderModel.PROGRESS.DONE,
			ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.WAIT_AUDIT,
			ORDER_COMPLETE_TIME: timeUtil.time(),
			ORDER_COMPLETE_MONTH: timeUtil.time('Y-M'),
			ORDER_ACTUAL_AMOUNT: order.ORDER_ACTUAL_AMOUNT,
			ORDER_AUDIT_REASON: '',
		};
		if (participantsChanged) editData.ORDER_PARTICIPANTS = nextParticipants;

		await WorkOrderModel.edit(id, editData);

		return { id };
	}

	async cancelOrder(openId, id, reason = '') {
		let staff = await this.getStaffByOpenId(openId);
		let order = await WorkOrderModel.getOne(id);
		if (!order) this.AppError('订单不存在');
		if (!this._canEditOrder(order, staff)) this.AppError('你无权取消该订单');
		let ret = await this._payment.cancelOrderWithFinanceCheck(id, reason || '', staff);
		if (ret && (ret.needFinance || ret.canceled === false)) this.AppError(ret.message || '该订单存在未处理财务记录，请先处理财务后再取消');
		return ret;
	}

	async restoreOrder(openId, id) {
		let staff = await this.getStaffByOpenId(openId);
		let order = await WorkOrderModel.getOne(id);
		if (!order) this.AppError('订单不存在');
		if (!this._canEditOrder(order, staff)) this.AppError('你无权恢复该订单');
		await WorkOrderModel.edit(id, {
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
			ORDER_CANCEL_REASON: '',
		});
	}

	async saveNote(openId, input) {
		let staff = await this.getStaffByOpenId(openId);
		let id = input._id || input.id || '';
		let old = id ? await WorkNoteModel.getOne(id) : null;
		if (old && old.NOTE_TYPE == 'personal' && old.NOTE_CREATOR_STAFF_ID != staff._id) this.AppError('你无权修改该小记');

		let data = {
			NOTE_TYPE: input.NOTE_TYPE == 'team' ? 'team' : 'personal',
			NOTE_TITLE: input.NOTE_TITLE || '未命名小记',
			NOTE_CONTENT: input.NOTE_CONTENT || '',
			NOTE_DATE: input.NOTE_DATE || timeUtil.time('Y-M-D'),
			NOTE_STATUS: 1,
		};

		if (old) {
			await WorkNoteModel.edit(id, data);
		} else {
			data.NOTE_CREATOR_OPENID = openId;
			data.NOTE_CREATOR_STAFF_ID = staff._id;
			data.NOTE_CREATOR_NAME = staff.STAFF_NAME;
			id = await WorkNoteModel.insert(data);
		}
		return { id };
	}

	_isAiOperationNote(note = {}) {
		return String(note.NOTE_TITLE || '').indexOf('AI操作记录') === 0;
	}

	_decorateNoteList(list = [], type = 'all') {
		return (list || [])
			.map(item => {
				let note = Object.assign({}, item || {});
				note.NOTE_IS_AI_RECORD = this._isAiOperationNote(note) ? 1 : 0;
				return note;
			})
			.filter(note => type == 'ai' ? note.NOTE_IS_AI_RECORD : !note.NOTE_IS_AI_RECORD);
	}

	async getNoteList(openId, type = 'all') {
		let staff = await this.getStaffByOpenId(openId);
		let where = {
			NOTE_STATUS: 1,
		};
		if (type == 'ai') {
			let orderBy = { NOTE_EDIT_TIME: 'desc' };
			let teamList = await WorkNoteModel.getAllBig({
				NOTE_STATUS: 1,
				NOTE_TYPE: 'team',
			}, '*', orderBy, 1000);
			let personalList = await WorkNoteModel.getAllBig({
				NOTE_STATUS: 1,
				NOTE_TYPE: 'personal',
				NOTE_CREATOR_STAFF_ID: staff._id,
			}, '*', orderBy, 1000);
			let list = this._decorateNoteList(teamList.concat(personalList), 'ai');
			list.sort((a, b) => Number(b.NOTE_EDIT_TIME || 0) - Number(a.NOTE_EDIT_TIME || 0));
			return list;
		}
		if (type == 'personal') {
			where.NOTE_TYPE = 'personal';
			where.NOTE_CREATOR_STAFF_ID = staff._id;
		} else if (type == 'team') {
			where.NOTE_TYPE = 'team';
		} else {
			let orderBy = {
				NOTE_EDIT_TIME: 'desc',
			};
			let teamList = await WorkNoteModel.getAllBig({
				NOTE_STATUS: 1,
				NOTE_TYPE: 'team',
			}, '*', orderBy, 1000);
			let personalList = await WorkNoteModel.getAllBig({
				NOTE_STATUS: 1,
				NOTE_TYPE: 'personal',
				NOTE_CREATOR_STAFF_ID: staff._id,
			}, '*', orderBy, 1000);
			let map = {};
			let list = teamList.concat(personalList).filter(item => {
				if (!item || map[item._id]) return false;
				map[item._id] = true;
				return true;
			});
			list.sort((a, b) => Number(b.NOTE_EDIT_TIME || 0) - Number(a.NOTE_EDIT_TIME || 0));
			return this._decorateNoteList(list, 'all');
		}
		let list = await WorkNoteModel.getAllBig(where, '*', {
			NOTE_EDIT_TIME: 'desc',
		}, 1000);
		return this._decorateNoteList(list, type);
	}

	async getNoteDetail(openId, id) {
		let staff = await this.getStaffByOpenId(openId);
		let note = await WorkNoteModel.getOne(id);
		if (!note) this.AppError('小记不存在');
		if (note.NOTE_TYPE == 'personal' && note.NOTE_CREATOR_STAFF_ID != staff._id) this.AppError('你无权查看该小记');
		return note;
	}

	async saveItem(openId, input, options = {}) {
		let staff = await this.getStaffByOpenId(openId);
		let id = input._id || input.id || '';
		let old = id ? await WorkItemModel.getOne(id) : null;
		if (old && old.ITEM_CREATOR_STAFF_ID != staff._id && staff.STAFF_IS_ADMIN != 1) this.AppError('你无权修改该事项');
		let forceActive = options && options.forceActive === true;
		let data = {
			ITEM_TITLE: input.ITEM_TITLE || '未命名事项',
			ITEM_CONTENT: input.ITEM_CONTENT || '',
			ITEM_DATE: input.ITEM_DATE || timeUtil.time('Y-M-D'),
			ITEM_TIME: input.ITEM_TIME || '',
			ITEM_END_TIME: input.ITEM_END_TIME || '',
			ITEM_STATUS: forceActive ? 1 : (staff.STAFF_IS_ADMIN == 1 ? 1 : 0),
		};
		if (old) {
			await WorkItemModel.edit(id, data);
		} else {
			data.ITEM_CREATOR_OPENID = openId;
			data.ITEM_CREATOR_STAFF_ID = staff._id;
			data.ITEM_CREATOR_NAME = staff.STAFF_NAME;
			id = await WorkItemModel.insert(data);
		}
		return { id };
	}

	async cancelItem(openId, id) {
		let staff = await this.getStaffByOpenId(openId);
		let item = await WorkItemModel.getOne(id);
		if (!item) this.AppError('事项不存在');
		if (item.ITEM_CREATOR_STAFF_ID != staff._id && staff.STAFF_IS_ADMIN != 1) this.AppError('你无权删除该事项');
		await WorkItemModel.edit(id, {
			ITEM_STATUS: 10,
		});
		return { id };
	}

	async saveRest(openId, input) {
		let staff = await this.getStaffByOpenId(openId);
		let data = {
			REST_STAFF_ID: staff._id,
			REST_STAFF_NAME: staff.STAFF_NAME,
			REST_DATE: input.REST_DATE || timeUtil.time('Y-M-D'),
			REST_TYPE: input.REST_TYPE || '休息',
			REST_REASON: input.REST_REASON || '',
			REST_STATUS: 0,
		};
		let id = await WorkRestModel.insert(data);
		return { id };
	}

	async getMessages(openId) {
		let staff = await this.getStaffByOpenId(openId);
		return await WorkMessageModel.getAll({
			MSG_STAFF_ID: staff._id,
		}, '*', {
			MSG_ADD_TIME: 'desc',
		}, 1000);
	}

	async getMessageSummary(openId) {
		let staff = await this.getStaffByOpenId(openId);
		let unreadCount = await WorkMessageModel.count({
			MSG_STAFF_ID: staff._id,
			MSG_IS_READ: ['!=', 1],
		});
		return { unreadCount };
	}

	async readMessage(openId, id) {
		let staff = await this.getStaffByOpenId(openId);
		await WorkMessageModel.edit({
			_id: id,
			MSG_STAFF_ID: staff._id,
		}, {
			MSG_IS_READ: 1,
		});
	}

	async readAllMessages(openId) {
		let staff = await this.getStaffByOpenId(openId);
		await WorkMessageModel.edit({
			MSG_STAFF_ID: staff._id,
			MSG_IS_READ: ['!=', 1],
		}, {
			MSG_IS_READ: 1,
		});
		return await this.getMessageSummary(openId);
	}

	async _notifyStaff(staffId, title, content, refType = '', refId = '') {
		if (!staffId) return;
		await WorkMessageModel.insert({
			MSG_STAFF_ID: staffId,
			MSG_TITLE: title,
			MSG_CONTENT: content || '',
			MSG_REF_TYPE: refType,
			MSG_REF_ID: refId,
			MSG_IS_READ: 0,
		});
	}

	_estimateParticipant(participant, order) {
		let node = Object.assign({}, participant);
		node.amount = this._calcParticipantAmount(node, order, true);
		return node;
	}

	async _getLegacyPayrollForStaff(staffId, month = '') {
		let staff = await WorkStaffModel.getOne(staffId);
		if (!staff) this.AppError('员工不存在');
		month = month || timeUtil.time('Y-M');

		let doneOrders = await WorkOrderModel.getAll({
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
			ORDER_COMPLETE_MONTH: month,
			ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.WAIT_PAY,
		}, '*', {
			ORDER_DATE: 'asc',
		}, 1000);

		let payable = [];
		let payableTotal = 0;
		let adjustments = [];
		let adjustmentTotal = 0;

		for (let order of doneOrders) {
			for (let p of (order.ORDER_PARTICIPANTS || [])) {
				if (p.staffId == staffId && !p.isSettled) {
					let amount = this._money(p.amount);
					payableTotal = this._money(payableTotal + amount);
					payable.push({
						orderId: order._id,
						orderNo: order.ORDER_ID,
						customerName: order.ORDER_CUSTOMER_NAME,
						typeName: order.ORDER_TYPE_NAME,
						date: order.ORDER_DATE,
						roleName: p.roleName,
						amount,
					});
				}
			}
		}

		let allOrders = await WorkOrderModel.getAll({
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
		}, '*', {
			ORDER_DATE: 'desc',
		}, 1000);

		let estimated = [];
		let estimatedTotal = 0;
		for (let order of allOrders) {
			if (order.ORDER_PROGRESS == WorkOrderModel.PROGRESS.DONE && order.ORDER_SETTLE_STATUS != WorkOrderModel.SETTLE.REJECT) {
				let adjs = order.ORDER_ADJUSTMENTS || [];
				for (let adj of adjs) {
					if (adj.staffId == staffId && !adj.isSettled && (adj.month || order.ORDER_COMPLETE_MONTH) == month) {
						let amount = this._money(adj.amount);
						adjustmentTotal = this._money(adjustmentTotal + amount);
						adjustments.push(Object.assign({
							orderId: order._id,
							customerName: order.ORDER_CUSTOMER_NAME,
							typeName: order.ORDER_TYPE_NAME,
						}, adj, { amount }));
					}
				}
				continue;
			}

			for (let p of (order.ORDER_PARTICIPANTS || [])) {
				if (p.staffId == staffId) {
					let ep = this._estimateParticipant(p, order);
					estimatedTotal = this._money(estimatedTotal + ep.amount);
					estimated.push({
						orderId: order._id,
						customerName: order.ORDER_CUSTOMER_NAME,
						typeName: order.ORDER_TYPE_NAME,
						date: order.ORDER_DATE,
						roleName: ep.roleName,
						amount: ep.amount,
						progressDesc: this._getProgressDesc(order.ORDER_PROGRESS),
					});
				}
			}
		}

		let settled = await WorkPayrollModel.getAll({
			PAYROLL_STAFF_ID: staffId,
			PAYROLL_MONTH: month,
		}, '*', {
			PAYROLL_PAY_TIME: 'desc',
		}, 1000);
		let settledTotal = 0;
		for (let item of settled) settledTotal = this._money(settledTotal + item.PAYROLL_ACTUAL_AMOUNT);

		return {
			staff: this._cleanStaff(staff, true),
			month,
			legacy: true,
			cutoverMonth: financeConfig.getCutoverMonth(),
			payable,
			payableTotal,
			adjustments,
			adjustmentTotal,
			estimated,
			estimatedTotal,
			settled,
			settledTotal,
			total: this._money(payableTotal + adjustmentTotal),
		};
	}

	async getPayrollForStaff(staffId, month = '') {
		month = month || timeUtil.time('Y-M');
		return await this._payroll.getPayrollForStaff(staffId, month, {
			legacyProvider: async (legacyStaffId, legacyMonth) => await this._getLegacyPayrollForStaff(legacyStaffId, legacyMonth),
		});
	}

	async getMyPayroll(openId, month = '') {
		let staff = await this.getStaffByOpenId(openId);
		return await this.getPayrollForStaff(staff._id, month);
	}
}

module.exports = WorkService;
