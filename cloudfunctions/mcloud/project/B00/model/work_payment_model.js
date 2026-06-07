/**
 * Notes: 云屿摄影收款事实账本
 */

const BaseProjectModel = require('./base_project_model.js');
const financeConfig = require('../service/work_finance_config.js');

class WorkPaymentModel extends BaseProjectModel {}

WorkPaymentModel.CL = financeConfig.COLLECTION.PAYMENT;

WorkPaymentModel.DB_STRUCTURE = {
	_pid: 'string|true',
	PAYMENT_ID: 'string|true',

	PAYMENT_ORDER_ID: 'string|true|comment=订单_id',
	PAYMENT_ORDER_NO: 'string|false|comment=订单业务编号',
	PAYMENT_ORDER_TYPE_NAME: 'string|false|comment=订单类型快照',
	PAYMENT_ORDER_DATE: 'string|false|comment=拍摄日期快照',
	PAYMENT_CUSTOMER_NAME: 'string|false|comment=客户名快照',
	PAYMENT_CUSTOMER_SURNAME: 'string|false|comment=客户简称快照',

	PAYMENT_TYPE: 'string|true|comment=收款类型',
	PAYMENT_BASE_TYPE: 'string|true|default=shoot|comment=提成基数类型',
	PAYMENT_DIRECTION: 'string|true|default=income|comment=income/refund/adjust',
	PAYMENT_AMOUNT_CENT: 'int|true|default=0|comment=主账金额分',
	PAYMENT_AMOUNT: 'float|true|default=0|comment=展示兼容金额元',
	PAYMENT_DATE: 'string|true|comment=发生日期',
	PAYMENT_PAY_DATE: 'string|false|comment=发生日期别名',
	PAYMENT_MONTH: 'string|true|comment=归属月份',

	PAYMENT_STAFF_ID: 'string|false|comment=业绩归属员工',
	PAYMENT_STAFF_NAME: 'string|false|comment=业绩归属员工姓名',
	PAYMENT_STAFF_OPENID: 'string|false|comment=员工openid快照',
	PAYMENT_OWNER_STAFF_ID: 'string|false|comment=归属员工别名',
	PAYMENT_OWNER_NAME: 'string|false|comment=归属姓名别名',
	PAYMENT_TEAM_ID: 'string|false|comment=团队ID快照',
	PAYMENT_TEAM_NAME: 'string|false|comment=团队名快照',

	PAYMENT_SOURCE: 'string|true|default=order_edit|comment=来源',
	PAYMENT_STATUS: 'int|true|default=10|comment=10有效 20作废',
	PAYMENT_IS_LOCKED: 'int|true|default=0|comment=0未锁定 1已锁定',
	PAYMENT_LOCK_KEY: 'string|false|comment=锁定来源key',
	PAYMENT_REF_PAYMENT_ID: 'string|false|comment=退款引用原payment',
	PAYMENT_CLIENT_KEY: 'string|false|comment=前端稳定key',
	PAYMENT_BIZ_KEY: 'string|true|comment=幂等key',
	PAYMENT_VERSION: 'int|true|default=1|comment=替换版本',
	PAYMENT_REPLACE_FROM_ID: 'string|false|comment=替换来源',
	PAYMENT_REPLACE_TO_ID: 'string|false|comment=替换目标',
	PAYMENT_VOID_REASON: 'string|false|comment=作废原因',
	PAYMENT_VOID_TIME: 'int|true|default=0|comment=作废时间',

	PAYMENT_SUMMARY: 'object|false|default={}|comment=收款摘要快照',
	PAYMENT_NOTE: 'string|false|comment=备注',
	PAYMENT_REMARK: 'string|false|comment=备注别名',
	PAYMENT_OPERATOR_STAFF_ID: 'string|false|comment=操作员工',
	PAYMENT_OPERATOR_OPENID: 'string|false|comment=操作openid',
	PAYMENT_OPERATOR_NAME: 'string|false|comment=操作人姓名',

	PAYMENT_ADD_TIME: 'int|true',
	PAYMENT_EDIT_TIME: 'int|true',
	PAYMENT_ADD_IP: 'string|false',
	PAYMENT_EDIT_IP: 'string|false',
};

WorkPaymentModel.FIELD_PREFIX = 'PAYMENT_';

WorkPaymentModel.TYPE = financeConfig.PAYMENT_TYPE;
WorkPaymentModel.BASE_TYPE = financeConfig.PAYMENT_BASE_TYPE;
WorkPaymentModel.DIRECTION = financeConfig.PAYMENT_DIRECTION;
WorkPaymentModel.SOURCE = financeConfig.PAYMENT_SOURCE;
WorkPaymentModel.STATUS = financeConfig.PAYMENT_STATUS;
WorkPaymentModel.LOCKED = financeConfig.LOCKED;

module.exports = WorkPaymentModel;
