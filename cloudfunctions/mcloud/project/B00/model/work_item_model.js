/**
 * Notes: 云屿摄影事项档期
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkItemModel extends BaseProjectModel {}

WorkItemModel.CL = 'bx_work_item';

WorkItemModel.DB_STRUCTURE = {
	_pid: 'string|true',
	ITEM_ID: 'string|true',
	ITEM_TITLE: 'string|true',
	ITEM_CONTENT: 'string|false',
	ITEM_DATE: 'string|true',
	ITEM_TIME: 'string|false',
	ITEM_END_TIME: 'string|false',
	ITEM_CREATOR_OPENID: 'string|true',
	ITEM_CREATOR_STAFF_ID: 'string|false',
	ITEM_CREATOR_NAME: 'string|false',
	ITEM_STATUS: 'int|true|default=0|comment=0待审核 1生效 20驳回 10取消',
	ITEM_AUDIT_REASON: 'string|false',
	ITEM_AUDIT_ADMIN_ID: 'string|false',
	ITEM_AUDIT_ADMIN_NAME: 'string|false',
	ITEM_AUDIT_TIME: 'int|true|default=0',
	ITEM_ADD_TIME: 'int|true',
	ITEM_EDIT_TIME: 'int|true',
	ITEM_ADD_IP: 'string|false',
	ITEM_EDIT_IP: 'string|false',
};

WorkItemModel.FIELD_PREFIX = 'ITEM_';

module.exports = WorkItemModel;
