/**
 * Notes: 云屿摄影订单类型
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkTypeModel extends BaseProjectModel {}

WorkTypeModel.CL = 'bx_work_type';

WorkTypeModel.DB_STRUCTURE = {
	_pid: 'string|true',
	TYPE_ID: 'string|true',

	TYPE_NAME: 'string|true|comment=类型名称',
	TYPE_COLOR: 'string|true|default=#e60012|comment=标签颜色',
	TYPE_ORDER: 'int|true|default=999',
	TYPE_IS_OTHER: 'int|true|default=0',
	TYPE_STATUS: 'int|true|default=1|comment=1启用 0停用',

	TYPE_ADD_TIME: 'int|true',
	TYPE_EDIT_TIME: 'int|true',
	TYPE_ADD_IP: 'string|false',
	TYPE_EDIT_IP: 'string|false',
};

WorkTypeModel.FIELD_PREFIX = 'TYPE_';

module.exports = WorkTypeModel;
