const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

function centText(value) {
	let cent = Number(value || 0);
	if (!Number.isFinite(cent)) cent = 0;
	return (cent / 100).toFixed(2);
}

Page({
	data: { month: '', staffId: '', list: [], monthText: '全部月份' },
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		this._loadList();
	},
	onPullDownRefresh: async function () {
		await this._loadList();
		wx.stopPullDownRefresh();
	},
	_normalizeList(list) {
		return (list || []).map(item => {
			item = Object.assign({}, item || {});
			item.customerText = item.COMMISSION_CUSTOMER_SURNAME || item.COMMISSION_CUSTOMER_NAME || '';
			item.frozenRemainText = centText(item.COMMISSION_FROZEN_REMAIN_CENT);
			return item;
		});
	},
	_loadList: async function () {
		let res = await cloudHelper.callCloudData('work/admin_frozen_list', { month: this.data.month, staffId: this.data.staffId, size: 80 }, { title: 'bar' });
		this.setData({ list: this._normalizeList(res ? (res.list || []) : []), monthText: this.data.month || '全部月份' });
	},
	bindInput: function (e) {
		this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
	},
	bindMonthChange: async function (e) {
		this.setData({ month: e.detail.value });
		await this._loadList();
	},
});
