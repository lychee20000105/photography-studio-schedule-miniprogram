/**
 * Notes: 云屿摄影 v1.2.0 业绩看板服务
 */

const util = require('../../../framework/utils/util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const BaseProjectService = require('./base_project_service.js');
const WorkPermissionService = require('./work_permission_service.js');
const WorkPaymentService = require('./work_payment_service.js');
const WorkCommissionService = require('./work_commission_service.js');
const financeConfig = require('./work_finance_config.js');
const moneyUtil = require('./work_money_util.js');

const WorkPaymentModel = require('../model/work_payment_model.js');
const WorkCommissionModel = require('../model/work_commission_model.js');
const WorkStaffModel = require('../model/work_staff_model.js');
const WorkOrderModel = require('../model/work_order_model.js');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const PAYROLL_KINDS = [
	financeConfig.COMMISSION_KIND.CURRENT,
	financeConfig.COMMISSION_KIND.RELEASE,
	financeConfig.COMMISSION_KIND.ADJUST,
	financeConfig.COMMISSION_KIND.DEDUCT,
];

class WorkPerformanceService extends BaseProjectService {

	constructor() {
		super();
		this._permission = new WorkPermissionService();
		this._payment = new WorkPaymentService();
		this._commission = new WorkCommissionService();
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

	_month(month = '') {
		let ret = financeConfig.normalizeMonth(month || timeUtil.time('Y-M'));
		if (!ret) this.AppError('月份格式错误');
		return ret;
	}

	_withProjectWhere(andWhere = {}, orWhere = null) {
		let pid = util.getProjectId();
		andWhere = Object.assign({ _pid: pid }, andWhere || {});
		if (orWhere && Array.isArray(orWhere) && orWhere.length > 0) return { and: andWhere, or: orWhere };
		return andWhere;
	}

	_cleanStaff(staff = {}) {
		return {
			_id: staff._id || '',
			STAFF_ID: staff.STAFF_ID || '',
			STAFF_NAME: staff.STAFF_NAME || '',
			STAFF_TEAM_ID: staff.STAFF_TEAM_ID || '',
			STAFF_TEAM_NAME: staff.STAFF_TEAM_NAME || '',
			STAFF_IS_ADMIN: Number(staff.STAFF_IS_ADMIN || 0),
		};
	}

	_amount(cent) {
		return moneyUtil.centToYuan(cent);
	}

	_emptyStat() {
		return {
			netPerformanceCent: 0,
			incomeCent: 0,
			refundCent: 0,
			refundAbsCent: 0,
			paymentCount: 0,
			incomeCount: 0,
			refundCount: 0,
			currentCommissionCent: 0,
			releaseCommissionCent: 0,
			deductCommissionCent: 0,
			adjustCommissionCent: 0,
			frozenRemainCent: 0,
			payableCent: 0,
		};
	}

	_finishStat(stat) {
		stat.netPerformance = this._amount(stat.netPerformanceCent);
		stat.performanceCent = stat.netPerformanceCent;
		stat.performance = stat.netPerformance;
		stat.income = this._amount(stat.incomeCent);
		stat.refundAbsCent = Math.abs(stat.refundCent);
		stat.refund = this._amount(stat.refundCent);
		stat.refundAbs = this._amount(stat.refundAbsCent);
		stat.currentCommission = this._amount(stat.currentCommissionCent);
		stat.releaseCommission = this._amount(stat.releaseCommissionCent);
		stat.deductCommission = this._amount(stat.deductCommissionCent);
		stat.adjustCommission = this._amount(stat.adjustCommissionCent);
		stat.frozenRemain = this._amount(stat.frozenRemainCent);
		stat.payable = this._amount(stat.payableCent);
		return stat;
	}

	_addPayment(stat, payment = {}) {
		let amountCent = moneyUtil.safeCent(payment.PAYMENT_AMOUNT_CENT, 0);
		stat.netPerformanceCent += amountCent;
		stat.paymentCount++;
		if (payment.PAYMENT_DIRECTION == financeConfig.PAYMENT_DIRECTION.INCOME || amountCent > 0) {
			stat.incomeCent += amountCent;
			stat.incomeCount++;
		} else {
			stat.refundCent += amountCent;
			stat.refundCount++;
		}
	}

	_addCommission(stat, commission = {}) {
		let kind = commission.COMMISSION_KIND || '';
		let amountCent = moneyUtil.safeCent(commission.COMMISSION_AMOUNT_CENT, 0);
		if (kind == financeConfig.COMMISSION_KIND.CURRENT) stat.currentCommissionCent += amountCent;
		else if (kind == financeConfig.COMMISSION_KIND.RELEASE) stat.releaseCommissionCent += amountCent;
		else if (kind == financeConfig.COMMISSION_KIND.DEDUCT) stat.deductCommissionCent += amountCent;
		else if (kind == financeConfig.COMMISSION_KIND.ADJUST) stat.adjustCommissionCent += amountCent;
		else if (kind == financeConfig.COMMISSION_KIND.FROZEN) stat.frozenRemainCent += moneyUtil.safeCent(commission.COMMISSION_FROZEN_REMAIN_CENT, 0);
		if (PAYROLL_KINDS.includes(kind)) stat.payableCent += amountCent;
	}

	async _getStaffByOpenId(openId) {
		return await this._permission.getStaffByOpenId(openId, true);
	}

	async _getPaymentStat(month, filters = {}) {
		let where = Object.assign({
			PAYMENT_MONTH: month,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		}, filters || {});
		let list = await WorkPaymentModel.getAll(this._withProjectWhere(where), '*', { PAYMENT_DATE: 'asc' }, 1000);
		let stat = this._emptyStat();
		for (let item of list || []) this._addPayment(stat, item);
		return { stat, list: list || [] };
	}

	async _getCommissionStat(month, filters = {}) {
		let where = Object.assign({
			COMMISSION_MONTH: month,
			COMMISSION_STATUS: ['!=', financeConfig.COMMISSION_STATUS.VOID],
		}, filters || {});
		let list = await WorkCommissionModel.getAll(this._withProjectWhere(where), '*', { COMMISSION_PAYMENT_DATE: 'asc' }, 1000);
		let stat = this._emptyStat();
		for (let item of list || []) this._addCommission(stat, item);
		return { stat, list: list || [] };
	}

	_mergeStats(paymentStat, commissionStat) {
		let stat = this._emptyStat();
		Object.assign(stat, paymentStat || {});
		stat.currentCommissionCent = commissionStat.currentCommissionCent || 0;
		stat.releaseCommissionCent = commissionStat.releaseCommissionCent || 0;
		stat.deductCommissionCent = commissionStat.deductCommissionCent || 0;
		stat.adjustCommissionCent = commissionStat.adjustCommissionCent || 0;
		stat.frozenRemainCent = commissionStat.frozenRemainCent || 0;
		stat.payableCent = commissionStat.payableCent || 0;
		return this._finishStat(stat);
	}

	_cleanRankItem(item = {}, staff = {}, scope = 'staff', options = {}) {
		let selfTeamId = this._text(staff.STAFF_TEAM_ID || '未分组', 80);
		let isSelf = scope == 'staff' && item.id == staff._id;
		let isOwnRank = isSelf || (scope == 'team' && item.id == selfTeamId);
		let amountVisible = !!options.showAllAmounts || isSelf;
		let ret = {
			id: item.id || '',
			name: item.name || '',
			rankNo: item.rankNo || 0,
			amountVisible,
			isSelf,
			isOwnRank,
		};
		if (amountVisible) {
			ret.netPerformanceCent = item.netPerformanceCent || 0;
			ret.performanceCent = item.performanceCent || 0;
			ret.incomeCent = item.incomeCent || 0;
			ret.refundCent = item.refundCent || 0;
			ret.refundAbsCent = item.refundAbsCent || 0;
			ret.paymentCount = item.paymentCount || 0;
			ret.incomeCount = item.incomeCount || 0;
			ret.refundCount = item.refundCount || 0;
			ret.netPerformance = item.netPerformance || '0';
			ret.performance = item.performance || ret.netPerformance;
			ret.income = item.income || '0';
			ret.refund = item.refund || '0';
			ret.refundAbs = item.refundAbs || '0';
		}
		return ret;
	}

	async getRank(openId, month, scope = 'staff', options = {}) {
		let staff = await this._getStaffByOpenId(openId);
		month = this._month(month);
		scope = this._text(scope || 'staff', 20);
		let map = {};
		let staffList = await WorkStaffModel.getAll(this._withProjectWhere({
			STAFF_STATUS: WorkStaffModel.STATUS.COMM,
		}), '_id,STAFF_NAME,STAFF_TEAM_ID,STAFF_TEAM_NAME', {
			STAFF_ADD_TIME: 'asc',
		}, 1000);
		for (let item of staffList || []) {
			let id = scope == 'team' ? this._text(item.STAFF_TEAM_ID || '未分组', 80) : item._id;
			if (!id) continue;
			if (!map[id]) {
				map[id] = this._emptyStat();
				map[id].id = id;
				map[id].name = scope == 'team' ? this._text(item.STAFF_TEAM_NAME || '未分组', 80) : this._text(item.STAFF_NAME || '未命名', 80);
			}
		}
		let payments = await WorkPaymentModel.getAll(this._withProjectWhere({
			PAYMENT_MONTH: month,
			PAYMENT_STATUS: financeConfig.PAYMENT_STATUS.EFFECTIVE,
		}), '*', { PAYMENT_DATE: 'asc' }, 1000);
		for (let payment of payments || []) {
			let id = scope == 'team' ? this._text(payment.PAYMENT_TEAM_ID || '未分组', 80) : this._text(payment.PAYMENT_STAFF_ID || '', 120);
			if (!id) continue;
			if (!map[id]) {
				map[id] = this._emptyStat();
				map[id].id = id;
				map[id].name = scope == 'team' ? this._text(payment.PAYMENT_TEAM_NAME || '未分组', 80) : this._text(payment.PAYMENT_STAFF_NAME || '未命名', 80);
			}
			this._addPayment(map[id], payment);
		}
		let list = Object.keys(map).map(key => this._finishStat(map[key]));
		list.sort((a, b) => b.netPerformanceCent - a.netPerformanceCent || b.incomeCent - a.incomeCent);
		let ret = list.map((item, idx) => this._cleanRankItem(Object.assign({ rankNo: idx + 1 }, item), staff, scope, options));
		if (!options.showAllAmounts) {
			let selfIdx = ret.findIndex(item => item.isOwnRank);
			if (selfIdx > 0) ret.unshift(ret.splice(selfIdx, 1)[0]);
		}
		return ret;
	}

	async getSummary(openId, month) {
		let staff = await this._getStaffByOpenId(openId);
		month = this._month(month);
		let payments = await this._getPaymentStat(month, { PAYMENT_STAFF_ID: staff._id });
		let commissions = await this._getCommissionStat(month, { COMMISSION_STAFF_ID: staff._id });
		let my = this._mergeStats(payments.stat, commissions.stat);
		let rankList = await this.getRank(openId, month, 'staff');
		let myRank = rankList.find(item => item.id == staff._id);
		my.rankNo = myRank ? myRank.rankNo : 0;
		return {
			month,
			isAdmin: Number(staff.STAFF_IS_ADMIN || 0) == 1,
			staff: this._cleanStaff(staff),
			my,
			rankList,
			paymentList: (payments.list || []).slice(0, 10),
			commissionList: (commissions.list || []).slice(0, 10),
		};
	}

	async getMyPaymentList(openId, query = {}) {
		let staff = await this._getStaffByOpenId(openId);
		query = Object.assign({}, query || {}, { staffId: staff._id });
		return await this._payment.listPayments(query, staff);
	}

	async getMyCommissionList(openId, query = {}) {
		let staff = await this._getStaffByOpenId(openId);
		query = Object.assign({}, query || {}, { staffId: staff._id });
		return await this._commission.listCommissions(query, staff);
	}

	async getAdminBoard(openId, month) {
		await this._getStaffByOpenId(openId);
		month = this._month(month);
		let payments = await this._getPaymentStat(month);
		let commissions = await this._getCommissionStat(month);
		let stat = this._mergeStats(payments.stat, commissions.stat);
		stat.auditCount = await WorkOrderModel.count(this._withProjectWhere({
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
			ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.WAIT_AUDIT,
		}));
		stat.cancelPendingCount = await WorkOrderModel.count(this._withProjectWhere({
			ORDER_FINANCE_STATUS: financeConfig.ORDER_FINANCE_STATUS.CANCEL_PENDING,
		}));
		return {
			month,
			stat,
			rankList: await this.getRank(openId, month, 'staff', { showAllAmounts: true }),
			teamRankList: await this.getRank(openId, month, 'team', { showAllAmounts: true }),
		};
	}
}

module.exports = WorkPerformanceService;
