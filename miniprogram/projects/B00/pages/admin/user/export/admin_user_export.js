const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../../helper/page_helper.js');

Page({
	data: {
		condition: '',
		fileUrl: '',
		fileTime: '',
	},

	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;
		this.setData({
			condition: options.condition ? decodeURIComponent(options.condition) : '',
		});
		await this._getExportFile(0);
	},

	bindExportTap: async function () {
		await cloudHelper.callCloudSumbit('admin/user_data_export', {
			condition: this.data.condition,
			fields: [],
		}, { title: '导出中' });

		await this._getExportFile(0);
		pageHelper.showSuccToast('导出完成');
	},

	bindRefreshTap: async function () {
		await this._getExportFile(0);
	},

	bindDeleteTap: async function () {
		let callback = async () => {
			await cloudHelper.callCloudSumbit('admin/user_data_del', {}, { title: '删除中' });
			this.setData({ fileUrl: '', fileTime: '' });
			pageHelper.showSuccToast('删除成功');
		};
		pageHelper.showConfirm('确认删除当前导出的Excel文件？', callback);
	},

	bindCopyTap: function () {
		if (!this.data.fileUrl) return pageHelper.showNoneToast('暂无下载链接');
		wx.setClipboardData({
			data: this.data.fileUrl,
		});
	},

	_getExportFile: async function (isDel) {
		let data = await cloudHelper.callCloudData('admin/user_data_get', { isDel }, { title: '加载中' });
		if (!data) return;
		this.setData({
			fileUrl: data.url || '',
			fileTime: data.time || '',
		});
	},
});
