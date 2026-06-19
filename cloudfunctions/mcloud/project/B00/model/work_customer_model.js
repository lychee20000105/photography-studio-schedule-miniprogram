/**
 * Notes: 云屿摄影客户档案
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkCustomerModel extends BaseProjectModel {}

WorkCustomerModel.CL = 'bx_work_customer';

WorkCustomerModel.DB_STRUCTURE = {
	_pid: 'string|true',
	CUSTOMER_ID: 'string|true',
	CUSTOMER_NAME: 'string|true',
	CUSTOMER_SURNAME: 'string|false',
	CUSTOMER_MOBILE: 'string|false',
	CUSTOMER_SOURCE: 'string|false',
	CUSTOMER_ORDER_CNT: 'int|true|default=0',
	CUSTOMER_LAST_ORDER_ID: 'string|false',
	CUSTOMER_LAST_ORDER_TIME: 'int|true|default=0',
	CUSTOMER_ADD_TIME: 'int|true',
	CUSTOMER_EDIT_TIME: 'int|true',
	CUSTOMER_ADD_IP: 'string|false',
	CUSTOMER_EDIT_IP: 'string|false',
};

WorkCustomerModel.FIELD_PREFIX = 'CUSTOMER_';

module.exports = WorkCustomerModel;
