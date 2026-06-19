const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../../biz/project_biz.js');

Page({
	data: { list: [] },
	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		ProjectBiz.initPage(this, { isLoadSkin: true });
		await this._loadList();
	},
	_loadList: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let list = await cloudHelper.callCloudData('admin/work_canceled_orders', {}, { title: 'bar' });
		this.setData({ list: list || [] });
	},
	bindDelTap: function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		let id = e.currentTarget.dataset.id;
		pageHelper.showConfirm('确定彻底删除该订单吗？', async () => {
			if (!AdminBiz.isAdmin(this)) return;

			await cloudHelper.callCloudSumbit('admin/work_order_del', { id }, { title: '删除中' });
			pageHelper.showSuccToast('已删除');
			await this._loadList();
		});
	},
	bindRestoreTap: async function (e) {
		if (!AdminBiz.isAdmin(this)) return;

		await cloudHelper.callCloudSumbit('admin/work_order_restore', { id: e.currentTarget.dataset.id }, { title: '恢复中' });
		pageHelper.showSuccToast('已恢复');
		await this._loadList();
	},
});
