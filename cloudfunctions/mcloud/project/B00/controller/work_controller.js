/**
 * Notes: 云屿摄影内部工作台前台控制器
 */

const BaseProjectController = require('./base_project_controller.js');
const WorkService = require('../service/work_service.js');
const WorkAiService = require('../service/work_ai_service.js');

class WorkController extends BaseProjectController {

	async getMe() {
		let service = new WorkService();
		return await service.getMe(this._userId);
	}

	async bindStaff() {
		let input = this.validateData({
			mobile: 'must|mobile|name=手机号',
			code: 'must|string|min:1|max:30|name=绑定码',
		});
		let service = new WorkService();
		return await service.bindStaff(this._userId, input.mobile, input.code);
	}

	async getOptions() {
		let service = new WorkService();
		return await service.getOptions(this._userId);
	}

	async getCalendar() {
		let input = this.validateData({
			month: 'string|name=月份',
			scope: 'string|name=范围',
			staffId: 'string|name=员工',
		});
		let service = new WorkService();
		return await service.getCalendar(this._userId, input.month, input.scope || 'all', input.staffId || '');
	}

	async getDayList() {
		let input = this.validateData({
			day: 'must|date|name=日期',
			scope: 'string|name=范围',
		});
		let service = new WorkService();
		return await service.getDayList(this._userId, input.day, input.scope || 'all');
	}

	async getOrderList() {
		let input = this.validateData({
			month: 'string|name=月份',
			scope: 'string|name=范围',
		});
		let service = new WorkService();
		return await service.getOrderList(this._userId, input.month || '', input.scope || 'month');
	}

	async getOrderDetail() {
		let input = this.validateData({
			id: 'must|id|name=订单ID',
		});
		let service = new WorkService();
		return await service.getOrderDetail(this._userId, input.id);
	}

	async saveOrder() {
		let input = this.validateData({
			order: 'must|object|name=订单',
		});
		let service = new WorkService();
		return await service.saveOrder(this._userId, input.order);
	}

	async joinOrder() {
		let input = this.validateData({
			id: 'must|id|name=订单ID',
			roleName: 'string|max:40|name=参与岗位',
		});
		let service = new WorkService();
		return await service.joinOrder(this._userId, input.id, input.roleName || '');
	}

	async completeOrder() {
		let input = this.validateData({
			id: 'must|id|name=订单ID',
		});
		let service = new WorkService();
		return await service.completeOrder(this._userId, input.id);
	}

	async cancelOrder() {
		let input = this.validateData({
			id: 'must|id|name=订单ID',
			reason: 'string|max:200|name=取消原因',
		});
		let service = new WorkService();
		return await service.cancelOrder(this._userId, input.id, input.reason || '');
	}

	async restoreOrder() {
		let input = this.validateData({
			id: 'must|id|name=订单ID',
		});
		let service = new WorkService();
		return await service.restoreOrder(this._userId, input.id);
	}

	async getNoteList() {
		let input = this.validateData({
			type: 'string|name=类型',
		});
		let service = new WorkService();
		return await service.getNoteList(this._userId, input.type || 'all');
	}

	async getNoteDetail() {
		let input = this.validateData({
			id: 'must|id|name=小记ID',
		});
		let service = new WorkService();
		return await service.getNoteDetail(this._userId, input.id);
	}

	async saveNote() {
		let input = this.validateData({
			note: 'must|object|name=小记',
		});
		let service = new WorkService();
		return await service.saveNote(this._userId, input.note);
	}

	async saveItem() {
		let input = this.validateData({
			item: 'must|object|name=事项',
		});
		let service = new WorkService();
		return await service.saveItem(this._userId, input.item);
	}

	async cancelItem() {
		let input = this.validateData({
			id: 'must|id|name=事项ID',
		});
		let service = new WorkService();
		return await service.cancelItem(this._userId, input.id);
	}

	async saveRest() {
		let input = this.validateData({
			rest: 'must|object|name=休息日期',
		});
		let service = new WorkService();
		return await service.saveRest(this._userId, input.rest);
	}

	async getMessages() {
		let service = new WorkService();
		return await service.getMessages(this._userId);
	}

	async getMessageSummary() {
		let service = new WorkService();
		return await service.getMessageSummary(this._userId);
	}

	async readMessage() {
		let input = this.validateData({
			id: 'must|id|name=消息ID',
		});
		let service = new WorkService();
		return await service.readMessage(this._userId, input.id);
	}

	async readAllMessages() {
		let service = new WorkService();
		return await service.readAllMessages(this._userId);
	}

	async submitFeedback() {
		let input = this.validateData({
			content: 'must|string|min:1|max:800|name=反馈内容',
		});
		let service = new WorkService();
		return await service.submitFeedback(this._userId, input.content);
	}

	async aiChat() {
		let input = this.validateData({
			message: 'must|string|min:1|max:800|name=消息内容',
			history: 'array|name=历史消息',
			attachments: 'array|name=附件',
			pageContext: 'object|name=页面上下文',
		});
		let service = new WorkAiService();
		return await service.chat(this._userId, input.message, input.history || [], input.attachments || [], input.pageContext || {});
	}

	async getMyPayroll() {
		let input = this.validateData({
			month: 'string|name=月份',
		});
		let service = new WorkService();
		return await service.getMyPayroll(this._userId, input.month || '');
	}
}

module.exports = WorkController;
