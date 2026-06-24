/**
 * Notes: 云屿小猫 Agent 高风险动作确认队列服务
 */

const BaseProjectService = require('./base_project_service.js');
const dbUtil = require('../../../framework/database/db_util.js');
const WorkAgentConfirmModel = require('../model/work_agent_confirm_model.js');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const ACTION_LABELS = {
	cancel_order: '取消订单',
	save_payment: '录入收款',
	void_payment: '作废收款',
	pay_payroll: '发放工资',
	audit_order: '审核订单',
};

function asText(val, max = 300) {
	if (val === undefined || val === null) return '';
	let str = String(val).replace(/[\r\n\t]+/g, ' ').trim();
	if (str.length > max) str = str.slice(0, max);
	return str;
}

function asPage(val) {
	val = Number(val || 1);
	if (!Number.isFinite(val) || val < 1) return 1;
	return Math.floor(val);
}

function asSize(val) {
	val = Number(val || DEFAULT_PAGE_SIZE);
	if (!Number.isFinite(val) || val < 1) return DEFAULT_PAGE_SIZE;
	val = Math.floor(val);
	return Math.min(val, MAX_PAGE_SIZE);
}

class WorkAgentConfirmService extends BaseProjectService {

	async createPending(openId, staff = {}, action, payload = {}, pageContext = {}) {
		await this._ensureCollection();
		action = asText(action, 40);
		if (!ACTION_LABELS[action]) this.AppError('该 AI 动作暂不支持确认队列');

		let meta = this._buildActionMeta(action, payload);
		let id = await WorkAgentConfirmModel.insert({
			AGENTCONFIRM_ACTION: action,
			AGENTCONFIRM_TITLE: meta.title,
			AGENTCONFIRM_CONTENT: meta.content,
			AGENTCONFIRM_PAYLOAD: this._plainObject(payload),
			AGENTCONFIRM_PAGE_CONTEXT: this._plainObject(pageContext),
			AGENTCONFIRM_REQUEST_OPENID: asText(openId, 120),
			AGENTCONFIRM_REQUEST_STAFF_ID: asText(staff._id || staff.STAFF_ID || '', 120),
			AGENTCONFIRM_REQUEST_STAFF_NAME: asText(staff.STAFF_NAME || '', 80),
			AGENTCONFIRM_STATUS: WorkAgentConfirmModel.STATUS.PENDING,
			AGENTCONFIRM_RISK_LEVEL: 'high',
			AGENTCONFIRM_REF_TYPE: meta.refType,
			AGENTCONFIRM_REF_ID: meta.refId,
			AGENTCONFIRM_RESULT: {},
			AGENTCONFIRM_REVIEW_STAFF_ID: '',
			AGENTCONFIRM_REVIEW_STAFF_NAME: '',
			AGENTCONFIRM_REVIEW_TIME: 0,
			AGENTCONFIRM_REVIEW_NOTE: '',
		});

		return {
			id,
			action,
			title: meta.title,
			content: meta.content,
			refType: meta.refType,
			refId: meta.refId,
		};
	}

	async listConfirms(params = {}) {
		await this._ensureCollection();
		let page = asPage(params.page);
		let size = asSize(params.size);
		let where = this._buildWhere(params);
		let ret = await WorkAgentConfirmModel.getList(where, '*', {
			AGENTCONFIRM_ADD_TIME: 'desc',
		}, page, size, params.isTotal !== false, Number(params.oldTotal || 0));

		ret.list = (ret.list || []).map(item => this._cleanConfirm(item));
		ret.stats = await this._buildStats(where, ret.total || 0);
		return ret;
	}

	async getConfirm(id) {
		await this._ensureCollection();
		id = asText(id, 80);
		if (!id) this.AppError('缺少确认记录ID');
		let item = await WorkAgentConfirmModel.getOne(id);
		if (!item) this.AppError('确认记录不存在');
		return item;
	}

	async startApprove(id, note, staff = {}) {
		let item = await this.getConfirm(id);
		if (Number(item.AGENTCONFIRM_STATUS) != WorkAgentConfirmModel.STATUS.PENDING) this.AppError('该确认记录已处理，不能重复确认');

		let updated = await WorkAgentConfirmModel.edit({
			_id: id,
			AGENTCONFIRM_STATUS: WorkAgentConfirmModel.STATUS.PENDING,
		}, {
			AGENTCONFIRM_STATUS: WorkAgentConfirmModel.STATUS.EXECUTING,
			AGENTCONFIRM_REVIEW_STAFF_ID: asText(staff._id || staff.STAFF_ID || '', 120),
			AGENTCONFIRM_REVIEW_STAFF_NAME: asText(staff.STAFF_NAME || '', 80),
			AGENTCONFIRM_REVIEW_TIME: Math.floor(Date.now() / 1000),
			AGENTCONFIRM_REVIEW_NOTE: asText(note, 200),
		});
		if (!updated) this.AppError('该确认记录已被其他管理员处理，请刷新后查看');
		return await this.getConfirm(id);
	}

