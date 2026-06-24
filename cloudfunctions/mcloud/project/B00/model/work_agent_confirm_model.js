/**
 * Notes: 云屿小猫 Agent 高风险动作确认队列
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkAgentConfirmModel extends BaseProjectModel {}

WorkAgentConfirmModel.CL = 'bx_work_agent_confirm';

WorkAgentConfirmModel.DB_STRUCTURE = {
	_pid: 'string|true',
	AGENTCONFIRM_ID: 'string|true',
	AGENTCONFIRM_ACTION: 'string|true',
	AGENTCONFIRM_TITLE: 'string|true',
	AGENTCONFIRM_CONTENT: 'string|false',
	AGENTCONFIRM_PAYLOAD: 'object|false|default={}',
	AGENTCONFIRM_PAGE_CONTEXT: 'object|false|default={}',
	AGENTCONFIRM_REQUEST_OPENID: 'string|false',
	AGENTCONFIRM_REQUEST_STAFF_ID: 'string|false',
	AGENTCONFIRM_REQUEST_STAFF_NAME: 'string|false',
	AGENTCONFIRM_STATUS: 'int|true|default=0',
	AGENTCONFIRM_RISK_LEVEL: 'string|true|default=high',
	AGENTCONFIRM_REF_TYPE: 'string|false',
	AGENTCONFIRM_REF_ID: 'string|false',
	AGENTCONFIRM_RESULT: 'object|false|default={}',
	AGENTCONFIRM_REVIEW_STAFF_ID: 'string|false',
	AGENTCONFIRM_REVIEW_STAFF_NAME: 'string|false',
	AGENTCONFIRM_REVIEW_TIME: 'int|true|default=0',
	AGENTCONFIRM_REVIEW_NOTE: 'string|false',
	AGENTCONFIRM_ADD_TIME: 'int|true',
	AGENTCONFIRM_EDIT_TIME: 'int|true',
	AGENTCONFIRM_ADD_IP: 'string|false',
	AGENTCONFIRM_EDIT_IP: 'string|false',
};

WorkAgentConfirmModel.FIELD_PREFIX = 'AGENTCONFIRM_';

WorkAgentConfirmModel.STATUS = {
	PENDING: 0,
	DONE: 1,
	REJECT: 2,
	FAILED: 3,
	EXECUTING: 4,
};

module.exports = WorkAgentConfirmModel;
