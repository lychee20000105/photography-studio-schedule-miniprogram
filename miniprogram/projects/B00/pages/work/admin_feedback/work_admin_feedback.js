const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		isLoad: false,
		list: [],
	},
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
	},
	onShow: async function () {
		await this._loadList();
	},
	onPullDownRefresh: async function () {
		await this._loadList();
		wx.stopPullDownRefresh();
	},
	_formatTime(ts) {
		if (!ts) return '';
		let d = new Date(Number(ts) * 1000);
		let y = d.getFullYear();
		let m = String(d.getMonth() + 1).padStart(2, '0');
		let day = String(d.getDate()).padStart(2, '0');
		let h = String(d.getHours()).padStart(2, '0');
		let min = String(d.getMinutes()).padStart(2, '0');
		return `${y}-${m}-${day} ${h}:${min}`;
	},
	_loadList: async function () {
		let list = await cloudHelper.callCloudData('work/admin_feedback_list', {}, { title: this.data.isLoad ? 'bar' : '加载中' });
		list = (list || []).map(item => {
			item.addTimeText = this._formatTime(item.FEEDBACK_ADD_TIME);
			return item;
		});
		this.setData({ isLoad: true, list });
	},
});
