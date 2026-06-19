const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../../biz/project_biz.js');

Page({
	data: {
		list: [],
		form: { TYPE_NAME: '', TYPE_COLOR: '#e60012', TYPE_ORDER: 999, TYPE_IS_OTHER: 0, TYPE_STATUS: 1 },
		colors: ['#d9001b', '#ff7a70', '#2f6df6', '#2f6f4e', '#92008d', '#bf2bd6', '#9b6bc7', '#ffc400', '#49cdbf', '#111827'],
	},
	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		ProjectBiz.initPage(this, { isLoadSkin: true });
		await this._loadList();
	},
	_loadList: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let list = await cloudHelper.callCloudData('admin/work_type_list', {}, { title: 'bar' });
		this.setData({ list: list || [] });
	},
	bindInput: function (e) {
		this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value });
	},
	bindColorTap: function (e) {
		this.setData({ 'form.TYPE_COLOR': e.currentTarget.dataset.color });
	},
	bindStatusChange: function (e) {
		this.setData({ 'form.TYPE_STATUS': e.detail.value ? 1 : 0 });
	},
	bindOtherChange: function (e) {
		this.setData({ 'form.TYPE_IS_OTHER': e.detail.value ? 1 : 0 });
	},
	bindEditTap: function (e) {
		this.setData({ form: JSON.parse(JSON.stringify(this.data.list[e.currentTarget.dataset.idx])) });
		wx.pageScrollTo({ scrollTop: 0 });
	},
	bindNewTap: function () {
		this.setData({ form: { TYPE_NAME: '', TYPE_COLOR: '#e60012', TYPE_ORDER: 999, TYPE_IS_OTHER: 0, TYPE_STATUS: 1 } });
	},
	bindSubmitTap: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		await cloudHelper.callCloudSumbit('admin/work_type_save', { type: this.data.form }, { title: '保存中' });
		pageHelper.showSuccToast('已保存');
		await this._loadList();
	},
});
