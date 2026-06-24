/**
 * Notes: 云屿摄影小程序内管理中心控制器
 */

const BaseProjectController = require('./base_project_controller.js');
const util = require('../../../framework/utils/util.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const WorkAdminAuthService = require('../service/work_admin_auth_service.js');
const WorkPerformanceService = require('../service/work_performance_service.js');
const WorkPaymentService = require('../service/work_payment_service.js');
const WorkCommissionService = require('../service/work_commission_service.js');
const WorkPayrollService = require('../service/work_payroll_service.js');
const WorkAdminStaffService = require('../service/work_admin_staff_service.js');
const AdminWorkService = require('../service/admin/admin_work_service.js');
const WorkService = require('../service/work_service.js');
const WorkAiService = require('../service/work_ai_service.js');
const WorkAgentAuditService = require('../service/work_agent_audit_service.js');
const WorkStaffModel = require('../model/work_staff_model.js');

class WorkAdminController extends BaseProjectController {

	async _assertMiniAdmin() {
		let service = new WorkAdminAuthService();
		return await service.assertMiniAdmin(this._userId);
	}

	_buildAdminLike(staff) {
		staff = staff || {};
		return {
			_id: staff._id || '',
			ADMIN_ID: staff.STAFF_ID || staff._id || '',
			ADMIN_NAME: staff.STAFF_NAME || '',
			STAFF_NAME: staff.STAFF_NAME || '',
			ADMIN_DESC: '小程序管理员',
			ADMIN_PHONE: staff.STAFF_MOBILE || '',
			ADMIN_TYPE: 1,
			ADMIN_STATUS: 1,
		};
	}

	_cleanStaffOption(staff) {
		return {
			_id: staff._id,
			STAFF_ID: staff.STAFF_ID || '',
			STAFF_NAME: staff.STAFF_NAME || '',
			STAFF_TEAM_ID: staff.STAFF_TEAM_ID || '',
			STAFF_TEAM_NAME: staff.STAFF_TEAM_NAME || '',
			STAFF_IS_ADMIN: Number(staff.STAFF_IS_ADMIN || 0),
			STAFF_STATUS: Number(staff.STAFF_STATUS || 0),
		};
	}

	async getHome() {
		let input = this.validateData({
			month: 'string|name=月份',
		});
		let staff = await this._assertMiniAdmin();
		let service = new WorkPerformanceService();
		let board = await service.getAdminBoard(this._userId, input.month || '');
		return {
			staff: this._cleanStaffOption(staff),
			stat: board.stat,
			rankList: board.rankList,
			teamRankList: board.teamRankList,
			menus: [
				{ title: '业绩看板', desc: '全店业绩、排行、收款概览', url: '/projects/B00/pages/work/admin_performance/work_admin_performance' },
				{ title: '员工管理', desc: '新增员工、维护岗位与提成规则', url: '/projects/B00/pages/work/admin_staff/work_admin_staff' },
				{ title: '收款明细', desc: '新增收款、退款、作废未锁定收款', url: '/projects/B00/pages/work/admin_payment/work_admin_payment' },
				{ title: '员工提成', desc: '查看先发/冻结/释放/扣回', url: '/projects/B00/pages/work/admin_commission/work_admin_commission' },
				{ title: '待释放提成', desc: '查看冻结余额，不手动释放', url: '/projects/B00/pages/work/admin_frozen/work_admin_frozen' },
				{ title: '工资结算', desc: '预览并确认发放工资', url: '/projects/B00/pages/work/admin_payroll/work_admin_payroll' },
				{ title: '订单审核', desc: '审核完成订单并触发释放', url: '/projects/B00/pages/work/admin_audit/work_admin_audit' },
				{ title: '问题反馈', desc: '查看员工提交的问题和建议', url: '/projects/B00/pages/work/admin_feedback/work_admin_feedback' },
				{ title: 'AI 小助手', desc: '配置猫咪对话的接口、模型和提示词', url: '/projects/B00/pages/work/admin_ai/work_admin_ai' },
				{ title: 'AI 审计流水', desc: '查看小猫执行过的写入动作、风险等级和审查记录', url: '/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit' },
			],
		};
	}

	async getAiConfig() {
		await this._assertMiniAdmin();
		let service = new WorkAiService();
		return await service.getAdminConfig();
	}

	async saveAiConfig() {
		let input = this.validateData({
			config: 'must|object|name=AI配置',
			clearKey: 'bool|name=清空Key',
			clearVisionKey: 'bool|name=清空视觉Key',
		});
		await this._assertMiniAdmin();
		let service = new WorkAiService();
		return await service.saveAdminConfig(input.config, {
			clearKey: !!input.clearKey,
			clearVisionKey: !!input.clearVisionKey,
		});
	}

	async getAiModels() {
		let input = this.validateData({
			target: 'string|max:20|name=模型用途',
			apiUrl: 'string|max:400|name=接口地址',
			apiKey: 'string|max:400|name=API Key',
		});
		await this._assertMiniAdmin();
		let service = new WorkAiService();
		return await service.listModels(input);
	}

	async getPerformanceBoard() {
		let input = this.validateData({
			month: 'string|name=月份',
		});
		await this._assertMiniAdmin();
		let service = new WorkPerformanceService();
		return await service.getAdminBoard(this._userId, input.month || '');
	}

	async getPaymentList() {
		let input = this.validateData({
			month: 'string|name=月份',
			staffId: 'string|name=员工',
			teamId: 'string|name=团队',
			type: 'string|name=收款类型',
			direction: 'string|name=方向',
			orderId: 'string|name=订单',
			status: 'int|name=状态',
			keyword: 'string|max:64|name=关键词',
			page: 'int|name=页码',
			size: 'int|name=分页大小',
			oldTotal: 'int|name=旧总数',
		});
		let staff = await this._assertMiniAdmin();
		let service = new WorkPaymentService();
		return await service.listPayments(input, staff);
	}

	async searchOrder() {
		let input = this.validateData({
			keyword: 'must|string|min:1|max:64|name=关键词',
			page: 'int|name=页码',
			size: 'int|name=分页大小',
			oldTotal: 'int|name=旧总数',
		});
		let staff = await this._assertMiniAdmin();
		let service = new WorkPaymentService();
		return await service.searchOrders(input, staff);
	}

	async savePayment() {
		let input = this.validateData({
			orderId: 'string|name=订单ID',
			payment: 'must|object|name=收款',
		});
		let staff = await this._assertMiniAdmin();
		let payment = Object.assign({}, input.payment || {});
		let orderId = input.orderId || payment.orderId || payment.ORDER_ID || payment.PAYMENT_ORDER_ID || payment.PAYMENT_ORDER_NO || '';
		if (!orderId) this.AppError('缺少订单ID');
		let service = new WorkService();
		return await service.saveAdminOrderPayment(orderId, payment, staff);
	}

	async voidPayment() {
		let input = this.validateData({
			paymentId: 'must|id|name=收款ID',
			reason: 'must|string|min:1|max:200|name=作废原因',
		});
		let staff = await this._assertMiniAdmin();
		let service = new WorkService();
		return await service.voidAdminOrderPayment(input.paymentId, input.reason, staff);
	}

	async getCommissionList() {
		let input = this.validateData({
			month: 'string|name=月份',
			staffId: 'string|name=员工',
			kind: 'string|name=提成类型',
			status: 'int|name=状态',
			orderId: 'string|name=订单',
			paymentId: 'string|name=收款',
			keyword: 'string|max:64|name=关键词',
			page: 'int|name=页码',
			size: 'int|name=分页大小',
			oldTotal: 'int|name=旧总数',
		});
		let staff = await this._assertMiniAdmin();
		let service = new WorkCommissionService();
		return await service.listCommissions(input, staff);
	}

	async getFrozenList() {
		let input = this.validateData({
			month: 'string|name=冻结来源月',
			staffId: 'string|name=员工',
			orderId: 'string|name=订单',
			keyword: 'string|max:64|name=关键词',
			page: 'int|name=页码',
			size: 'int|name=分页大小',
			oldTotal: 'int|name=旧总数',
		});
		let staff = await this._assertMiniAdmin();
		let service = new WorkCommissionService();
		return await service.getFrozenList(input, staff);
	}

	async getStaffList() {
		await this._assertMiniAdmin();
		let service = new WorkAdminStaffService();
		return await service.getStaffList();
	}

	async saveStaff() {
		let input = this.validateData({
			staff: 'must|object|name=员工',
		});
		await this._assertMiniAdmin();
		let service = new WorkAdminStaffService();
		return await service.saveStaff(input.staff);
	}

	async getStaffOptions() {
		let input = this.validateData({
			status: 'int|name=状态',
		});
		await this._assertMiniAdmin();
		let where = { _pid: util.getProjectId() };
		if (input.status !== undefined && input.status !== null && String(input.status).trim() !== '') where.STAFF_STATUS = Number(input.status);
		let list = await WorkStaffModel.getAll(where, '_id,STAFF_ID,STAFF_NAME,STAFF_TEAM_ID,STAFF_TEAM_NAME,STAFF_IS_ADMIN,STAFF_STATUS', {
			STAFF_STATUS: 'desc',
			STAFF_NAME: 'asc',
		}, 1000);
		return (list || []).map(item => this._cleanStaffOption(item));
	}

	async previewPayroll() {
		let input = this.validateData({
			staffId: 'must|id|name=员工ID',
			month: 'must|yearmonth|name=月份',
		});
		await this._assertMiniAdmin();
		let service = new WorkPayrollService();
		return await service.previewStaffMonth(input.staffId, input.month);
	}

	async payPayroll() {
		let input = this.validateData({
			staffId: 'must|id|name=员工ID',
			month: 'must|yearmonth|name=月份',
			note: 'string|max:200|name=备注',
			expectedCommissionIds: 'array|name=预览提成ID',
			expectedTotalCent: 'int|name=预览金额',
			previewHash: 'must|string|name=预览校验',
		});
		let staff = await this._assertMiniAdmin();
		let service = new WorkPayrollService();
		let preview = await service.previewStaffMonth(input.staffId, input.month);
		let expectedIds = (input.expectedCommissionIds || []).map(item => String(item)).sort();
		let actualIds = (preview.commissionIds || []).map(item => String(item)).sort();
		if (JSON.stringify(expectedIds) != JSON.stringify(actualIds)) this.AppError('工资明细已变化，请刷新后再发放');
		if (input.expectedTotalCent !== undefined && input.expectedTotalCent !== null && Number(input.expectedTotalCent) != Number(preview.totalCent || 0)) this.AppError('工资金额已变化，请刷新后再发放');
		return await service.payStaffMonth(input.staffId, input.month, input.previewHash || '', {
			_id: staff._id,
			STAFF_ID: staff.STAFF_ID || staff._id,
			STAFF_NAME: staff.STAFF_NAME || '',
			source: 'mini_admin',
		}, { note: input.note || '' });
	}

	async getAuditList() {
		await this._assertMiniAdmin();
		let service = new AdminWorkService();
		return await service.getAuditList();
	}

	async getFeedbackList() {
		await this._assertMiniAdmin();
		let service = new WorkService();
		return await service.getAdminFeedbackList(this._userId);
	}

	async getAgentAuditList() {
		let input = this.validateData({
			action: 'string|max:40|name=AI动作',
			riskLevel: 'string|max:40|name=风险等级',
			staffId: 'string|max:80|name=员工ID',
			staffName: 'string|max:80|name=员工姓名',
			keyword: 'string|max:80|name=关键词',
			page: 'int|name=页码',
			size: 'int|name=分页大小',
			oldTotal: 'int|name=旧总数',
		});
		await this._assertMiniAdmin();
		let service = new WorkAgentAuditService();
		return await service.listAudits(input);
	}

	async getAgentAuditDetail() {
		let input = this.validateData({
			id: 'must|id|name=AI审计记录ID',
		});
		await this._assertMiniAdmin();
		let service = new WorkAgentAuditService();
		return await service.getAuditDetail(input.id);
	}

	async auditOrder() {
		let input = this.validateData({
			id: 'must|id|name=订单ID',
			pass: 'must|bool|name=审核结果',
			reason: 'string|max:200|name=审核说明',
			participants: 'array|name=提成明细',
			orderEditTime: 'int|name=订单更新时间',
		});
		let staff = await this._assertMiniAdmin();
		let service = new AdminWorkService();
		return await service.auditOrder(this._buildAdminLike(staff), input.id, input.pass, input.reason || '', input.participants || null, input.orderEditTime || 0);
	}

	async cancelOrder() {
		let input = this.validateData({
			id: 'must|id|name=订单ID',
			reason: 'must|string|min:1|max:200|name=取消原因',
		});
		let staff = await this._assertMiniAdmin();
		let service = new WorkPaymentService();
		return await service.cancelOrderWithFinanceCheck(input.id, input.reason, staff);
	}
}

module.exports = WorkAdminController;
