const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const perf = require('../../../../../helper/perf_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: { isLoad: false, month: '', data: null },
	onLoad: function () {
		this._perfTimer = perf.startTimer('admin_home:onLoad');
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		this.setData({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
	},
	onShow: async function () { await this._loadData(); },
	onPullDownRefresh: async function () { await this._loadData(); wx.stopPullDownRefresh(); },
	_loadData: async function () {
		let data = await perf.trackQuery('admin_home:_loadData', () => cloudHelper.callCloudData('work/admin_home', { month: this.data.month }, { title: this.data.isLoad ? 'bar' : '加载中' }));
		if (this._perfTimer) { perf.endTimer(this._perfTimer); this._perfTimer = null; }
		this.setData({ isLoad: true, data });
	},
	bindMonthChange: async function (e) { this.setData({ month: e.detail.value, isLoad: false }); await this._loadData(); },
	url: function (e) { pageHelper.url(e, this); },
});
