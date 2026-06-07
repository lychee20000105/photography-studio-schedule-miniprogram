/**
 * Notes: 云屿摄影 v1.2.0 工资发放服务
 */

const BaseProjectService = require('./base_project_service.js');
const WorkPayrollModel = require('../model/work_payroll_model.js');
const WorkCommissionModel = require('../model/work_commission_model.js');
const WorkPaymentModel = require('../model/work_payment_model.js');
const WorkStaffModel = require('../model/work_staff_model.js');
const WorkFinanceLogService = require('./work_finance_log_service.js');
const financeConfig = require('./work_finance_config.js');
const moneyUtil = require('./work_money_util.js');
const crypto = require('crypto');

const MAX_PAYROLL_ITEMS = 1000;
const PAYROLL_KINDS = [
	financeConfig.COMMISSION_KIND.CURRENT,
	financeConfig.COMMISSION_KIND.RELEASE,
	financeConfig.COMMISSION_KIND.ADJUST,
	financeConfig.COMMISSION_KIND.DEDUCT,
];
const FROZEN_DISPLAY_KINDS = [
	financeConfig.COMMISSION_KIND.FROZEN,
	financeConfig.COMMISSION_KIND.FROZEN_DEDUCT,
];

class WorkPayrollService extends BaseProjectService {

	constructor() {
		super();
		this._financeLog = new WorkFinanceLogService();
	}

	_hasValue(value) {
		return value !== undefined && value !== null && String(value).trim() !== '';
	}

	_text(value, maxLen = 300) {
		if (value === undefined || value === null) return '';
		let str = String(value).replace(/[\r\n\t]+/g, ' ').trim();
		if (str.length > maxLen) str = str.substring(0, maxLen);
		return str;
	}

	_safeCent(value, defaultValue = 0) {
		return moneyUtil.safeCent(value, defaultValue);
	}

	_now() {
		return Math.floor(Date.now() / 1000);
	}

	_normalizeMonth(month) {
		if (!this._hasValue(month)) this.AppError('缺少工资月份');
		let ret = financeConfig.normalizeMonth(month);
		if (!ret) ret = moneyUtil.buildMonth(month);
		ret = financeConfig.normalizeMonth(ret);
		if (!ret) this.AppError('工资月份格式错误');
		return ret;
	}

	_cutoverMonth() {
		return financeConfig.getCutoverMonth ? financeConfig.getCutoverMonth() : financeConfig.DEFAULT_CUTOVER_MONTH;
	}

	_isNewLedgerMonth(month) {
		month = this._normalizeMonth(month);
		if (financeConfig.isNewLedgerMonth) return financeConfig.isNewLedgerMonth(month);
		return month >= this._cutoverMonth();
	}

	_commissionKey(commission) {
		commission = commission || {};
		return this._text(commission._id || commission.COMMISSION_ID || '', 120);
	}

	_staffInputId(staffOrStaffId) {
		if (staffOrStaffId && typeof staffOrStaffId == 'object') {
			return this._text(staffOrStaffId._id || staffOrStaffId.STAFF_ID || staffOrStaffId.staffId || staffOrStaffId.id || '', 120);
		}
		return this._text(staffOrStaffId || '', 120);
	}

