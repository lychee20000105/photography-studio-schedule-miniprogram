const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		item: {
			ITEM_TITLE: '',
			ITEM_DATE: '',
			ITEM_TIME: '',
			ITEM_END_TIME: '',
			ITEM_CONTENT: '',
		},
	},
	onLoad: function (options) {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		let day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
		this.setData({ 'item.ITEM_DATE': options.day || day });
	},
	bindInput: function (e) {
		this.setData({ ['item.' + e.currentTarget.dataset.field]: e.detail.value });
	},
	bindDateChange: function (e) {
		this.setData({ 'item.ITEM_DATE': e.detail.value });
	},
	bindSubmitTap: async function () {
		await cloudHelper.callCloudSumbit('work/item_save', { item: this.data.item }, { title: '保存中' });
		pageHelper.showSuccToastReturn('已提交');
	},
});
