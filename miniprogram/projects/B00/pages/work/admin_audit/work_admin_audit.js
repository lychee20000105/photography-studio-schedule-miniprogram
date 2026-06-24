const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const perf = require('../../../../../helper/perf_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: { data: { orders: [] }, orders: [] },
	onLoad: async function () {
		this._perfTimer = perf.startTimer('admin_audit:onLoad');
		ProjectBiz.initPage(this, { isLoadSkin: true });
		await this._loadData();
	},
	onPullDownRefresh: async function () {
		await this._loadData();
		wx.stopPullDownRefresh();
	},
	_normalizeOrders(list) {
		return (list || []).map(item => {
			item = Object.assign({}, item || {});
			let summary = item.ORDER_PAYMENT_SUMMARY || {};
			item.paymentText = summary.netPaid !== undefined ? ('净额：' + summary.netPaid) : '暂无收款汇总';
			return item;
		});
	},
	_loadData: async function () {
		let data = await perf.trackQuery('admin_audit:_loadData', () => cloudHelper.callCloudData('work/admin_audit_list', {}, { title: 'bar' }));
		if (this._perfTimer) { perf.endTimer(this._perfTimer); this._perfTimer = null; }
		data = data || { orders: [] };
		data.orders = this._normalizeOrders(data.orders || []);
		this.setData({ data, orders: data.orders });
	},
	bindPassTap: function (e) {
		let order = this.data.orders[e.currentTarget.dataset.idx];
		wx.showModal({
			title: '审核通过',
			content: '确认订单已交付/应收已处理，并按审核当月释放冻结提成？',
			success: async r => {
				if (!r.confirm) return;
				await cloudHelper.callCloudSumbit('work/admin_order_audit', { id: order._id, pass: true, orderEditTime: order.ORDER_EDIT_TIME || 0 }, { title: '审核中' });
				pageHelper.showSuccToast('已通过');
				await this._loadData();
			},
		});
	},
	bindRejectTap: function (e) {
		let order = this.data.orders[e.currentTarget.dataset.idx];
		wx.showModal({
			title: '驳回审核',
			content: '确认驳回该订单完成申请？',
			success: async r => {
				if (!r.confirm) return;
				await cloudHelper.callCloudSumbit('work/admin_order_audit', { id: order._id, pass: false, reason: '管理中心驳回完成审核', orderEditTime: order.ORDER_EDIT_TIME || 0 }, { title: '处理中' });
				pageHelper.showSuccToast('已驳回');
				await this._loadData();
			},
		});
	},
});
