/**
 * Notes: 云屿摄影休息/请假
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkRestModel extends BaseProjectModel {}

WorkRestModel.CL = 'bx_work_rest';

WorkRestModel.DB_STRUCTURE = {
	_pid: 'string|true',
	REST_ID: 'string|true',
	REST_STAFF_ID: 'string|true',
	REST_STAFF_NAME: 'string|true',
	REST_DATE: 'string|true',
	REST_TYPE: 'string|true|default=休息',
	REST_REASON: 'string|false',
	REST_STATUS: 'int|true|default=0|comment=0待审核 1生效 20驳回 10取消',
	REST_AUDIT_REASON: 'string|false',
	REST_AUDIT_ADMIN_ID: 'string|false',
	REST_AUDIT_ADMIN_NAME: 'string|false',
	REST_AUDIT_TIME: 'int|true|default=0',
	REST_ADD_TIME: 'int|true',
	REST_EDIT_TIME: 'int|true',
	REST_ADD_IP: 'string|false',
	REST_EDIT_IP: 'string|false',
};

WorkRestModel.FIELD_PREFIX = 'REST_';

module.exports = WorkRestModel;
