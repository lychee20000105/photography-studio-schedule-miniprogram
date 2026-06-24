/**
 * Notes: 云屿小猫 Agent 审计服务
 */

const BaseProjectService = require('./base_project_service.js');
const WorkAgentAuditModel = require('../model/work_agent_audit_model.js');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

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

		let orWhere = null;
		if (keyword) {
			orWhere = [
				{ AGENTAUDIT_TITLE: ['like', keyword] },
				{ AGENTAUDIT_CONTENT: ['like', keyword] },
				{ AGENTAUDIT_STAFF_NAME: ['like', keyword] },
				{ AGENTAUDIT_ACTION: ['like', keyword] },
				{ AGENTAUDIT_REF_ID: ['like', keyword] },
			];
		}

		let queryWhere = orWhere ? { and: where, or: orWhere } : where;
		let ret = await WorkAgentAuditModel.getList(queryWhere, '*', {
			AGENTAUDIT_ADD_TIME: 'desc',
		}, page, size, params.isTotal !== false, Number(params.oldTotal || 0));

		ret.list = (ret.list || []).map(item => this._cleanAudit(item));
		return ret;
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
}

module.exports = WorkAgentAuditService;
