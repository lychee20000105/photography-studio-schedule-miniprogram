const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../../helper/page_helper.js');

Page({
	data: {
		list: [],
	},

	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;
		await this._loadList();
	},

	bindSelectTap: function (e) {
		let idx = pageHelper.dataset(e, 'idx');
		let item = this.data.list[idx];
		if (!item || !Array.isArray(item.times)) return;

		let prev = pageHelper.getPrevPage(2);
		if (!prev || !prev.data || !Array.isArray(prev.data.days)) {
			return pageHelper.showModal('未找到可应用模板的页面');
		}

		let curIdx = prev.data.curIdx;
		if (curIdx < 0 || !prev.data.days[curIdx]) return pageHelper.showModal('未选择日期');

		let days = prev.data.days;
		days[curIdx].times = item.times.map(item => ({
			start: item.start,
			end: item.end,
			isLimit: !!item.isLimit,
			limit: item.limit || 50,
		}));

		prev.setData({ days });
		if (prev._syncCalData) prev._syncCalData();

		wx.navigateBack();
	},

	bindDeleteTap: function (e) {
		let id = pageHelper.dataset(e, 'id');
		let callback = async () => {
			await cloudHelper.callCloudSumbit('admin/meet_temp_del', { id }, { title: '删除中' });
			await this._loadList();
			pageHelper.showSuccToast('删除成功');
		};
		pageHelper.showConfirm('确认删除该模板？', callback);
	},

	_loadList: async function () {
		let list = await cloudHelper.callCloudData('admin/meet_temp_list', {}, { title: '加载中' });
		this.setData({
			list: Array.isArray(list) ? list : [],
		});
	},
});
