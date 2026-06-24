const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: { isLoad: false, month: '', data: null },
	onLoad: function () {
		this._pageLoadStart = Date.now();
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		this.setData({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
	},
	onShow: async function () { await this._loadData(); },
	onPullDownRefresh: async function () { await this._loadData(); wx.stopPullDownRefresh(); },
	_loadData: async function () {
		let loadStart = Date.now();
		let data = await cloudHelper.callCloudData('work/admin_home', { month: this.data.month }, { title: this.data.isLoad ? 'bar' : '加载中' });
		let elapsed = Date.now() - loadStart;
		if (elapsed > 3000) {
			console.warn(`[PERF] admin_home._loadData slow: ${elapsed}ms`);
		}
		if (this._pageLoadStart) {
			let totalElapsed = Date.now() - this._pageLoadStart;
			if (totalElapsed > 5000) {
				console.warn(`[PERF] admin_home onLoad->first data ready: ${totalElapsed}ms`);
			}
			this._pageLoadStart = null;
		}
		this.setData({ isLoad: true, data });
	},
	bindMonthChange: async function (e) { this.setData({ month: e.detail.value, isLoad: false }); await this._loadData(); },
	url: function (e) { pageHelper.url(e, this); },
});
