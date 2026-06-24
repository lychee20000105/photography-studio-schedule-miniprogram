const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const guestHelper = require('../../../../../helper/guest_helper.js');
const orderHelper = require('../../../../../helper/order_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		isLoad: false,
		isGuest: false,
		month: '',
		data: null,
		rankScope: 'staff',
		rankExpanded: false,
		rankList: [],
		orderSummary: { total: 0, undated: 0, unpaidTotal: 0, pendingSettle: 0 },
		orderList: [],
	},
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		this.setData({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
	},
	onShow: async function () {
		let now = Date.now();
		if (this._lastLoadTime && now - this._lastLoadTime < 30000) return;
		await this._loadData();
		this._lastLoadTime = Date.now();
	},
	onPullDownRefresh: async function () {
		await this._loadData();
		wx.stopPullDownRefresh();
	},
	_loadData: async function () {
		if (guestHelper.isGuest()) {
			let data = guestHelper.getPerformance(this.data.month);
			let orderPreview = this._buildOrderPreview(guestHelper.getOrders(this.data.month));
			this.setData({ isLoad: true, isGuest: true, data, rankList: data.rankList || [], orderSummary: orderPreview.summary, orderList: orderPreview.list });
			return;
		}
		let data = await cloudHelper.callCloudData('work/performance_home', { month: this.data.month }, { title: this.data.isLoad ? 'bar' : '加载中' });
		if (!data) data = null;
		let orderPreview = await this._loadOrderPreview();
		this.setData({ isLoad: true, isGuest: false, data, rankList: data ? (data.rankList || []) : [], orderSummary: orderPreview.summary, orderList: orderPreview.list });
	},
	bindMonthChange: async function (e) {
		this.setData({ month: e.detail.value, isLoad: false, rankExpanded: false, rankScope: 'staff' });
		await this._loadData();
	},
	bindRankToggleTap: async function () {
		let rankExpanded = !this.data.rankExpanded;
		this.setData({ rankExpanded });
		if (rankExpanded) await this._loadRank(this.data.rankScope);
	},
	bindRankScopeTap: async function (e) {
		let scope = e.currentTarget.dataset.scope || 'staff';
		this.setData({ rankScope: scope, rankExpanded: true });
		await this._loadRank(scope);
	},
	_loadRank: async function (scope = 'staff') {
		if (this.data.isGuest) {
			let data = guestHelper.getPerformance(this.data.month);
			this.setData({ rankList: data.rankList || [] });
			return;
		}
		let list = await cloudHelper.callCloudData('work/performance_rank', { month: this.data.month, scope }, { title: 'bar' });
		this.setData({ rankList: list || [] });
	},
	_isUndatedOrder(order) {
		return orderHelper.isUndatedOrder(order);
	},
	_formatOrder(order) {
		return orderHelper.formatOrder(order);
	},
	_buildOrderPreview(list = []) {
		let month = this.data.month || '';
		let monthList = (list || []).filter(order => this._isUndatedOrder(order) || (order.ORDER_DATE && order.ORDER_DATE.indexOf(month) === 0));
		let formatted = monthList.map(order => this._formatOrder(order));
		let undated = 0;
		let unpaidTotal = 0;
		let pendingSettle = 0;
		for (let order of formatted) {
			if (this._isUndatedOrder(order)) undated++;
			unpaidTotal += Number(order.UNPAID_AMOUNT || 0);
			if (Number(order.ORDER_SETTLE_STATUS || 0) < 40) pendingSettle++;
		}
		return {
			summary: {
				total: formatted.length,
				undated,
				unpaidTotal,
				pendingSettle,
			},
			list: formatted.slice(0, 3),
		};
	},
	async _loadOrderPreview() {
		try {
			let data = await cloudHelper.callCloudData('work/order_list', { month: this.data.month, scope: 'month' }, { title: 'bar' });
			return this._buildOrderPreview(data && data.list ? data.list : []);
		} catch (err) {
			console.error(err);
			return this._buildOrderPreview([]);
		}
	},
	bindOrderTap: function (e) {
		if (this.data.isGuest) return guestHelper.showReadonlyTip();
		let id = e.currentTarget.dataset.id;
		if (!id) return;
		wx.navigateTo({ url: '../order_edit/work_order_edit?id=' + id });
	},
	url: function (e) {
		if (this.data.isGuest) return guestHelper.showReadonlyTip();
		pageHelper.url(e, this);
	},
});
