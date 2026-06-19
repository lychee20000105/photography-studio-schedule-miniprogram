/**
 * Notes: 云屿摄影内部消息
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkMessageModel extends BaseProjectModel {}

WorkMessageModel.CL = 'bx_work_message';

WorkMessageModel.DB_STRUCTURE = {
	_pid: 'string|true',
	MSG_ID: 'string|true',
	MSG_STAFF_ID: 'string|true',
	MSG_TITLE: 'string|true',
	MSG_CONTENT: 'string|false',
	MSG_REF_TYPE: 'string|false',
	MSG_REF_ID: 'string|false',
	MSG_IS_READ: 'int|true|default=0',
	MSG_ADD_TIME: 'int|true',
	MSG_EDIT_TIME: 'int|true',
	MSG_ADD_IP: 'string|false',
	MSG_EDIT_IP: 'string|false',
};

WorkMessageModel.FIELD_PREFIX = 'MSG_';

module.exports = WorkMessageModel;
