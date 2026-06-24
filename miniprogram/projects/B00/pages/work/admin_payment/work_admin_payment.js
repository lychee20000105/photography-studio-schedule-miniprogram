const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ListHelper = require('../../../../../helper/list_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

const PAYMENT_TYPE_OPTIONS = [
	{ label: '定金', value: 'deposit', direction: 'income' },
	{ label: '尾款', value: 'final', direction: 'income' },
	{ label: '加选/产品', value: 'extra', direction: 'income' },
	{ label: '退款', value: 'refund', direction: 'refund' },
	{ label: '冲减', value: 'adjust', direction: 'adjust' },
];
const BASE_TYPE_OPTIONS = [
	{ label: '拍摄基数', value: 'shoot' },
	{ label: '加选产品', value: 'extra' },
	{ label: '整单', value: 'all' },
];

Page({
	data: {
		keyword: '',
		month: '',
		list: [],
		orderKeyword: '',
		orders: [],
		payment: { PAYMENT_TYPE: 'deposit', PAYMENT_DIRECTION: 'income', PAYMENT_AMOUNT: '', PAYMENT_DATE: '', PAYMENT_BASE_TYPE: 'shoot', PAYMENT_NOTE: '' },
		order: null,
		typeOptions: PAYMENT_TYPE_OPTIONS,
		baseTypeOptions: BASE_TYPE_OPTIONS,
		typeIndex: 0,
		baseTypeIndex: 0,
		typeLabel: '定金',
		baseTypeLabel: '拍摄基数',
		directionLabel: '收入',
	},

	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		let m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		let day = `${m}-${String(d.getDate()).padStart(2, '0')}`;
		this.setData({ month: m, 'payment.PAYMENT_DATE': day });
		this._syncPaymentLabels();
		ListHelper.initPage(this, 20);
		this._loadList();
	},

	onReachBottom: async function () {
		await ListHelper.loadMore(this, this._loadMorePayments.bind(this), 'list');
	},

	onPullDownRefresh: async function () {
		await this._loadList();
		wx.stopPullDownRefresh();
	},

	_syncPaymentLabels() {
		let type = this.data.payment.PAYMENT_TYPE;
		let baseType = this.data.payment.PAYMENT_BASE_TYPE;
		let typeIndex = PAYMENT_TYPE_OPTIONS.findIndex(item => item.value == type);
		let baseTypeIndex = BASE_TYPE_OPTIONS.findIndex(item => item.value == baseType);
		if (typeIndex < 0) typeIndex = 0;
		if (baseTypeIndex < 0) baseTypeIndex = 0;
		let direction = this.data.payment.PAYMENT_DIRECTION;
		let directionLabel = direction == 'refund' ? '退款' : (direction == 'adjust' ? '冲减' : '收入');
		this.setData({
			typeIndex,
			baseTypeIndex,
			typeLabel: PAYMENT_TYPE_OPTIONS[typeIndex].label,
			baseTypeLabel: BASE_TYPE_OPTIONS[baseTypeIndex].label,
			directionLabel,
		});
	},

	_loadList: async function () {
		ListHelper.refresh(this, this._loadMorePayments.bind(this), 'list');
	},

	_loadMorePayments: async function (page, size) {
		let res = await cloudHelper.callCloudData('work/admin_payment_list', { month: this.data.month, keyword: this.data.keyword, page, size }, { title: page === 1 ? 'bar' : '' });
		return res ? (res.list || []) : [];
	},

	bindInput: function (e) {
		this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
	},

	bindPayInput: function (e) {
		this.setData({ ['payment.' + e.currentTarget.dataset.field]: e.detail.value });
	},

	bindTypeChange: function (e) {
		let idx = Number(e.detail.value || 0);
		let item = PAYMENT_TYPE_OPTIONS[idx] || PAYMENT_TYPE_OPTIONS[0];
		this.setData({
			typeIndex: idx,
			typeLabel: item.label,
			directionLabel: item.direction == 'refund' ? '退款' : (item.direction == 'adjust' ? '冲减' : '收入'),
			'payment.PAYMENT_TYPE': item.value,
			'payment.PAYMENT_DIRECTION': item.direction,
		});
	},

	bindBaseTypeChange: function (e) {
		let idx = Number(e.detail.value || 0);
		let item = BASE_TYPE_OPTIONS[idx] || BASE_TYPE_OPTIONS[0];
		this.setData({
			baseTypeIndex: idx,
			baseTypeLabel: item.label,
			'payment.PAYMENT_BASE_TYPE': item.value,
		});
	},

	bindDateChange: function (e) {
		this.setData({ 'payment.PAYMENT_DATE': e.detail.value });
	},

	bindMonthChange: async function (e) {
		this.setData({ month: e.detail.value });
		ListHelper.initPage(this, 20);
		await this._loadList();
	},

	bindSearchOrder: async function () {
		let res = await cloudHelper.callCloudData('work/admin_order_search', { keyword: this.data.orderKeyword, size: 10 }, { title: '搜索中' });
		this.setData({ orders: res ? (res.list || []) : [] });
	},

	bindChooseOrder: function (e) {
		let order = this.data.orders[e.currentTarget.dataset.idx];
		this.setData({ order });
	},

	bindSaveTap: async function () {
		if (!this.data.order) return pageHelper.showModal('请先选择订单');
		let payment = Object.assign({}, this.data.payment, { orderId: this.data.order._id });
		if (payment.PAYMENT_DIRECTION == 'adjust' && !String(payment.PAYMENT_NOTE || '').trim()) return pageHelper.showModal('冲减必须填写原因/备注');
		await cloudHelper.callCloudSumbit('work/admin_payment_save', { orderId: this.data.order._id, payment }, { title: '保存中' });
		pageHelper.showSuccToast('已保存');
		this.setData({ order: null, orders: [], 'payment.PAYMENT_AMOUNT': '', 'payment.PAYMENT_NOTE': '' });
		await this._loadList();
	},

	bindVoidTap: function (e) {
		let id = e.currentTarget.dataset.id;
		wx.showModal({
			title: '作废收款',
			content: '确认作废该收款？已进工资或锁定的收款会被后端拒绝。',
			success: async r => {
				if (!r.confirm) return;
				await cloudHelper.callCloudSumbit('work/admin_payment_void', { paymentId: id, reason: '管理端作废收款' }, { title: '处理中' });
				pageHelper.showSuccToast('已作废');
				await this._loadList();
			},
		});
	},
});
