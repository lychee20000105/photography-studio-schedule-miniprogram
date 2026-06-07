/**
 * Notes: 云屿摄影小程序内管理中心鉴权服务
 */

const appCode = require('../../../framework/core/app_code.js');
const WorkPermissionService = require('./work_permission_service.js');
const WorkStaffModel = require('../model/work_staff_model.js');
const WorkOrderModel = require('../model/work_order_model.js');
const WorkItemModel = require('../model/work_item_model.js');
const WorkRestModel = require('../model/work_rest_model.js');

class WorkAdminAuthService extends WorkPermissionService {

	async assertMiniAdmin(openId) {
		return await this.assertAdmin(openId, appCode.MINI_ADMIN_ERROR);
	}

	async getAdminHome(openId, adminStaff = null) {
		adminStaff = adminStaff || await this.assertMiniAdmin(openId);

		let staffCnt = await WorkStaffModel.count({
			STAFF_STATUS: WorkStaffModel.STATUS.COMM,
		});
		let orderWaitAuditCnt = await WorkOrderModel.count({
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
			ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.WAIT_AUDIT,
		});
		let orderWaitPayCnt = await WorkOrderModel.count({
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
			ORDER_SETTLE_STATUS: WorkOrderModel.SETTLE.WAIT_PAY,
		});
		let itemWaitAuditCnt = await WorkItemModel.count({
			ITEM_STATUS: 0,
		});
		let restWaitAuditCnt = await WorkRestModel.count({
			REST_STATUS: 0,
		});
		let canceledOrderCnt = await WorkOrderModel.count({
			ORDER_STATUS: WorkOrderModel.STATUS.CANCEL,
		});

		return {
			admin: this.cleanStaff(adminStaff, false, true),
			cards: [
				{ key: 'staff', title: '启用员工', cnt: staffCnt },
				{ key: 'orderAudit', title: '待审订单', cnt: orderWaitAuditCnt },
				{ key: 'orderPay', title: '待结算订单', cnt: orderWaitPayCnt },
				{ key: 'itemAudit', title: '待审事项', cnt: itemWaitAuditCnt },
				{ key: 'restAudit', title: '待审休息', cnt: restWaitAuditCnt },
				{ key: 'canceledOrder', title: '已取消订单', cnt: canceledOrderCnt },
			],
		};
	}
}

module.exports = WorkAdminAuthService;
