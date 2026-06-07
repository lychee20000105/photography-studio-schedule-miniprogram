/**
 * Notes: 云屿摄影工资发放记录
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkPayrollModel extends BaseProjectModel {}

WorkPayrollModel.CL = 'bx_work_payroll';

WorkPayrollModel.DB_STRUCTURE = {
	_pid: 'string|true',
	PAYROLL_ID: 'string|true',
	PAYROLL_STAFF_ID: 'string|true',
	PAYROLL_STAFF_NAME: 'string|true',
	PAYROLL_MONTH: 'string|true',
	PAYROLL_ITEMS: 'array|true|default=[]',
	PAYROLL_ADJUSTMENTS: 'array|true|default=[]',
	PAYROLL_AMOUNT: 'float|true|default=0',
	PAYROLL_ACTUAL_AMOUNT: 'float|true|default=0',
	PAYROLL_CURRENT_COMMISSION_CENT: 'int|true|default=0|comment=CURRENT汇总',
	PAYROLL_RELEASED_COMMISSION_CENT: 'int|true|default=0|comment=RELEASE汇总',
	PAYROLL_DEDUCT_COMMISSION_CENT: 'int|true|default=0|comment=DEDUCT汇总，负数',
	PAYROLL_ADJUST_COMMISSION_CENT: 'int|true|default=0|comment=ADJUST汇总',
	PAYROLL_PERFORMANCE_CENT: 'int|true|default=0|comment=本月业绩',
	PAYROLL_FROZEN_REMAIN_CENT: 'int|true|default=0|comment=待释放余额',
	PAYROLL_TOTAL_CENT: 'int|true|default=0|comment=新版应发金额分',
	PAYROLL_ACTUAL_AMOUNT_CENT: 'int|true|default=0|comment=实际发放金额分',
	PAYROLL_COMMISSION_IDS: 'array|true|default=[]|comment=锁定的commission _id',
	PAYROLL_PAYMENT_IDS: 'array|true|default=[]|comment=关联payment _id',
	PAYROLL_COMMISSION_REFS: 'array|true|default=[]|comment=提成引用快照',
	PAYROLL_SUMMARY: 'object|false|default={}|comment=工资摘要',
	PAYROLL_LOCK_KEY: 'string|false|comment=payroll:staffId:month',
	PAYROLL_SOURCE: 'string|true|default=legacy|comment=legacy/new',
	PAYROLL_IS_LEGACY: 'int|true|default=1|comment=是否旧口径',
	PAYROLL_CUTOVER_MONTH: 'string|false|comment=切换月份',
	PAYROLL_PREVIEW_HASH: 'string|false|comment=工资预览hash',
	PAYROLL_EXPECTED_HASH: 'string|false|comment=工资预览校验hash',
	PAYROLL_FAIL_REASON: 'string|false|comment=失败原因',
	PAYROLL_OPERATOR_STAFF_ID: 'string|false|comment=操作员工',
	PAYROLL_OPERATOR_NAME: 'string|false|comment=操作人姓名',
	PAYROLL_STATUS: 'int|true|default=0',
	PAYROLL_NOTE: 'string|false',
	PAYROLL_ADMIN_ID: 'string|false',
	PAYROLL_ADMIN_NAME: 'string|false',
	PAYROLL_PAY_TIME: 'int|true|default=0',
	PAYROLL_ADD_TIME: 'int|true',
	PAYROLL_EDIT_TIME: 'int|true',
	PAYROLL_ADD_IP: 'string|false',
	PAYROLL_EDIT_IP: 'string|false',
};

WorkPayrollModel.FIELD_PREFIX = 'PAYROLL_';

WorkPayrollModel.STATUS = {
	PAYING: 10,
	PAID: 20,
	FAIL: 30,
};

WorkPayrollModel.SOURCE = {
	LEGACY: 'legacy',
	NEW: 'new',
};

module.exports = WorkPayrollModel;
