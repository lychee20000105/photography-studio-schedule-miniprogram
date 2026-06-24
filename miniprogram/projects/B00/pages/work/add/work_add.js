const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const guestHelper = require('../../../../../helper/guest_helper.js');
const dateHelper = require('../../../../../helper/date_helper.js');
const orderHelper = require('../../../../../helper/order_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		isLoad: false,
		isGuest: false,
		day: '',
		addOrderUrl: '../order_edit/work_order_edit',
		month: '',
		scope: 'month',
		orders: [],
		monthOrderCount: 0,
		undatedOrderCount: 0,
	},
	onLoad: function (options) {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let today = this._today();
		let day = options.day || '';
		this._setAddDay(day);
		this.setData({
			month: today.substr(0, 7),
		});
	},
	onShow: async function () {
		let day = wx.getStorageSync('WORK_ADD_DAY') || '';
		if (day) {
			this._setAddDay(day);
			wx.removeStorageSync('WORK_ADD_DAY');
		}
		await this._loadOrders();
	},
	onPullDownRefresh: async function () {
		await this._loadOrders();
		wx.stopPullDownRefresh();
	},
	_today() {
		return dateHelper.today();
	},
	_setAddDay(day) {
		day = day || '';
		this.setData({
			day,
			addOrderUrl: day ? ('../order_edit/work_order_edit?day=' + day) : '../order_edit/work_order_edit',
		});
	},
	_isUndatedOrder(order) {
		return orderHelper.isUndatedOrder(order);
	},
	_formatOrder(order) {
		return orderHelper.formatOrder(order);
	},
	_filterMonthOrders(list) {
		let month = this.data.month || '';
		return (list || []).filter(order => this._isUndatedOrder(order) || (order.ORDER_DATE && order.ORDER_DATE.indexOf(month) === 0));
	},
	_loadOrders: async function () {
		if (guestHelper.isGuest()) {
			let list = guestHelper.getOrders(this.data.month);
			let monthList = this._filterMonthOrders(list);
			let showList = this.data.scope == 'month' ? monthList : list;
			let undatedOrderCount = 0;
			for (let order of monthList) {
				if (this._isUndatedOrder(order)) undatedOrderCount++;
			}
			this.setData({
				isLoad: true,
				isGuest: true,
				orders: showList.map(order => this._formatOrder(order)),
				monthOrderCount: monthList.length,
				undatedOrderCount,
			});
			return;
		}
		let scope = this.data.scope;
		let params = {
			scope: scope == 'month' ? 'all' : scope,
			month: 'all',
		};
		let data = await cloudHelper.callCloudData('work/order_list', params, { title: this.data.isLoad ? 'bar' : '加载中' });
		let list = data && data.list ? data.list : [];
		let monthList = this._filterMonthOrders(list);
		let showList = scope == 'month' ? monthList : list;
		let undatedOrderCount = 0;
		for (let order of monthList) {
			if (this._isUndatedOrder(order)) undatedOrderCount++;
		}
		this.setData({
			isLoad: true,
			isGuest: false,
			orders: showList.map(order => this._formatOrder(order)),
			monthOrderCount: monthList.length,
			undatedOrderCount,
		});
	},
	bindScopeTap: async function (e) {
		let scope = e.currentTarget.dataset.scope || 'month';
		this.setData({ scope, isLoad: false });
		await this._loadOrders();
	},
	bindMonthChange: async function (e) {
		this.setData({ month: e.detail.value, scope: 'month', isLoad: false });
		await this._loadOrders();
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