	async finishApprove(id, result = {}) {
		await WorkAgentConfirmModel.edit(id, {
			AGENTCONFIRM_STATUS: WorkAgentConfirmModel.STATUS.DONE,
			AGENTCONFIRM_RESULT: this._cleanResult(result),
		});
		return await this.getConfirm(id);
	}

	async failApprove(id, err) {
		await WorkAgentConfirmModel.edit(id, {
			AGENTCONFIRM_STATUS: WorkAgentConfirmModel.STATUS.FAILED,
			AGENTCONFIRM_RESULT: {
				error: asText(err && err.message ? err.message : err, 300),
			},
		});
	}

	async rejectConfirm(id, note, staff = {}) {
		let item = await this.getConfirm(id);
		if (Number(item.AGENTCONFIRM_STATUS) != WorkAgentConfirmModel.STATUS.PENDING) this.AppError('该确认记录已处理，不能重复驳回');
		await WorkAgentConfirmModel.edit({
			_id: id,
			AGENTCONFIRM_STATUS: WorkAgentConfirmModel.STATUS.PENDING,
		}, {
			AGENTCONFIRM_STATUS: WorkAgentConfirmModel.STATUS.REJECT,
			AGENTCONFIRM_REVIEW_STAFF_ID: asText(staff._id || staff.STAFF_ID || '', 120),
			AGENTCONFIRM_REVIEW_STAFF_NAME: asText(staff.STAFF_NAME || '', 80),
			AGENTCONFIRM_REVIEW_TIME: Math.floor(Date.now() / 1000),
			AGENTCONFIRM_REVIEW_NOTE: asText(note || '管理员驳回', 200),
		});
		return await this.getConfirm(id);
	}

	_buildWhere(params = {}) {
		let where = {};
		let status = asText(params.status, 20);
		let action = asText(params.action, 40);
		let keyword = asText(params.keyword, 80);
		if (status !== '' && status != 'all') where.AGENTCONFIRM_STATUS = Number(status);
		if (action && action != 'all') where.AGENTCONFIRM_ACTION = action;
		if (!keyword) return where;
		return {
			and: where,
			or: [
				{ AGENTCONFIRM_TITLE: ['like', keyword] },
				{ AGENTCONFIRM_CONTENT: ['like', keyword] },
				{ AGENTCONFIRM_REQUEST_STAFF_NAME: ['like', keyword] },
				{ AGENTCONFIRM_REVIEW_STAFF_NAME: ['like', keyword] },
				{ AGENTCONFIRM_REF_ID: ['like', keyword] },
			],
		};
	}

	async _ensureCollection() {
		try {
			if (!await dbUtil.isExistCollection(WorkAgentConfirmModel.CL)) {
				await dbUtil.createCollection(WorkAgentConfirmModel.CL);
			}
		} catch (err) {
			let msg = err && err.message ? err.message : String(err || '');
			if (msg.indexOf('exist') < 0 && msg.indexOf('已存在') < 0) throw err;
		}
	}

	async _buildStats(where, total) {
		let list = await WorkAgentConfirmModel.getAll(where,
			'AGENTCONFIRM_ACTION,AGENTCONFIRM_STATUS',
			{ AGENTCONFIRM_ADD_TIME: 'desc' },
			300);
		let stats = {
			total: Number(total || 0),
			pendingCount: 0,
			doneCount: 0,
			rejectCount: 0,
			failedCount: 0,
		};
		for (let item of list || []) {
			let status = Number(item.AGENTCONFIRM_STATUS);
			if (status == WorkAgentConfirmModel.STATUS.PENDING) stats.pendingCount++;
			else if (status == WorkAgentConfirmModel.STATUS.DONE) stats.doneCount++;
			else if (status == WorkAgentConfirmModel.STATUS.REJECT) stats.rejectCount++;
			else if (status == WorkAgentConfirmModel.STATUS.FAILED) stats.failedCount++;
		}
		return stats;
	}

