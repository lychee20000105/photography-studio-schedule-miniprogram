const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		isLoad: false,
		month: '',
		data: null,
		rankScope: 'staff',
		rankList: [],
	},
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		this.setData({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
	},
	onShow: async function () {
		await this._loadData();
	},
	onPullDownRefresh: async function () {
		await this._loadData();
		wx.stopPullDownRefresh();
	},
	_loadData: async function () {
		let data = await cloudHelper.callCloudData('work/performance_home', { month: this.data.month }, { title: this.data.isLoad ? 'bar' : '加载中' });
		if (!data) data = null;
		this.setData({ isLoad: true, data, rankList: data ? (data.rankList || []) : [] });
	},
	bindMonthChange: async function (e) {
		this.setData({ month: e.detail.value, isLoad: false });
		await this._loadData();
	},
	bindRankScopeTap: async function (e) {
		let scope = e.currentTarget.dataset.scope || 'staff';
		this.setData({ rankScope: scope });
		let list = await cloudHelper.callCloudData('work/performance_rank', { month: this.data.month, scope }, { title: 'bar' });
		this.setData({ rankList: list || [] });
	},
	url: function (e) {
		pageHelper.url(e, this);
	},
});
