/**
 * Notes: 云屿摄影业绩控制器
 */

const BaseProjectController = require('./base_project_controller.js');
const WorkPerformanceService = require('../service/work_performance_service.js');

class WorkPerformanceController extends BaseProjectController {

	async getHome() {
		let input = this.validateData({
			month: 'string|name=月份',
		});
		let service = new WorkPerformanceService();
		return await service.getSummary(this._userId, input.month || '');
	}

	async getSummary() {
		let input = this.validateData({
			month: 'string|name=月份',
		});
		let service = new WorkPerformanceService();
		return await service.getSummary(this._userId, input.month || '');
	}

	async getRank() {
		let input = this.validateData({
			month: 'string|name=月份',
			scope: 'string|in:staff,team|name=范围',
		});
		let service = new WorkPerformanceService();
		return await service.getRank(this._userId, input.month || '', input.scope || 'staff');
	}

	async getMyPaymentList() {
		let input = this.validateData({
			month: 'string|name=月份',
			page: 'int|name=页码',
			size: 'int|name=分页大小',
			oldTotal: 'int|name=旧总数',
		});
		let service = new WorkPerformanceService();
		return await service.getMyPaymentList(this._userId, input);
	}

	async getMyCommissionList() {
		let input = this.validateData({
			month: 'string|name=月份',
			kind: 'string|in:advance,frozen,release,deduct,all|name=提成类型',
			page: 'int|name=页码',
			size: 'int|name=分页大小',
			oldTotal: 'int|name=旧总数',
		});
		let service = new WorkPerformanceService();
		return await service.getMyCommissionList(this._userId, input);
	}
}

module.exports = WorkPerformanceController;
