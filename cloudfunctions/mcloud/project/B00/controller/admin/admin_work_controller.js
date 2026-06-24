/**
 * Notes: 云屿摄影内部工作台后台控制器
 */

const BaseProjectAdminController = require('./base_project_admin_controller.js');
const AdminWorkService = require('../../service/admin/admin_work_service.js');

class AdminWorkController extends BaseProjectAdminController {

	async getStaffList() {
		await this.isAdmin();
		let service = new AdminWorkService();
		return await service.getStaffList();
	}

	async saveStaff() {
		await this.isAdmin();
		let input = this.validateData({
			staff: 'must|object|name=员工',
		});
		let service = new AdminWorkService();
		return await service.saveStaff(input.staff);
	}

	async stopStaff() {
		await this.isAdmin();
		let input = this.validateData({
			id: 'must|id|name=员工ID',
			status: 'must|int|in:0,1|name=状态',
		});
		let service = new AdminWorkService();
		return await service.stopStaff(input.id, input.status);
	}

	async getTypeList() {
		await this.isAdmin();
		let service = new AdminWorkService();
		return await service.getTypeList();
	}

	async saveType() {
		await this.isAdmin();
		let input = this.validateData({
			type: 'must|object|name=类型',
		});
		let service = new AdminWorkService();
		return await service.saveType(input.type);
	}

	async getAuditList() {
		await this.isAdmin();
		let service = new AdminWorkService();
		return await service.getAuditList();
	}

	async auditOrder() {
		await this.isAdmin();
		let input = this.validateData({
			id: 'must|id|name=订单ID',
			pass: 'must|bool|name=审核结果',
			reason: 'string|max:200|name=审核说明',
			participants: 'array|name=提成明细',
		});
		let service = new AdminWorkService();
		return await service.auditOrder(this._admin, input.id, input.pass, input.reason || '', input.participants || null);
	}

	async auditItem() {
		await this.isAdmin();
		let input = this.validateData({
			id: 'must|id|name=事项ID',
			pass: 'must|bool|name=审核结果',
			reason: 'string|max:200|name=审核说明',
		});
		let service = new AdminWorkService();
		return await service.auditItem(this._admin, input.id, input.pass, input.reason || '');
	}

	async auditRest() {
		await this.isAdmin();
		let input = this.validateData({
			id: 'must|id|name=休息ID',
			pass: 'must|bool|name=审核结果',
			reason: 'string|max:200|name=审核说明',
		});
		let service = new AdminWorkService();
		return await service.auditRest(this._admin, input.id, input.pass, input.reason || '');
	}

	async getPayroll() {
		await this.isAdmin();
		let input = this.validateData({
			staffId: 'must|id|name=员工ID',
			month: 'string|name=月份',
		});
		let service = new AdminWorkService();
		return await service.getPayroll(input.staffId, input.month || '');
	}

	async payStaffMonth() {
		await this.isAdmin();
		let input = this.validateData({
			staffId: 'must|id|name=员工ID',
			month: 'must|yearmonth|name=月份',
			actualAmount: 'digit|min:0|max:9999999|name=实发金额',
			note: 'string|max:200|name=备注',
		});
		let service = new AdminWorkService();
		return await service.payStaffMonth(this._admin, input.staffId, input.month, input.actualAmount, input.note || '');
	}

	async getCanceledOrders() {
		await this.isAdmin();
		let service = new AdminWorkService();
		return await service.getCanceledOrders();
	}

	async delOrder() {
		await this.isAdmin();
		let input = this.validateData({
			id: 'must|id|name=订单ID',
		});
		let service = new AdminWorkService();
		return await service.delOrder(input.id);
	}

	async restoreOrder() {
		await this.isAdmin();
		let input = this.validateData({
			id: 'must|id|name=订单ID',
		});
		let service = new AdminWorkService();
		return await service.restoreOrder(input.id);
	}
}

module.exports = AdminWorkController;