	_buildActionMeta(action, payload = {}) {
		let label = ACTION_LABELS[action] || action;
		let refType = 'agent_action';
		let refId = '';
		if (action == 'cancel_order' || action == 'audit_order') {
			refType = 'work_order';
			refId = asText(payload.orderId || payload.id || payload.ORDER_ID || '', 120);
		} else if (action == 'save_payment') {
			refType = 'work_order';
			refId = asText(payload.orderId || payload.ORDER_ID || payload.PAYMENT_ORDER_ID || '', 120);
		} else if (action == 'void_payment') {
			refType = 'work_payment';
			refId = asText(payload.paymentId || payload.id || payload.PAYMENT_ID || '', 120);
		} else if (action == 'pay_payroll') {
			refType = 'work_payroll';
			refId = asText((payload.staffId || payload.staffName || payload.name || '') + ' ' + (payload.month || ''), 120);
		}
		let content = this._buildContent(action, payload);
		return {
			title: 'AI待确认：' + label,
			content,
			refType,
			refId,
		};
	}

	_buildContent(action, payload = {}) {
		let safe = this._maskObject(payload);
		let text = JSON.stringify(safe);
		if (text.length > 500) text = text.slice(0, 500) + '...';
		return '小猫识别到高风险动作，等待管理员确认后执行。动作=' + action + '，参数=' + text;
	}

	_cleanConfirm(item = {}) {
		return {
			_id: item._id || '',
			AGENTCONFIRM_ACTION: item.AGENTCONFIRM_ACTION || '',
			AGENTCONFIRM_TITLE: item.AGENTCONFIRM_TITLE || '',
			AGENTCONFIRM_CONTENT: asText(item.AGENTCONFIRM_CONTENT, 700),
			AGENTCONFIRM_PAYLOAD: this._maskObject(item.AGENTCONFIRM_PAYLOAD || {}),
			AGENTCONFIRM_REQUEST_STAFF_ID: item.AGENTCONFIRM_REQUEST_STAFF_ID || '',
			AGENTCONFIRM_REQUEST_STAFF_NAME: item.AGENTCONFIRM_REQUEST_STAFF_NAME || '',
			AGENTCONFIRM_STATUS: Number(item.AGENTCONFIRM_STATUS || 0),
			AGENTCONFIRM_RISK_LEVEL: item.AGENTCONFIRM_RISK_LEVEL || 'high',
			AGENTCONFIRM_REF_TYPE: item.AGENTCONFIRM_REF_TYPE || '',
			AGENTCONFIRM_REF_ID: item.AGENTCONFIRM_REF_ID || '',
			AGENTCONFIRM_RESULT: this._cleanResult(item.AGENTCONFIRM_RESULT || {}),
			AGENTCONFIRM_REVIEW_STAFF_ID: item.AGENTCONFIRM_REVIEW_STAFF_ID || '',
			AGENTCONFIRM_REVIEW_STAFF_NAME: item.AGENTCONFIRM_REVIEW_STAFF_NAME || '',
			AGENTCONFIRM_REVIEW_TIME: item.AGENTCONFIRM_REVIEW_TIME || 0,
			AGENTCONFIRM_REVIEW_NOTE: asText(item.AGENTCONFIRM_REVIEW_NOTE, 200),
			AGENTCONFIRM_ADD_TIME: item.AGENTCONFIRM_ADD_TIME || 0,
			AGENTCONFIRM_EDIT_TIME: item.AGENTCONFIRM_EDIT_TIME || 0,
		};
	}

	_cleanResult(result = {}) {
		if (!result || typeof result != 'object') return {};
		return {
			action: asText(result.action, 40),
			id: asText(result.id, 120),
			reply: asText(result.reply, 500),
			auditNoteId: asText(result.auditNoteId, 120),
			error: asText(result.error, 300),
		};
	}

	_plainObject(obj = {}) {
		if (!obj || typeof obj != 'object' || Array.isArray(obj)) return {};
		return Object.assign({}, obj);
	}

	_maskObject(obj, depth = 0) {
		if (!obj || typeof obj != 'object') return this._maskText(obj);
		if (depth > 2) return '[object]';
		if (Array.isArray(obj)) return obj.slice(0, 20).map(item => this._maskObject(item, depth + 1));
		let out = {};
		for (let key of Object.keys(obj).slice(0, 40)) {
			let val = obj[key];
			if (/key|token|secret|password/i.test(key)) out[key] = '[secret]';
			else out[key] = this._maskObject(val, depth + 1);
		}
		return out;
	}

	_maskText(val) {
		if (val === undefined || val === null) return val;
		if (typeof val == 'number' || typeof val == 'boolean') return val;
		let text = asText(val, 200);
		text = text.replace(/1[3-9]\d{9}/g, match => match.slice(0, 3) + '****' + match.slice(-4));
		text = text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]');
		return text;
	}
}

module.exports = WorkAgentConfirmService;
