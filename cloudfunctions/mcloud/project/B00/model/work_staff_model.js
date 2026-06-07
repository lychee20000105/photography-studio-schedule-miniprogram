/**
 * Notes: 云屿摄影内部员工
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkStaffModel extends BaseProjectModel {}

WorkStaffModel.CL = 'bx_work_staff';

WorkStaffModel.DB_STRUCTURE = {
	_pid: 'string|true',
	STAFF_ID: 'string|true',

	STAFF_NAME: 'string|true|comment=员工姓名',
	STAFF_MOBILE: 'string|true|comment=登录手机号',
	STAFF_BIND_CODE: 'string|true|comment=绑定码/工号',
	STAFF_OPENID: 'string|false|comment=当前绑定微信openid',
	STAFF_OPENID_BIND_STATUS: 'int|true|default=0|comment=0未绑定 1已绑定 2已解绑',
	STAFF_OPENID_BIND_TIME: 'int|true|default=0|comment=首次绑定时间',
	STAFF_OPENID_UNBIND_TIME: 'int|true|default=0|comment=解绑时间',
	STAFF_OPENID_RESET_TIME: 'int|true|default=0|comment=重置绑定时间',
	STAFF_OPENID_RESET_BY: 'string|false|comment=重置操作人',
	STAFF_TEAM_ID: 'string|false|comment=团队ID',
	STAFF_TEAM_NAME: 'string|false|comment=团队名',
	STAFF_PERMISSIONS: 'array|true|default=[]|comment=细分权限预留',
	STAFF_ROLES: 'array|true|default=[]|comment=可担任岗位',
	STAFF_RULES: 'array|true|default=[]|comment=个人岗位提成规则',
	STAFF_IS_ADMIN: 'int|true|default=0|comment=小程序内管理员',
	STAFF_STATUS: 'int|true|default=1|comment=1正常 0停用',

	STAFF_LOGIN_TIME: 'int|true|default=0',
	STAFF_ADD_TIME: 'int|true',
	STAFF_EDIT_TIME: 'int|true',
	STAFF_ADD_IP: 'string|false',
	STAFF_EDIT_IP: 'string|false',
};

WorkStaffModel.FIELD_PREFIX = 'STAFF_';

WorkStaffModel.STATUS = {
	COMM: 1,
	STOP: 0,
};

WorkStaffModel.STATUS_DESC = {
	COMM: '正常',
	STOP: '停用',
};

module.exports = WorkStaffModel;
