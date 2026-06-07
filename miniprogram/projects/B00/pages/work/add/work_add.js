const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		isLoad: false,
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
		let d = new Date();
		let y = d.getFullYear();
		let m = String(d.getMonth() + 1).padStart(2, '0');
		let day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	},
	_setAddDay(day) {
		day = day || '';
		this.setData({
			day,
			addOrderUrl: day ? ('../order_edit/work_order_edit?day=' + day) : '../order_edit/work_order_edit',
		});
	},
	_isUndatedOrder(order) {
		return !order || order.ORDER_DATE === undefined || order.ORDER_DATE === null || order.ORDER_DATE === '';
	},
	_formatOrder(order) {
		order = Object.assign({}, order || {});
		let amount = Number(order.ORDER_AMOUNT || 0);
		let paid = Number(order.PAID_AMOUNT !== undefined && order.PAID_AMOUNT !== null ? order.PAID_AMOUNT : (order.ORDER_ACTUAL_AMOUNT || 0));
		let unpaid = Number(order.UNPAID_AMOUNT !== undefined && order.UNPAID_AMOUNT !== null ? order.UNPAID_AMOUNT : Math.max(0, amount - paid));
		order.PAID_AMOUNT = paid;
		order.UNPAID_AMOUNT = unpaid;
		order.ORDER_DATE_TEXT = this._isUndatedOrder(order) ? '未定档' : order.ORDER_DATE;
		order.ORDER_PROGRESS_TEXT = order.ORDER_PROGRESS_DESC || (order.ORDER_PROGRESS ? (order.ORDER_PROGRESS + '%') : '未开始');
		order.ORDER_SETTLE_TEXT = order.ORDER_SETTLE_STATUS_DESC || order.ORDER_SETTLEMENT_STATUS_DESC || order.ORDER_PAY_STATUS_DESC || '未结算';
		return order;
	},
	_filterMonthOrders(list) {
		let month = this.data.month || '';
		return (list || []).filter(order => this._isUndatedOrder(order) || (order.ORDER_DATE && order.ORDER_DATE.indexOf(month) === 0));
	},
	_loadOrders: async function () {
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
		let id = e.currentTarget.dataset.id;
		if (!id) return;
		wx.navigateTo({ url: '../order_edit/work_order_edit?id=' + id });
	},
	url: function (e) {
		pageHelper.url(e, this);
	},
});
