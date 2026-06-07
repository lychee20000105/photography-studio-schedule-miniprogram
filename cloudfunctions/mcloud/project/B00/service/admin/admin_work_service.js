/**
 * Notes: 云屿摄影内部工作台后台管理
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const WorkService = require('../work_service.js');
const WorkPaymentService = require('../work_payment_service.js');
const WorkCommissionService = require('../work_commission_service.js');
const WorkPayrollService = require('../work_payroll_service.js');
const financeConfig = require('../work_finance_config.js');
const timeUtil = require('../../../../framework/utils/time_util.js');

const WorkStaffModel = require('../../model/work_staff_model.js');
const WorkTypeModel = require('../../model/work_type_model.js');
const WorkOrderModel = require('../../model/work_order_model.js');
const WorkPaymentModel = require('../../model/work_payment_model.js');
const WorkCommissionModel = require('../../model/work_commission_model.js');
const WorkItemModel = require('../../model/work_item_model.js');
const WorkRestModel = require('../../model/work_rest_model.js');
const WorkPayrollModel = require('../../model/work_payroll_model.js');

class AdminWorkService extends BaseProjectAdminService {

	constructor() {
		super();
		this._work = new WorkService();
		this._payment = this._work._payment || new WorkPaymentService();
		this._commission = this._work._commission || new WorkCommissionService();
		this._payroll = this._work._payroll || new WorkPayrollService();
		this._financeConfig = financeConfig;
	}

	async getStaffList() {
		let list = await WorkStaffModel.getAll({}, '*', {
			STAFF_STATUS: 'desc',
			STAFF_NAME: 'asc',
		}, 1000);
		return list;
	}

	async saveStaff(input) {
		input = input || {};
		let id = input._id || input.id || '';
		let mobile = String(input.STAFF_MOBILE || '').trim();
		if (!input.STAFF_NAME) this.AppError('请填写员工姓名');
		if (!/^1[3-9]\d{9}$/.test(mobile)) this.AppError('请填写11位手机号');
		if (!input.STAFF_BIND_CODE) this.AppError('请填写绑定码/工号');

		let whereMobile = {
			STAFF_MOBILE: mobile,
		};
		if (id) whereMobile._id = ['<>', id];
		let cnt = await WorkStaffModel.count(whereMobile);
		if (cnt > 0) this.AppError('该手机号已经存在');

		let data = {
			STAFF_NAME: input.STAFF_NAME,
			STAFF_MOBILE: mobile,
			STAFF_BIND_CODE: String(input.STAFF_BIND_CODE || '').trim(),
			STAFF_ROLES: Array.isArray(input.STAFF_ROLES) ? input.STAFF_ROLES : [],
			STAFF_RULES: this._cleanRules(input.STAFF_RULES),
			STAFF_STATUS: Number(input.STAFF_STATUS || 1),
		};
		if (!id || input.STAFF_IS_ADMIN !== undefined) data.STAFF_IS_ADMIN = Number(input.STAFF_IS_ADMIN || 0);
		if (input.STAFF_TEAM_ID !== undefined) data.STAFF_TEAM_ID = String(input.STAFF_TEAM_ID || '').trim();
		if (input.STAFF_TEAM_NAME !== undefined) data.STAFF_TEAM_NAME = String(input.STAFF_TEAM_NAME || '').trim();

		if (id) {
			await WorkStaffModel.edit(id, data);
		} else {
			id = await WorkStaffModel.insert(data);
		}
		return { id };
	}

	_cleanRules(rules) {
		if (!Array.isArray(rules)) return [];
		let ret = [];
		for (let item of rules) {
			if (!item || !item.roleName) continue;
			let mode = item.mode || 'percent';
			if (!['percent', 'fixed', 'manual', 'none'].includes(mode)) mode = 'percent';
			ret.push({
				roleName: item.roleName,
				mode,
				percent: Number(item.percent || 0),
				amount: Number(item.amount || 0),
			});
		}
		return ret;
	}

	async stopStaff(id, status) {
		await WorkStaffModel.edit(id, {
			STAFF_STATUS: Number(status),
		});
	}

	async getTypeList() {
		await this._work.ensureDefaults();
		return await WorkTypeModel.getAll({}, '*', {
			TYPE_ORDER: 'asc',
			TYPE_ADD_TIME: 'asc',
		}, 1000);
	}

	async saveType(input) {
		input = input || {};
		let id = input._id || input.id || '';
		if (!input.TYPE_NAME) this.AppError('请填写类型名称');
		let data = {
			TYPE_NAME: input.TYPE_NAME,
			TYPE_COLOR: input.TYPE_COLOR || '#e60012',
			TYPE_ORDER: Number(input.TYPE_ORDER || 999),
			TYPE_IS_OTHER: Number(input.TYPE_IS_OTHER || 0),
			TYPE_STATUS: Number(input.TYPE_STATUS || 1),
		};
		if (id) await WorkTypeModel.edit(id, data);
		else id = await WorkTypeModel.insert(data);
		return { id };
	}

	async getAuditList() {
		let orders = await WorkOrderModel.getAll({
			ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.WAIT_AUDIT,
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
		}, '*', {
			ORDER_COMPLETE_TIME: 'desc',
		}, 1000);

		let items = await WorkItemModel.getAll({
			ITEM_STATUS: 0,
		}, '*', {
			ITEM_ADD_TIME: 'desc',
		}, 1000);

		let rests = await WorkRestModel.getAll({
			REST_STATUS: 0,
		}, '*', {
			REST_ADD_TIME: 'desc',
		}, 1000);

		return {
			orders: orders.map(order => {
				order.ORDER_PROGRESS_DESC = this._work._getProgressDesc(order.ORDER_PROGRESS);
				order.ORDER_SETTLE_STATUS_DESC = this._work._getSettleDesc(order.ORDER_SETTLE_STATUS);
				return order;
			}),
			items,
			rests,
		};
	}

	async auditOrder(admin, id, pass, reason = '', participants = null) {
		let order = await WorkOrderModel.getOne(id);
		if (!order) this.AppError('订单不存在');
		if (order.ORDER_STATUS == WorkOrderModel.STATUS.CANCEL) this.AppError('订单已取消');

		let oldOrder = JSON.parse(JSON.stringify(order));
		if (oldOrder.ORDER_SETTLE_STATUS !== WorkOrderModel.SETTLE.WAIT_AUDIT) this.AppError('订单不是待审核状态，不能重复审核');

		let oldParticipants = oldOrder.ORDER_PARTICIPANTS || [];
		if (participants && Array.isArray(participants)) {
			order.ORDER_PARTICIPANTS = participants;
		}
		order.ORDER_ACTUAL_AMOUNT = this._work._money(order.ORDER_DEPOSIT + order.ORDER_FINAL + order.ORDER_EXTRA);
		let nextParticipants = await this._work._buildParticipants(order.ORDER_PARTICIPANTS, order, oldParticipants);
		let participantsChanged = this._work._participantsChanged(oldParticipants, nextParticipants);
		order.ORDER_PARTICIPANTS = nextParticipants;

		if (!pass) {
			let updated = await WorkOrderModel.edit({
				_id: id,
				ORDER_STATUS: WorkOrderModel.STATUS.COMM,
				ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.WAIT_AUDIT,
			}, {
				ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.REJECT,
				ORDER_AUDIT_REASON: reason || '',
				ORDER_AUDIT_ADMIN_ID: admin._id || '',
				ORDER_AUDIT_ADMIN_NAME: admin.ADMIN_NAME || '',
				ORDER_AUDIT_TIME: timeUtil.time(),
			});
			if (updated !== 1) this.AppError('订单审核状态已变化，请刷新后重试');
			await this._notifyOrderPeople(order, '订单审核驳回', reason || '请查看订单后重新提交', id);
			return;
		}

		if (participantsChanged) await this._work._assertCanChangeFinanceSnapshot(oldOrder, order, nextParticipants);

		let adjustments = order.ORDER_ADJUSTMENTS || [];
		for (let p of order.ORDER_PARTICIPANTS) {
			if (!p.isSettled) continue;
			let diff = this._work._money(p.amount - p.settledAmount);
			if (diff == 0) continue;
			let exists = adjustments.find(adj => adj.participantId == p.id && adj.newAmount == p.amount && adj.settledAmount == p.settledAmount && !adj.isSettled);
			if (!exists) {
				adjustments.push({
					id: String(Date.now()) + '_' + p.id,
					participantId: p.id,
					staffId: p.staffId,
					staffName: p.staffName,
					roleName: p.roleName,
					amount: diff,
					settledAmount: p.settledAmount,
					newAmount: p.amount,
					reason: '订单重新审核产生调整',
					month: timeUtil.time('Y-M'),
					isSettled: 0,
					addTime: timeUtil.time(),
				});
			}
		}

		let auditTime = timeUtil.time();
		let auditMonth = timeUtil.time('Y-M');
		let updated = await WorkOrderModel.edit({
			_id: id,
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
			ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.WAIT_AUDIT,
		}, {
			ORDER_PROGRESS: WorkOrderModel.PROGRESS.DONE,
			ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.WAIT_PAY,
			ORDER_ACTUAL_AMOUNT: order.ORDER_ACTUAL_AMOUNT,
			ORDER_PARTICIPANTS: order.ORDER_PARTICIPANTS,
			ORDER_ADJUSTMENTS: adjustments,
			ORDER_AUDIT_REASON: '',
			ORDER_AUDIT_ADMIN_ID: admin._id || '',
			ORDER_AUDIT_ADMIN_NAME: admin.ADMIN_NAME || '',
			ORDER_AUDIT_TIME: auditTime,
		});
		if (updated !== 1) this.AppError('订单审核状态已变化，请刷新后重试');
		await this._commission.releaseFrozenByOrder(id, admin, { month: auditMonth });
		await this._notifyOrderPeople(order, '订单审核通过', '该订单已进入待结算', id);
	}

	async auditItem(admin, id, pass, reason = '') {
		let item = await WorkItemModel.getOne(id);
		if (!item) this.AppError('事项不存在');
		await WorkItemModel.edit(id, {
			ITEM_STATUS: pass ? 1 : 20,
			ITEM_AUDIT_REASON: reason || '',
			ITEM_AUDIT_ADMIN_ID: admin._id || '',
			ITEM_AUDIT_ADMIN_NAME: admin.ADMIN_NAME || '',
			ITEM_AUDIT_TIME: timeUtil.time(),
		});
	}

	async auditRest(admin, id, pass, reason = '') {
		let rest = await WorkRestModel.getOne(id);
		if (!rest) this.AppError('休息记录不存在');
		await WorkRestModel.edit(id, {
			REST_STATUS: pass ? 1 : 20,
			REST_AUDIT_REASON: reason || '',
			REST_AUDIT_ADMIN_ID: admin._id || '',
			REST_AUDIT_ADMIN_NAME: admin.ADMIN_NAME || '',
			REST_AUDIT_TIME: timeUtil.time(),
		});
	}

	async _notifyOrderPeople(order, title, content, orderId) {
		let sent = {};
		if (order.ORDER_CREATOR_STAFF_ID) {
			sent[order.ORDER_CREATOR_STAFF_ID] = true;
			await this._work._notifyStaff(order.ORDER_CREATOR_STAFF_ID, title, content, 'order', orderId);
		}
		for (let p of (order.ORDER_PARTICIPANTS || [])) {
			if (!p.staffId || sent[p.staffId]) continue;
			sent[p.staffId] = true;
			await this._work._notifyStaff(p.staffId, title, content, 'order', orderId);
		}
	}

	async getPayroll(staffId, month) {
		return await this._work.getPayrollForStaff(staffId, month);
	}

	_hasPayablePayroll(data) {
		return (data.payable || []).length > 0 || (data.adjustments || []).length > 0;
	}

	async _getPayablePayrollData(staffId, month) {
		let exists = await WorkPayrollModel.getOne({
			PAYROLL_STAFF_ID: staffId,
			PAYROLL_MONTH: month,
		}, '_id,PAYROLL_STATUS,PAYROLL_PAY_TIME');
		if (exists) this.AppError('该员工该月份已有工资发放记录，请勿重复发放');

		let data = await this._work.getPayrollForStaff(staffId, month);
		if ((data.settled || []).length > 0) this.AppError('该员工该月份已有工资发放记录，请勿重复发放');
		if (!this._hasPayablePayroll(data)) this.AppError('该员工该月份没有待发工资项，请刷新后重试');
		return data;
	}

	async _settlePayrollOrders(data, staffId, month, payrollId) {
		let orderIds = new Set();
		for (let item of (data.payable || [])) {
			if (item.orderId) orderIds.add(item.orderId);
		}
		for (let adj of (data.adjustments || [])) {
			if (adj.orderId) orderIds.add(adj.orderId);
		}

		let adjustmentIds = new Set();
		for (let adj of (data.adjustments || [])) {
			if (adj.id) adjustmentIds.add(adj.id);
		}

		for (let orderId of orderIds) {
			let order = await WorkOrderModel.getOne(orderId);
			if (!order) this.AppError('工资结算失败：订单不存在，请刷新后重试');

			let now = timeUtil.time();
			let changed = false;
			let participants = order.ORDER_PARTICIPANTS || [];
			if (order.ORDER_COMPLETE_MONTH == month) {
				for (let p of participants) {
					if (p.staffId == staffId && !p.isSettled) {
						p.isSettled = 1;
						p.settledAmount = this._work._money(p.amount);
						p.settledPayrollId = payrollId;
						p.settledTime = now;
						p.settledMonth = month;
						changed = true;
					}
				}
			}

			let adjustments = order.ORDER_ADJUSTMENTS || [];
			for (let adj of adjustments) {
				if (adj.staffId == staffId && !adj.isSettled && (adj.month || order.ORDER_COMPLETE_MONTH) == month && adjustmentIds.has(adj.id)) {
					adj.isSettled = 1;
					adj.settledPayrollId = payrollId;
					adj.settledTime = now;
					changed = true;
				}
			}

			if (!changed) this.AppError('工资结算失败：待发项已变化，请刷新后重试');

			let allSettled = participants.length > 0 && participants.every(p => p.isSettled);
			let allAdjSettled = adjustments.every(adj => adj.isSettled);
			let updated = await WorkOrderModel.edit(order._id, {
				ORDER_PARTICIPANTS: participants,
				ORDER_ADJUSTMENTS: adjustments,
				ORDER_SETTLE_STATUS: allSettled && allAdjSettled ? WorkOrderModel.SETTLE.PAID : WorkOrderModel.SETTLE.WAIT_PAY,
			});
			if (updated != 1) this.AppError('工资结算失败：订单写回失败，请检查工资记录 ' + payrollId);
		}
	}

	async _payNewLedgerStaffMonth(admin, staffId, month, actualAmount, note = '') {
		let preview = await this._payroll.getPayrollForStaff(staffId, month);
		let totalCent = Number(preview && preview.totalCent || 0);
		if (!preview || preview.legacy) this.AppError('新版工资预览失败，请刷新后重试');

		let hasActualAmount = !(actualAmount === '' || actualAmount === undefined || actualAmount === null);
		if (hasActualAmount) {
			let actualCent = this._work._moneyCentStrict(actualAmount, '实发金额');
			if (actualCent != totalCent) this.AppError('新版工资差额请先新增调整项');
		}

		let operator = Object.assign({
			ADMIN_ID: admin && admin._id || '',
		}, admin || {});
		return await this._payroll.payStaffMonth(staffId, month, preview.previewHash, operator, {
			note,
		});
	}

	async payStaffMonth(admin, staffId, month, actualAmount, note = '') {
		month = month || timeUtil.time('Y-M');
		if (this._financeConfig.isNewLedgerMonth(month)) return await this._payNewLedgerStaffMonth(admin, staffId, month, actualAmount, note);
		let hasActualAmount = !(actualAmount === '' || actualAmount === undefined || actualAmount === null);
		let data = await this._getPayablePayrollData(staffId, month);
		let amount = this._work._money(data.total);
		actualAmount = hasActualAmount ? this._work._money(actualAmount) : amount;

		let payrollId = '';
		try {
			payrollId = await WorkPayrollModel.insert({
				PAYROLL_STAFF_ID: staffId,
				PAYROLL_STAFF_NAME: data.staff.STAFF_NAME,
				PAYROLL_MONTH: month,
				PAYROLL_ITEMS: data.payable,
				PAYROLL_ADJUSTMENTS: data.adjustments,
				PAYROLL_AMOUNT: amount,
				PAYROLL_ACTUAL_AMOUNT: 0,
				PAYROLL_STATUS: WorkPayrollModel.STATUS.PAYING,
				PAYROLL_NOTE: note || '',
				PAYROLL_ADMIN_ID: admin._id || '',
				PAYROLL_ADMIN_NAME: admin.ADMIN_NAME || '',
				PAYROLL_PAY_TIME: timeUtil.time(),
			});

			let existsCount = await WorkPayrollModel.count({
				PAYROLL_STAFF_ID: staffId,
				PAYROLL_MONTH: month,
			});
			if (existsCount > 1) this.AppError('该员工该月份存在并发工资发放记录，请人工核对');

			await this._settlePayrollOrders(data, staffId, month, payrollId);
			let remain = await this._work.getPayrollForStaff(staffId, month);
			if (this._hasPayablePayroll(remain)) this.AppError('工资结算失败：仍存在未结清项目，请检查工资记录 ' + payrollId);

			await WorkPayrollModel.edit(payrollId, {
				PAYROLL_ACTUAL_AMOUNT: actualAmount,
				PAYROLL_STATUS: WorkPayrollModel.STATUS.PAID,
			});
		} catch (err) {
			if (payrollId) {
				try {
					await WorkPayrollModel.edit(payrollId, {
						PAYROLL_ACTUAL_AMOUNT: 0,
						PAYROLL_STATUS: WorkPayrollModel.STATUS.FAIL,
					});
				} catch (e) { }
			}
			throw err;
		}

		return { payrollId };
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

	async _hasPayrollOrderMarkerAll(order) {
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
			if (list.some(payroll => this._payrollContainsOrder(payroll, order))) return true;
			if (!list.length || list.length < size) break;
			if (data.count && page >= data.count) break;
			page++;
		}

		return false;
	}

	async _assertOrderCanPhysicalDelete(order) {
		if (!order) this.AppError('订单不存在');
		if (order.ORDER_STATUS !== WorkOrderModel.STATUS.CANCEL) this.AppError('请先取消订单后再删除');
		if (await this._work._hasLegacySettlementLock(order)) this.AppError('该订单已有结算或工资记录，禁止物理删除，请走财务冲正/调整流程');
		if (await this._hasPayrollOrderMarkerAll(order)) this.AppError('该订单已有工资发放引用，禁止物理删除，请走财务冲正/调整流程');

		let paymentCount = await WorkPaymentModel.count({
			PAYMENT_ORDER_ID: order._id,
		});
		let commissionCount = await WorkCommissionModel.count({
			COMMISSION_ORDER_ID: order._id,
		});
		if (paymentCount > 0 || commissionCount > 0) this.AppError('该订单已有收款/提成账本记录，禁止物理删除，请先取消订单并完成财务冲正');
	}

	async getCanceledOrders() {
		return await WorkOrderModel.getAll({
			ORDER_STATUS: WorkOrderModel.STATUS.CANCEL,
		}, '*', {
			ORDER_EDIT_TIME: 'desc',
		}, 1000);
	}

	async delOrder(id) {
		let order = await WorkOrderModel.getOne(id);
		await this._assertOrderCanPhysicalDelete(order);

		let latest = await WorkOrderModel.getOne(id);
		await this._assertOrderCanPhysicalDelete(latest);

		this.AppError('v1.2.0 启用财务账本后禁止后台物理删除订单，请使用取消订单并通过收款/提成冲正保留审计链');
	}

	async restoreOrder(id) {
		await WorkOrderModel.edit(id, {
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
			ORDER_CANCEL_REASON: '',
		});
	}
}

module.exports = AdminWorkService;
