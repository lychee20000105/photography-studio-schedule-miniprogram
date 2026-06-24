const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const dateHelper = require('../../../../../../helper/date_helper.js');

Page({
	data: {
		meetId: '',
		title: '',
		startDay: '',
		endDay: '',
		statusIndex: 0,
		statusList: [
			{ label: '预约成功', value: 1 },
			{ label: '待审核', value: 0 },
			{ label: '已取消', value: 10 },
		],
		fileUrl: '',
		fileTime: '',
	},

	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		let today = this._today();
		this.setData({
			meetId: options.meetId || '',
			title: options.title ? decodeURIComponent(options.title) : '预约名单',
			startDay: today,
			endDay: today,
		});
		await this._getExportFile(0);
	},

	bindStartDayChange: function (e) {
		this.setData({ startDay: e.detail.value });
	},

	bindEndDayChange: function (e) {
		this.setData({ endDay: e.detail.value });
	},

	bindStatusChange: function (e) {
		this.setData({ statusIndex: Number(e.detail.value) || 0 });
	},

	bindExportTap: async function () {
		if (!this.data.meetId) return pageHelper.showModal('缺少预约项目ID');
		if (this.data.startDay > this.data.endDay) return pageHelper.showModal('开始日期不能大于结束日期');

		let status = this.data.statusList[this.data.statusIndex].value;
		await cloudHelper.callCloudSumbit('admin/join_data_export', {
			meetId: this.data.meetId,
			startDay: this.data.startDay,
			endDay: this.data.endDay,
			status,
		}, { title: '导出中' });

		await this._getExportFile(0);
		pageHelper.showSuccToast('导出完成');
	},

	bindRefreshTap: async function () {
		await this._getExportFile(0);
	},

	bindDeleteTap: async function () {
		let callback = async () => {
			await cloudHelper.callCloudSumbit('admin/join_data_del', {}, { title: '删除中' });
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
		let data = await cloudHelper.callCloudData('admin/join_data_get', { isDel }, { title: '加载中' });
		if (!data) return;
		this.setData({
			fileUrl: data.url || '',
			fileTime: data.time || '',
		});
	},

	_today: function () {
		return dateHelper.today();
	},
});
