const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../../biz/project_biz.js');

Page({
	data: { data: null },
	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		ProjectBiz.initPage(this, { isLoadSkin: true });
		await this._loadData();
	},
	onPullDownRefresh: async function () {
		if (!AdminBiz.isAdmin(this)) {
			wx.stopPullDownRefresh();
			return;
		}

		await this._loadData();
		wx.stopPullDownRefresh();
	},
	_loadData: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let data = await cloudHelper.callCloudData('admin/work_audit_list', {}, { title: 'bar' });
		this.setData({ data: data || { orders: [], items: [], rests: [] } });
	},
	bindPartAmountInput: function (e) {
		let oi = e.currentTarget.dataset.oi;
		let pi = e.currentTarget.dataset.pi;
		let orders = this.data.data.orders;
		orders[oi].ORDER_PARTICIPANTS[pi].calcMode = 'manual';
		orders[oi].ORDER_PARTICIPANTS[pi].manualAmount = e.detail.value;
		orders[oi].ORDER_PARTICIPANTS[pi].amount = e.detail.value;
		this.setData({ 'data.orders': orders });
	},
	bindOrderPassTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let idx = e.currentTarget.dataset.idx;
		let order = this.data.data.orders[idx];
		await cloudHelper.callCloudSumbit('admin/work_audit_order', { id: order._id, pass: true, participants: order.ORDER_PARTICIPANTS }, { title: '审核中' });
		pageHelper.showSuccToast('已通过');
		await this._loadData();
	},
	bindOrderRejectTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let order = this.data.data.orders[e.currentTarget.dataset.idx];
		await cloudHelper.callCloudSumbit('admin/work_audit_order', { id: order._id, pass: false, reason: '审核驳回' }, { title: '处理中' });
		pageHelper.showSuccToast('已驳回');
		await this._loadData();
	},
	bindItemAuditTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let pass = e.currentTarget.dataset.pass === true || e.currentTarget.dataset.pass === 'true';
		await cloudHelper.callCloudSumbit('admin/work_audit_item', { id: e.currentTarget.dataset.id, pass }, { title: '审核中' });
		await this._loadData();
	},
	bindRestAuditTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let pass = e.currentTarget.dataset.pass === true || e.currentTarget.dataset.pass === 'true';
		await cloudHelper.callCloudSumbit('admin/work_audit_rest', { id: e.currentTarget.dataset.id, pass }, { title: '审核中' });
		await this._loadData();
	},
});
