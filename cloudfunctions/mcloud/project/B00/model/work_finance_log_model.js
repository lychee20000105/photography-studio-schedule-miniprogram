/**
 * Notes: 云屿摄影财务操作日志
 */

const BaseProjectModel = require('./base_project_model.js');
const financeConfig = require('../service/work_finance_config.js');

class WorkFinanceLogModel extends BaseProjectModel {}

WorkFinanceLogModel.CL = financeConfig.COLLECTION.FINANCE_LOG;

WorkFinanceLogModel.DB_STRUCTURE = {
	_pid: 'string|true',
	FINLOG_ID: 'string|true',

	FINLOG_TYPE: 'string|true|comment=payment/commission/payroll/order/admin/migration',
	FINLOG_ENTITY_TYPE: 'string|false|comment=实体类型别名',
	FINLOG_REF_ID: 'string|false|comment=关联业务ID',
	FINLOG_ENTITY_ID: 'string|false|comment=实体ID别名',
	FINLOG_BIZ_KEY: 'string|false|comment=幂等或恢复key',
	FINLOG_ACTION: 'string|true|comment=动作',
	FINLOG_PHASE: 'string|false|comment=START/SUCCESS/FAIL',
	FINLOG_SOURCE: 'string|false|comment=来源',

	FINLOG_BEFORE: 'object|false|default={}|comment=变更前快照',
	FINLOG_AFTER: 'object|false|default={}|comment=变更后快照',
	FINLOG_DIFF: 'object|false|default={}|comment=差异摘要',

	FINLOG_OPERATOR_STAFF_ID: 'string|false|comment=操作员工',
	FINLOG_OPERATOR_OPENID: 'string|false|comment=操作openid',
	FINLOG_OPERATOR_NAME: 'string|false|comment=操作人姓名',
	FINLOG_OPERATOR: 'object|false|default={}|comment=操作人快照',

	FINLOG_NOTE: 'string|false|comment=备注',
	FINLOG_REMARK: 'string|false|comment=备注别名',
	FINLOG_ERROR: 'string|false|comment=失败错误',

	FINLOG_ADD_TIME: 'int|true',
	FINLOG_EDIT_TIME: 'int|true',
	FINLOG_ADD_IP: 'string|false',
	FINLOG_EDIT_IP: 'string|false',
};

WorkFinanceLogModel.FIELD_PREFIX = 'FINLOG_';

WorkFinanceLogModel.TYPE = financeConfig.FINANCE_LOG_TYPE;
WorkFinanceLogModel.PHASE = financeConfig.FINANCE_LOG_PHASE;
WorkFinanceLogModel.SOURCE = financeConfig.FINANCE_LOG_SOURCE;

module.exports = WorkFinanceLogModel;
