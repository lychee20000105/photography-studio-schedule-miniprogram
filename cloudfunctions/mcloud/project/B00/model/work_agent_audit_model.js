/**
 * Notes: 云屿小猫 Agent 独立审计流水
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkAgentAuditModel extends BaseProjectModel {}

WorkAgentAuditModel.CL = 'bx_work_agent_audit';

WorkAgentAuditModel.DB_STRUCTURE = {
	_pid: 'string|true',
	AGENTAUDIT_ID: 'string|true',
	AGENTAUDIT_ACTION: 'string|true',
	AGENTAUDIT_TITLE: 'string|true',
	AGENTAUDIT_CONTENT: 'string|false',
	AGENTAUDIT_OPENID: 'string|false',
	AGENTAUDIT_STAFF_ID: 'string|false',
	AGENTAUDIT_STAFF_NAME: 'string|false',
	AGENTAUDIT_REF_TYPE: 'string|false',
	AGENTAUDIT_REF_ID: 'string|false',
	AGENTAUDIT_RISK_LEVEL: 'string|true|default=normal',
	AGENTAUDIT_ACTION_SUMMARY: 'object|false|default={}',
	AGENTAUDIT_STATUS: 'int|true|default=1',
	AGENTAUDIT_ADD_TIME: 'int|true',
	AGENTAUDIT_EDIT_TIME: 'int|true',
	AGENTAUDIT_ADD_IP: 'string|false',
	AGENTAUDIT_EDIT_IP: 'string|false',
};

WorkAgentAuditModel.FIELD_PREFIX = 'AGENTAUDIT_';

module.exports = WorkAgentAuditModel;
