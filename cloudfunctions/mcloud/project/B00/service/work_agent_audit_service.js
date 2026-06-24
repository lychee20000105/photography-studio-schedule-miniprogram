/**
 * Notes: 云屿小猫 Agent 审计服务
 */

const BaseProjectService = require('./base_project_service.js');
const WorkAgentAuditModel = require('../model/work_agent_audit_model.js');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const STATS_SAMPLE_SIZE = 500;

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

class WorkAgentAuditService extends BaseProjectService {

	async listAudits(params = {}) {
		let page = asPage(params.page);
		let size = asSize(params.size);
		let queryWhere = this._buildWhere(params);
		let ret = await WorkAgentAuditModel.getList(queryWhere, '*', {
			AGENTAUDIT_ADD_TIME: 'desc',
		}, page, size, params.isTotal !== false, Number(params.oldTotal || 0));

		ret.list = (ret.list || []).map(item => this._cleanAudit(item));
		ret.stats = await this._buildStats(queryWhere, ret.total || 0);
		return ret;
	}

	async getAuditDetail(id) {
		id = asText(id, 80);
		if (!id) this.AppError('缺少审计记录ID');

		let item = await WorkAgentAuditModel.getOne({
			_id: id,
			AGENTAUDIT_STATUS: 1,
		});
		if (!item) this.AppError('审计记录不存在或已失效');

		return this._cleanAuditDetail(item);
	}

	_buildWhere(params = {}) {
		let where = {
			AGENTAUDIT_STATUS: 1,
		};

		let action = asText(params.action, 40);
		let riskLevel = asText(params.riskLevel, 40);
		let staffId = asText(params.staffId, 80);
		let staffName = asText(params.staffName, 80);
		let keyword = asText(params.keyword, 80);

		if (action && action != 'all') where.AGENTAUDIT_ACTION = action;
		if (riskLevel && riskLevel != 'all') where.AGENTAUDIT_RISK_LEVEL = riskLevel;
		if (staffId) where.AGENTAUDIT_STAFF_ID = staffId;
		if (staffName) where.AGENTAUDIT_STAFF_NAME = ['like', staffName];

		if (!keyword) return where;
		return {
			and: where,
			or: [
				{ AGENTAUDIT_TITLE: ['like', keyword] },
				{ AGENTAUDIT_CONTENT: ['like', keyword] },
				{ AGENTAUDIT_STAFF_NAME: ['like', keyword] },
				{ AGENTAUDIT_ACTION: ['like', keyword] },
				{ AGENTAUDIT_REF_ID: ['like', keyword] },
			],
		};
	}

	async _buildStats(queryWhere, total) {
		let list = await WorkAgentAuditModel.getAll(queryWhere,
			'AGENTAUDIT_ACTION,AGENTAUDIT_RISK_LEVEL,AGENTAUDIT_STAFF_NAME,AGENTAUDIT_ADD_TIME',
			{ AGENTAUDIT_ADD_TIME: 'desc' },
			STATS_SAMPLE_SIZE);

		let stats = {
			total: Number(total || 0),
			sampleCount: (list || []).length,
			isSampled: (list || []).length >= STATS_SAMPLE_SIZE,
			highRiskCount: 0,
			financeRiskCount: 0,
			normalRiskCount: 0,
			latestTime: 0,
			topAction: null,
			topStaff: null,
			actionList: [],
			staffList: [],
		};

		let actionMap = {};
		let staffMap = {};
		for (let item of list || []) {
			let risk = item.AGENTAUDIT_RISK_LEVEL || 'normal';
			if (risk == 'high') stats.highRiskCount++;
			else if (risk == 'finance') stats.financeRiskCount++;
			else stats.normalRiskCount++;

			let action = item.AGENTAUDIT_ACTION || 'unknown';
			actionMap[action] = (actionMap[action] || 0) + 1;

			let staffName = item.AGENTAUDIT_STAFF_NAME || '未知员工';
			staffMap[staffName] = (staffMap[staffName] || 0) + 1;

			let addTime = Number(item.AGENTAUDIT_ADD_TIME || 0);
			if (addTime > stats.latestTime) stats.latestTime = addTime;
		}

		stats.actionList = this._topCountList(actionMap, 'action');
		stats.staffList = this._topCountList(staffMap, 'staffName');
		stats.topAction = stats.actionList[0] || null;
		stats.topStaff = stats.staffList[0] || null;
		return stats;
	}

	_topCountList(map, keyName) {
		return Object.keys(map || {}).map(key => ({
			[keyName]: key,
			count: map[key],
		})).sort((a, b) => b.count - a.count).slice(0, 5);
	}

	_cleanAudit(item = {}) {
		return {
			_id: item._id || '',
			AGENTAUDIT_ACTION: item.AGENTAUDIT_ACTION || '',
			AGENTAUDIT_TITLE: item.AGENTAUDIT_TITLE || '',
			AGENTAUDIT_CONTENT: asText(item.AGENTAUDIT_CONTENT, 500),
			AGENTAUDIT_STAFF_ID: item.AGENTAUDIT_STAFF_ID || '',
			AGENTAUDIT_STAFF_NAME: item.AGENTAUDIT_STAFF_NAME || '',
			AGENTAUDIT_REF_TYPE: item.AGENTAUDIT_REF_TYPE || '',
			AGENTAUDIT_REF_ID: item.AGENTAUDIT_REF_ID || '',
			AGENTAUDIT_RISK_LEVEL: item.AGENTAUDIT_RISK_LEVEL || 'normal',
			AGENTAUDIT_ADD_TIME: item.AGENTAUDIT_ADD_TIME || 0,
		};
	}

	_cleanAuditDetail(item = {}) {
		let detail = this._cleanAudit(item);
		detail.AGENTAUDIT_CONTENT = asText(item.AGENTAUDIT_CONTENT, 3000);
		detail.AGENTAUDIT_EDIT_TIME = item.AGENTAUDIT_EDIT_TIME || 0;
		detail.safety = this._buildSafetySummary(detail);
		return detail;
	}

	_buildSafetySummary(item = {}) {
		let risk = item.AGENTAUDIT_RISK_LEVEL || 'normal';
		let action = item.AGENTAUDIT_ACTION || 'agent_action';
		let summary = {
			riskLevel: risk,
			action,
			requiresAdminReview: risk == 'high' || risk == 'finance',
			lines: [],
		};

		if (risk == 'high') summary.lines.push('该记录命中高风险边界，适合由管理员复查业务结果。');
		else if (risk == 'finance') summary.lines.push('该记录涉及收款、金额、工资或提成等财务语义，建议结合业务记录核对。');
		else summary.lines.push('该记录为普通风险级别，仍保留操作人、时间和关联对象用于追溯。');

		if (item.AGENTAUDIT_REF_TYPE || item.AGENTAUDIT_REF_ID) {
			summary.lines.push('已记录关联业务对象，便于从审计流水追到小记、订单或其他业务记录。');
		} else {
			summary.lines.push('本条没有关联业务对象ID，复盘时主要参考标题和审计内容。');
		}

		if (/pay_payroll|void_payment|cancel_order|audit_order/.test(action)) {
			summary.lines.push('该动作属于工资、收款、取消或审核类敏感动作，不能仅凭 AI 回复判定业务已完成。');
		}

		return summary;
	}
}

module.exports = WorkAgentAuditService;
