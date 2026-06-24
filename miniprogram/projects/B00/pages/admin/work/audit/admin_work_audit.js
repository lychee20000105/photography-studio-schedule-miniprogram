const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const ListHelper = require('../../../../../../helper/list_helper.js');
const ProjectBiz = require('../../../../biz/project_biz.js');

Page({
	data: { data: null, listLoadingMore: false, listNoMore: false },
	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		ProjectBiz.initPage(this, { isLoadSkin: true });
		ListHelper.initPage(this, 20);
		await this._loadData();
	},
	onReachBottom: async function () {
		if (this._auditListType === 'paginated') {
			await ListHelper.loadMore(this, this._loadMoreOrders.bind(this), 'data.orders');
		}
	},
	onPullDownRefresh: async function () {
		if (!AdminBiz.isAdmin(this)) {
			wx.stopPullDownRefresh();
			return;
		}

		ListHelper.initPage(this, 20);
		await this._loadData();
		wx.stopPullDownRefresh();
	},
	_loadMoreOrders: async function (page, size) {
		let data = await cloudHelper.callCloudData('admin/work_audit_list', { page, size }, {});
		if (data && data.orders) {
			// 合并 items/rests 只在第一页返回
			if (page === 1 && data.items) {
				this.setData({ 'data.items': data.items || [] });
			}
			if (page === 1 && data.rests) {
				this.setData({ 'data.rests': data.rests || [] });
			}
			return data.orders;
		}
		return [];
	},
	_loadData: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let data = await cloudHelper.callCloudData('admin/work_audit_list', { page: 1, size: 20 }, { title: 'bar' });
		if (data && data.orders && data.orders.length >= 20) {
			// 数据量大，启用分页模式
			this._auditListType = 'paginated';
			this._listPage = 2; // 第1页已在结果中
			this.setData({
				data: { orders: data.orders || [], items: data.items || [], rests: data.rests || [] },
				listNoMore: false
			});
		} else {
			// 数据量小，一次性加载
			this._auditListType = 'full';
			this.setData({ data: data || { orders: [], items: [], rests: [] }, listNoMore: true });
		}
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
