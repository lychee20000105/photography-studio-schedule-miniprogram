/**
 * Notes: 云屿摄影提成事件账本
 */

const BaseProjectModel = require('./base_project_model.js');
const financeConfig = require('../service/work_finance_config.js');

class WorkCommissionModel extends BaseProjectModel {}

WorkCommissionModel.CL = financeConfig.COLLECTION.COMMISSION;

WorkCommissionModel.DB_STRUCTURE = {
	_pid: 'string|true',
	COMMISSION_ID: 'string|true',

	COMMISSION_GROUP_ID: 'string|false|comment=同一payment和参与人的提成组',
	COMMISSION_PAYMENT_ID: 'string|false|comment=来源payment_id',
	COMMISSION_ORDER_ID: 'string|true|comment=订单_id',
	COMMISSION_ORDER_NO: 'string|false|comment=订单业务编号',
	COMMISSION_PARTICIPANT_ID: 'string|true|comment=参与人ID',
	COMMISSION_PARTICIPANT_SNAPSHOT: 'object|false|default={}|comment=参与人快照',

	COMMISSION_ORDER_TYPE_NAME: 'string|false|comment=订单类型快照',
	COMMISSION_ORDER_DATE: 'string|false|comment=拍摄日期快照',
	COMMISSION_CUSTOMER_NAME: 'string|false|comment=客户名快照',
	COMMISSION_CUSTOMER_SURNAME: 'string|false|comment=客户简称快照',
	COMMISSION_PAYMENT_TYPE: 'string|false|comment=来源收款类型',
	COMMISSION_PAYMENT_DATE: 'string|false|comment=来源收款日期',

	COMMISSION_STAFF_ID: 'string|true|comment=提成员工_id',
	COMMISSION_STAFF_OPENID: 'string|false|comment=员工openid快照',
	COMMISSION_STAFF_NAME: 'string|true|comment=提成员工姓名',
	COMMISSION_ROLE_NAME: 'string|false|comment=角色快照',
	COMMISSION_TEAM_ID: 'string|false|comment=团队ID快照',
	COMMISSION_TEAM_NAME: 'string|false|comment=团队名快照',

	COMMISSION_KIND: 'string|true|comment=CURRENT/FROZEN/RELEASE/DEDUCT/ADJUST等',
	COMMISSION_TYPE: 'string|false|comment=kind别名',
	COMMISSION_MODE: 'string|true|default=percent|comment=percent/fixed/manual/none',
	COMMISSION_RATE: 'float|true|default=0|comment=百分比',
	COMMISSION_RULE_SNAPSHOT: 'object|false|default={}|comment=当时规则快照',
	COMMISSION_BASE_AMOUNT_CENT: 'int|true|default=0|comment=提成基数分',
	COMMISSION_TOTAL_AMOUNT_CENT: 'int|true|default=0|comment=本笔总提成分',
	COMMISSION_AMOUNT_CENT: 'int|true|default=0|comment=本事件金额分',
	COMMISSION_AMOUNT: 'float|true|default=0|comment=展示兼容金额元',

	COMMISSION_FROZEN_SOURCE_ID: 'string|false|comment=释放或抵扣来源FROZEN',
	COMMISSION_FROZEN_TOTAL_CENT: 'int|true|default=0|comment=冻结总额',
	COMMISSION_FROZEN_REMAIN_CENT: 'int|true|default=0|comment=冻结剩余',
	COMMISSION_FROZEN_RELEASED_CENT: 'int|true|default=0|comment=已释放冻结',
	COMMISSION_FROZEN_DEDUCTED_CENT: 'int|true|default=0|comment=已抵扣冻结',

	COMMISSION_MONTH: 'string|true|comment=进入工资或归属月份',
	COMMISSION_RELEASE_MONTH: 'string|false|comment=释放月份',
	COMMISSION_STATUS: 'int|true|default=10|comment=提成状态',
	COMMISSION_PAYROLL_LOCK_KEY: 'string|false|comment=工资锁key',
	COMMISSION_PAYROLL_ID: 'string|false|comment=工资单业务ID',
	COMMISSION_RELEASE_PAYROLL_ID: 'string|false|comment=释放工资单',
	COMMISSION_IS_PAYROLL_LOCKED: 'int|true|default=0|comment=是否已被工资锁定',

	COMMISSION_BIZ_KEY: 'string|true|comment=幂等key',
	COMMISSION_SOURCE_TYPE: 'string|false|comment=来源类型',
	COMMISSION_SOURCE_ID: 'string|false|comment=来源ID',
	COMMISSION_REF_PAYMENT_ID: 'string|false|comment=退款/扣回来源payment',
	COMMISSION_REF_COMMISSION_ID: 'string|false|comment=关联commission',

	COMMISSION_NOTE: 'string|false|comment=备注',
	COMMISSION_REMARK: 'string|false|comment=备注别名',
	COMMISSION_OPERATOR_STAFF_ID: 'string|false|comment=操作员工',
	COMMISSION_OPERATOR_OPENID: 'string|false|comment=操作openid',
	COMMISSION_OPERATOR_NAME: 'string|false|comment=操作人姓名',

	COMMISSION_ADD_TIME: 'int|true',
	COMMISSION_EDIT_TIME: 'int|true',
	COMMISSION_ADD_IP: 'string|false',
	COMMISSION_EDIT_IP: 'string|false',
};

WorkCommissionModel.FIELD_PREFIX = 'COMMISSION_';

WorkCommissionModel.KIND = financeConfig.COMMISSION_KIND;
WorkCommissionModel.TYPE = financeConfig.COMMISSION_KIND;
WorkCommissionModel.MODE = financeConfig.COMMISSION_MODE;
WorkCommissionModel.STATUS = financeConfig.COMMISSION_STATUS;

WorkCommissionModel.PAYROLL_KINDS = [
	WorkCommissionModel.KIND.CURRENT,
	WorkCommissionModel.KIND.RELEASE,
	WorkCommissionModel.KIND.DEDUCT,
	WorkCommissionModel.KIND.ADJUST,
];

WorkCommissionModel.NON_PAYROLL_KINDS = [
	WorkCommissionModel.KIND.FROZEN,
	WorkCommissionModel.KIND.FROZEN_DEDUCT,
	WorkCommissionModel.KIND.VOID,
];

module.exports = WorkCommissionModel;