	async _getStaff(staffId, must = false) {
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

	async _resolveStaffSnapshot(staffOrStaffId, must = false) {
		let inputId = this._staffInputId(staffOrStaffId);
		if (!inputId) {
			if (must) this.AppError('缺少员工ID');
			return { staffId: '', staffName: '', staff: null };
		}

		let staff = await this._getStaff(inputId, false);
		if (!staff && must) this.AppError('员工不存在');
		return {
			staffId: staff ? staff._id : inputId,
			staffName: staff ? (staff.STAFF_NAME || '') : (staffOrStaffId && staffOrStaffId.STAFF_NAME) || '',
			staff,
		};
	}

	_operatorSnapshot(operator) {
		operator = operator || {};
		return {
			id: this._text(operator._id || operator.STAFF_ID || operator.ADMIN_ID || operator.id || '', 80),
			name: this._text(operator.STAFF_NAME || operator.ADMIN_NAME || operator.name || '', 80),
			adminId: this._text(operator.ADMIN_ID || '', 80),
			adminName: this._text(operator.ADMIN_NAME || '', 80),
		};
	}

	_uniqueTexts(arr = []) {
		let map = {};
		let ret = [];
		for (let item of arr || []) {
			let text = this._text(item, 120);
			if (!text || map[text]) continue;
			map[text] = true;
			ret.push(text);
		}
		return ret;
	}

	_payrollBlockingStatuses() {
		let statuses = [WorkPayrollModel.STATUS.PAYING, WorkPayrollModel.STATUS.PAID];
		if (WorkPayrollModel.STATUS.IN_PAYROLL) statuses.push(WorkPayrollModel.STATUS.IN_PAYROLL);
		if (financeConfig.COMMISSION_STATUS && financeConfig.COMMISSION_STATUS.IN_PAYROLL) statuses.push(financeConfig.COMMISSION_STATUS.IN_PAYROLL);
		return Array.from(new Set(statuses.map(item => Number(item)).filter(item => Number.isSafeInteger(item))));
	}

	buildPreviewHash(preview = {}) {
		let commissionIds = Array.isArray(preview.commissionIds) ? preview.commissionIds : [];
		commissionIds = this._uniqueTexts(commissionIds).sort();
		let paymentIds = Array.isArray(preview.paymentIds) ? preview.paymentIds : [];
		paymentIds = this._uniqueTexts(paymentIds).sort();
		let payload = {
			staffId: this._text(preview.staffId || '', 120),
			month: this._text(preview.month || '', 20),
			commissionIds,
			paymentIds,
			totalCent: this._safeCent(preview.totalCent, 0),
			current: this._safeCent(preview.currentCent !== undefined ? preview.currentCent : preview.current, 0),
			release: this._safeCent(preview.releaseCent !== undefined ? preview.releaseCent : preview.release, 0),
			deduct: this._safeCent(preview.deductCent !== undefined ? preview.deductCent : preview.deduct, 0),
			adjust: this._safeCent(preview.adjustCent !== undefined ? preview.adjustCent : preview.adjust, 0),
		};
		return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
	}

	_buildCommissionItem(commission) {
		commission = commission || {};
		let amountCent = this._safeCent(commission.COMMISSION_AMOUNT_CENT, 0);
		return {
			commissionId: this._commissionKey(commission),
			kind: commission.COMMISSION_KIND || '',
			type: commission.COMMISSION_TYPE || commission.COMMISSION_KIND || '',
			amountCent,
			amount: moneyUtil.centToYuan(amountCent),
			orderId: this._text(commission.COMMISSION_ORDER_ID || '', 120),
			orderNo: this._text(commission.COMMISSION_ORDER_NO || '', 120),
			paymentId: this._text(commission.COMMISSION_PAYMENT_ID || '', 120),
			paymentType: this._text(commission.COMMISSION_PAYMENT_TYPE || '', 40),
			paymentDate: this._text(commission.COMMISSION_PAYMENT_DATE || '', 30),
			month: this._text(commission.COMMISSION_MONTH || '', 20),
			staffId: this._text(commission.COMMISSION_STAFF_ID || '', 120),
			staffName: this._text(commission.COMMISSION_STAFF_NAME || '', 80),
			roleName: this._text(commission.COMMISSION_ROLE_NAME || '', 80),
			customerName: this._text(commission.COMMISSION_CUSTOMER_NAME || '', 80),
			customerSurname: this._text(commission.COMMISSION_CUSTOMER_SURNAME || '', 80),
			sourceType: this._text(commission.COMMISSION_SOURCE_TYPE || '', 80),
			sourceId: this._text(commission.COMMISSION_SOURCE_ID || '', 120),
			note: this._text(commission.COMMISSION_NOTE || commission.COMMISSION_REMARK || '', 300),
		};
	}

	_buildPayrollSummary(preview) {
		preview = preview || {};
		let summary = {
			staffId: preview.staffId || '',
			staffName: preview.staffName || '',
			month: preview.month || '',
			commissionCount: Array.isArray(preview.commissionIds) ? preview.commissionIds.length : 0,
			currentCent: this._safeCent(preview.currentCent, 0),
			releaseCent: this._safeCent(preview.releaseCent, 0),
			adjustCent: this._safeCent(preview.adjustCent, 0),
			deductCent: this._safeCent(preview.deductCent, 0),
			totalCent: this._safeCent(preview.totalCent, 0),
			frozenRemainCent: this._safeCent(preview.frozenRemainCent, 0),
			frozenDeductCent: this._safeCent(preview.frozenDeductCent, 0),
			previewHash: preview.previewHash || '',
			cutoverMonth: preview.cutoverMonth || this._cutoverMonth(),
		};
		summary.currentAmount = moneyUtil.centToYuan(summary.currentCent);
		summary.releaseAmount = moneyUtil.centToYuan(summary.releaseCent);
		summary.adjustAmount = moneyUtil.centToYuan(summary.adjustCent);
		summary.deductAmount = moneyUtil.centToYuan(summary.deductCent);
		summary.totalAmount = moneyUtil.centToYuan(summary.totalCent);
		summary.frozenRemainAmount = moneyUtil.centToYuan(summary.frozenRemainCent);
		summary.frozenDeductAmount = moneyUtil.centToYuan(summary.frozenDeductCent);
		return summary;
	}

	async _getPendingCommissions(staffId, month) {
		return await WorkCommissionModel.getAll({
			COMMISSION_STAFF_ID: staffId,
			COMMISSION_MONTH: month,
			COMMISSION_KIND: ['in', PAYROLL_KINDS],
			COMMISSION_STATUS: financeConfig.COMMISSION_STATUS.PENDING_PAY,
		}, '*', {
			COMMISSION_PAYMENT_DATE: 'asc',
			COMMISSION_ADD_TIME: 'asc',
			_id: 'asc',
		}, MAX_PAYROLL_ITEMS);
	}

	async _getFrozenDisplayCommissions(staffId, month) {
		return await WorkCommissionModel.getAll({
			COMMISSION_STAFF_ID: staffId,
			COMMISSION_MONTH: month,
			COMMISSION_KIND: ['in', FROZEN_DISPLAY_KINDS],
			COMMISSION_STATUS: ['!=', financeConfig.COMMISSION_STATUS.VOID],
		}, '*', {
			COMMISSION_PAYMENT_DATE: 'asc',
			COMMISSION_ADD_TIME: 'asc',
			_id: 'asc',
		}, MAX_PAYROLL_ITEMS);
	}

	async previewStaffMonth(staffId, month) {
		let staff = await this._resolveStaffSnapshot(staffId, false);
		if (!staff.staffId) this.AppError('缺少员工ID');
		month = this._normalizeMonth(month);
		let cutoverMonth = this._cutoverMonth();
		if (!this._isNewLedgerMonth(month)) {
			return {
				legacy: true,
				legacyNeeded: true,
				staffId: staff.staffId,
				staffName: staff.staffName,
				month,
				cutoverMonth,
			};
		}

		let commissions = await this._getPendingCommissions(staff.staffId, month);
		let frozenDisplay = await this._getFrozenDisplayCommissions(staff.staffId, month);
		let currentCent = 0;
		let releaseCent = 0;
		let adjustCent = 0;
		let deductCent = 0;
		let frozenRemainCent = 0;
		let frozenDeductCent = 0;
		let commissionIds = [];
		let paymentIds = [];
		let items = [];
		let frozenItems = [];

		for (let item of commissions || []) {
			let kind = item.COMMISSION_KIND || '';
			let amountCent = this._safeCent(item.COMMISSION_AMOUNT_CENT, 0);
			if (kind == financeConfig.COMMISSION_KIND.CURRENT) currentCent += amountCent;
			else if (kind == financeConfig.COMMISSION_KIND.RELEASE) releaseCent += amountCent;
			else if (kind == financeConfig.COMMISSION_KIND.ADJUST) adjustCent += amountCent;
			else if (kind == financeConfig.COMMISSION_KIND.DEDUCT) deductCent += amountCent;
			else if (kind == financeConfig.COMMISSION_KIND.FROZEN) {
				frozenRemainCent += this._safeCent(item.COMMISSION_FROZEN_REMAIN_CENT, 0);
				frozenItems.push(this._buildCommissionItem(item));
				continue;
			} else if (kind == financeConfig.COMMISSION_KIND.FROZEN_DEDUCT) {
				frozenDeductCent += Math.abs(amountCent);
				frozenItems.push(this._buildCommissionItem(item));
				continue;
			} else {
				continue;
			}

			if (PAYROLL_KINDS.includes(kind)) {
				let id = this._commissionKey(item);
				if (id) commissionIds.push(id);
				let paymentId = this._text(item.COMMISSION_PAYMENT_ID || '', 120);
				if (paymentId) paymentIds.push(paymentId);
				items.push(this._buildCommissionItem(item));
			}
		}

		for (let item of frozenDisplay || []) {
			let kind = item.COMMISSION_KIND || '';
			let amountCent = this._safeCent(item.COMMISSION_AMOUNT_CENT, 0);
			if (kind == financeConfig.COMMISSION_KIND.FROZEN) frozenRemainCent += this._safeCent(item.COMMISSION_FROZEN_REMAIN_CENT, 0);
			else if (kind == financeConfig.COMMISSION_KIND.FROZEN_DEDUCT) frozenDeductCent += Math.abs(amountCent);
			frozenItems.push(this._buildCommissionItem(item));
		}

		commissionIds = this._uniqueTexts(commissionIds).sort();
		paymentIds = this._uniqueTexts(paymentIds).sort();
		let totalCent = currentCent + releaseCent + adjustCent + deductCent;
		let preview = {
			legacy: false,
			staffId: staff.staffId,
			staffName: staff.staffName || (items[0] && items[0].staffName) || '',
			month,
			currentCent,
			releaseCent,
			adjustCent,
			deductCent,
			totalCent,
			frozenRemainCent,
			frozenDeductCent,
			commissionIds,
			paymentIds,
			items,
			frozenItems,
			cutoverMonth,
		};
		preview.previewHash = this.buildPreviewHash(preview);
		return preview;
	}

	async getLegacyPayrollForStaff(staffId, month, options = {}) {
		month = this._normalizeMonth(month);
		let provider = options && options.legacyProvider;
		if (typeof provider == 'function') return await provider(staffId, month, options);
		return {
			legacy: true,
			legacyNeeded: true,
			staffId: this._staffInputId(staffId),
			month,
			cutoverMonth: this._cutoverMonth(),
		};
	}

	async getPayrollForStaff(staffId, month, options = {}) {
		let staff = await this._resolveStaffSnapshot(staffId, false);
		if (!staff.staffId) this.AppError('缺少员工ID');
		month = this._normalizeMonth(month);
		if (!this._isNewLedgerMonth(month)) return await this.getLegacyPayrollForStaff(staff.staffId, month, options);

		let preview = await this.previewStaffMonth(staff.staffId, month);
		let payrollList = await WorkPayrollModel.getAll({
			PAYROLL_STAFF_ID: staff.staffId,
			PAYROLL_MONTH: month,
			PAYROLL_STATUS: WorkPayrollModel.STATUS.PAID,
		}, '*', {
			PAYROLL_PAY_TIME: 'desc',
			PAYROLL_ADD_TIME: 'desc',
		}, MAX_PAYROLL_ITEMS);
		preview.payrollList = payrollList || [];
		preview.paidPayrolls = preview.payrollList;
		return preview;
	}

	async getMyPayroll(staffOrStaffId, month, options = {}) {
		let staffId = this._staffInputId(staffOrStaffId);
		if (!staffId) this.AppError('缺少员工ID');
		return await this.getPayrollForStaff(staffId, month, options);
	}

	_buildPayrollLockKey(staffId, month) {
		if (financeConfig.buildPayrollLockKey) return financeConfig.buildPayrollLockKey(staffId, month);
		return 'payroll:' + staffId + ':' + month;
	}

	_buildPayrollData(preview, lockKey, operator, options = {}) {
		let op = this._operatorSnapshot(operator);
		let totalCent = this._safeCent(preview.totalCent, 0);
		let note = this._text((options && options.note) || '', 300);
		let summary = this._buildPayrollSummary(preview);
		return {
			PAYROLL_STAFF_ID: preview.staffId || '',
			PAYROLL_STAFF_NAME: preview.staffName || '',
			PAYROLL_MONTH: preview.month || '',
			PAYROLL_ITEMS: preview.items || [],
			PAYROLL_ADJUSTMENTS: [],
			PAYROLL_AMOUNT: moneyUtil.centToYuan(totalCent),
			PAYROLL_ACTUAL_AMOUNT: moneyUtil.centToYuan(totalCent),
			PAYROLL_CURRENT_COMMISSION_CENT: this._safeCent(preview.currentCent, 0),
			PAYROLL_RELEASED_COMMISSION_CENT: this._safeCent(preview.releaseCent, 0),
			PAYROLL_DEDUCT_COMMISSION_CENT: this._safeCent(preview.deductCent, 0),
			PAYROLL_ADJUST_COMMISSION_CENT: this._safeCent(preview.adjustCent, 0),
			PAYROLL_PERFORMANCE_CENT: 0,
			PAYROLL_FROZEN_REMAIN_CENT: this._safeCent(preview.frozenRemainCent, 0),
			PAYROLL_TOTAL_CENT: totalCent,
			PAYROLL_ACTUAL_AMOUNT_CENT: totalCent,
			PAYROLL_COMMISSION_IDS: preview.commissionIds || [],
			PAYROLL_PAYMENT_IDS: preview.paymentIds || [],
			PAYROLL_COMMISSION_REFS: preview.items || [],
			PAYROLL_SUMMARY: summary,
			PAYROLL_LOCK_KEY: lockKey,
			PAYROLL_SOURCE: financeConfig.PAYROLL_SOURCE.NEW,
			PAYROLL_IS_LEGACY: 0,
			PAYROLL_CUTOVER_MONTH: preview.cutoverMonth || this._cutoverMonth(),
			PAYROLL_PREVIEW_HASH: preview.previewHash || '',
			PAYROLL_EXPECTED_HASH: preview.previewHash || '',
			PAYROLL_FAIL_REASON: '',
			PAYROLL_OPERATOR_STAFF_ID: op.id,
			PAYROLL_OPERATOR_NAME: op.name,
			PAYROLL_STATUS: WorkPayrollModel.STATUS.PAYING,
			PAYROLL_NOTE: note,
			PAYROLL_ADMIN_ID: op.adminId,
			PAYROLL_ADMIN_NAME: op.adminName,
			PAYROLL_PAY_TIME: 0,
		};
	}

	async _logPayroll(action, payrollId, before = null, after = null, options = {}) {
		try {
			await this._financeLog.log(action, 'payroll', payrollId || '', before, after, {
				source: options.source || financeConfig.FINANCE_LOG_SOURCE.MINI_ADMIN,
				operator: options.operator || null,
				bizKey: options.bizKey || (after && after.PAYROLL_LOCK_KEY) || (before && before.PAYROLL_LOCK_KEY) || '',
				phase: options.phase || financeConfig.FINANCE_LOG_PHASE.SUCCESS,
				note: options.note || '',
				error: options.error || '',
			});
		} catch (err) {
			console.error('payroll finance log failed:', err);
		}
	}

	async _lockPayrollPayments(paymentIds = [], lockKey = '', operator = null) {
		paymentIds = this._uniqueTexts(paymentIds);
		if (!paymentIds.length) return 0;
		let locked = 0;
		for (let paymentId of paymentIds) {
			let payment = await WorkPaymentModel.getOne(paymentId);
			if (!payment) payment = await WorkPaymentModel.getOne({ PAYMENT_ID: paymentId });
			if (!payment) this.AppError('来源收款不存在，请刷新后重试');
			let updated = await WorkPaymentModel.edit({
				_id: payment._id,
				PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
				PAYMENT_IS_LOCKED: financeConfig.LOCKED.NO,
			}, {
				PAYMENT_IS_LOCKED: financeConfig.LOCKED.YES,
				PAYMENT_LOCK_KEY: lockKey,
			});
			if (updated != 1) this.AppError('来源收款已变化或已被锁定，请刷新后重试');
			locked++;
		}
		return locked;
	}

	async _rollbackPaymentLock(lockKey, paymentIds = []) {
		paymentIds = this._uniqueTexts(paymentIds);
		if (!lockKey || !paymentIds.length) return;
		try {
			for (let paymentId of paymentIds) {
				let payment = await WorkPaymentModel.getOne(paymentId);
				if (!payment) payment = await WorkPaymentModel.getOne({ PAYMENT_ID: paymentId });
				if (!payment) continue;
				await WorkPaymentModel.edit({
					_id: payment._id,
					PAYMENT_LOCK_KEY: lockKey,
					PAYMENT_IS_LOCKED: financeConfig.LOCKED.YES,
				}, {
					PAYMENT_IS_LOCKED: financeConfig.LOCKED.NO,
					PAYMENT_LOCK_KEY: '',
				});
			}
		} catch (err) {
			console.error('rollback payment lock failed:', err);
		}
	}

	async _rollbackPayrollLock(lockKey, commissionIds = [], payrollBizIds = [], paymentIds = []) {
		commissionIds = this._uniqueTexts(commissionIds);
		let bizIds = Array.isArray(payrollBizIds) ? payrollBizIds : [payrollBizIds];
		bizIds = this._uniqueTexts(bizIds);
		await this._rollbackPaymentLock(lockKey, paymentIds);
		if (!lockKey || !commissionIds.length || !bizIds.length) return;
		try {
			await WorkCommissionModel.edit({
				_id: ['in', commissionIds],
				COMMISSION_PAYROLL_LOCK_KEY: lockKey,
				COMMISSION_PAYROLL_ID: ['in', bizIds],
				COMMISSION_STATUS: ['in', [financeConfig.COMMISSION_STATUS.IN_PAYROLL, financeConfig.COMMISSION_STATUS.PAID]],
			}, {
				COMMISSION_STATUS: financeConfig.COMMISSION_STATUS.PENDING_PAY,
				COMMISSION_PAYROLL_LOCK_KEY: '',
				COMMISSION_PAYROLL_ID: '',
				COMMISSION_IS_PAYROLL_LOCKED: financeConfig.LOCKED.NO,
			});
		} catch (err) {
			console.error('rollback payroll lock failed:', err);
		}
	}

	async _markPayrollFail(payrollId, reason) {
		payrollId = this._text(payrollId || '', 120);
		if (!payrollId) return;
		try {
			await WorkPayrollModel.edit(payrollId, {
				PAYROLL_STATUS: WorkPayrollModel.STATUS.FAIL,
				PAYROLL_FAIL_REASON: this._text(reason || '工资发放失败', 300),
			});
		} catch (err) {
			console.error('mark payroll fail failed:', err);
		}
	}

	async payStaffMonth(staffId, month, previewHash, operator, options = {}) {
		let staff = await this._resolveStaffSnapshot(staffId, false);
		if (!staff.staffId) this.AppError('缺少员工ID');
		month = this._normalizeMonth(month);

		if (!this._isNewLedgerMonth(month)) {
			let provider = options && options.legacyPayProvider;
			if (typeof provider == 'function') return await provider(staff.staffId, month, previewHash, operator, options);
			this.AppError('切换月前工资需走旧发放入口');
		}

		previewHash = this._text(previewHash || '', 120);
		if (!previewHash) this.AppError('缺少工资预览hash');

		let preview = await this.previewStaffMonth(staff.staffId, month);
		if (preview.previewHash != previewHash) this.AppError('工资预览已变化，请刷新后重试');
		if (!preview.commissionIds || preview.commissionIds.length <= 0) this.AppError('没有待发提成，不能生成工资');

		let lockKey = this._buildPayrollLockKey(preview.staffId, month);
		let blockingPayroll = await WorkPayrollModel.getOne({
			PAYROLL_LOCK_KEY: lockKey,
			PAYROLL_STATUS: ['in', this._payrollBlockingStatuses()],
		}, '*', { PAYROLL_ADD_TIME: 'desc' });
		if (blockingPayroll) this.AppError('该员工该月份工资已在发放中或已发放，请勿重复发放');

		let payrollId = '';
		let payrollBizId = '';
		let commissionIds = this._uniqueTexts(preview.commissionIds);
		let paymentIds = this._uniqueTexts(preview.paymentIds);

		try {
			payrollId = await WorkPayrollModel.insert(this._buildPayrollData(preview, lockKey, operator, options));
			let payroll = await WorkPayrollModel.getOne(payrollId);
			if (!payroll) this.AppError('工资单创建失败');
			payrollBizId = payroll.PAYROLL_ID || payroll._id;
			await this._logPayroll('PAYROLL_PAY', payroll._id, null, payroll, {
				phase: financeConfig.FINANCE_LOG_PHASE.START,
				operator,
				bizKey: lockKey,
				note: '工资发放开始',
			});

			let lockCount = await WorkCommissionModel.edit({
				_id: ['in', commissionIds],
				COMMISSION_STAFF_ID: preview.staffId,
				COMMISSION_MONTH: month,
				COMMISSION_KIND: ['in', PAYROLL_KINDS],
				COMMISSION_STATUS: financeConfig.COMMISSION_STATUS.PENDING_PAY,
			}, {
				COMMISSION_STATUS: financeConfig.COMMISSION_STATUS.IN_PAYROLL,
				COMMISSION_PAYROLL_ID: payrollBizId,
				COMMISSION_PAYROLL_LOCK_KEY: lockKey,
				COMMISSION_IS_PAYROLL_LOCKED: financeConfig.LOCKED.YES,
			});
			if (lockCount != commissionIds.length) this.AppError('待发提成已变化或被其他工资单锁定，请刷新后重试');

			await this._lockPayrollPayments(paymentIds, lockKey, operator);

			let paidCount = await WorkCommissionModel.edit({
				_id: ['in', commissionIds],
				COMMISSION_STATUS: financeConfig.COMMISSION_STATUS.IN_PAYROLL,
				COMMISSION_PAYROLL_ID: payrollBizId,
				COMMISSION_PAYROLL_LOCK_KEY: lockKey,
			}, {
				COMMISSION_STATUS: financeConfig.COMMISSION_STATUS.PAID,
				COMMISSION_PAYROLL_ID: payrollBizId,
				COMMISSION_PAYROLL_LOCK_KEY: lockKey,
				COMMISSION_IS_PAYROLL_LOCKED: financeConfig.LOCKED.YES,
			});
			if (paidCount != commissionIds.length) this.AppError('提成发放状态更新失败，请人工核对工资锁');

			let payrollUpdated = await WorkPayrollModel.edit({
				_id: payroll._id,
				PAYROLL_LOCK_KEY: lockKey,
				PAYROLL_STATUS: WorkPayrollModel.STATUS.PAYING,
			}, {
				PAYROLL_STATUS: WorkPayrollModel.STATUS.PAID,
				PAYROLL_PAY_TIME: this._now(),
				PAYROLL_PAYMENT_IDS: paymentIds,
			});
			if (payrollUpdated != 1) this.AppError('工资单状态更新失败，请人工核对工资锁');

			let finalPayroll = await WorkPayrollModel.getOne(payroll._id);
			await this._logPayroll('PAYROLL_PAY', payroll._id, payroll, finalPayroll, {
				phase: financeConfig.FINANCE_LOG_PHASE.SUCCESS,
				operator,
				bizKey: lockKey,
				note: '工资发放成功',
			});
			return {
				paid: true,
				payroll: finalPayroll,
				payrollId: finalPayroll ? finalPayroll._id : payroll._id,
				payrollBizId: finalPayroll ? (finalPayroll.PAYROLL_ID || finalPayroll._id) : payrollBizId,
				preview,
			};
		} catch (err) {
			let errorMessage = err && err.message ? err.message : String(err || '工资发放失败');
			await this._rollbackPayrollLock(lockKey, commissionIds, [payrollBizId, payrollId], paymentIds);
			await this._markPayrollFail(payrollId, errorMessage);
			let failedPayroll = payrollId ? await WorkPayrollModel.getOne(payrollId) : null;
			await this._logPayroll('PAYROLL_PAY', payrollId, failedPayroll, failedPayroll, {
				phase: financeConfig.FINANCE_LOG_PHASE.FAIL,
				operator,
				bizKey: lockKey,
				note: '工资发放失败',
				error: errorMessage,
			});
			if (err && err.message) this.AppError(err.message);
			throw err;
		}
	}
}

module.exports = WorkPayrollService;
