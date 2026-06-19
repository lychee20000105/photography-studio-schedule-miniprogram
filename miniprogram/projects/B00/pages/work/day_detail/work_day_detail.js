const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

function dayLabel(day) {
	if (!day) return '';
	let now = new Date();
	let today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	if (day == today) return '今天';
	let d = new Date(day + 'T00:00:00');
	if (isNaN(d.getTime())) return '';
	d.setDate(d.getDate() + 1);
	let tomorrow = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	if (day == tomorrow) return '明天';
	d.setDate(d.getDate() - 2);
	let yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	if (day == yesterday) return '昨天';
	return '';
}

Page({
	data: {
		isLoad: false,
		day: '',
		dayLabel: '',
		scope: 'all',
		dayData: { orders: [], items: [], rests: [] },
	},

	onLoad: async function (options) {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let day = options.day || '';
		let scope = options.scope || 'all';
		this.setData({ day, scope, dayLabel: dayLabel(day) });
		wx.setNavigationBarTitle({ title: day ? `云屿摄影-${day} 档期` : '云屿摄影-当天档期' });
		await this._loadDay();
	},

	onShow: async function () {
		if (this.data.isLoad) await this._loadDay();
	},

	onPullDownRefresh: async function () {
		await this._loadDay();
		wx.stopPullDownRefresh();
	},

	_loadDay: async function () {
		let data = await cloudHelper.callCloudData('work/day_list', {
			day: this.data.day,
			scope: this.data.scope,
		}, { title: this.data.isLoad ? 'bar' : '加载中' });
		this.setData({
			isLoad: true,
			dayData: data || { orders: [], items: [], rests: [] },
		});
	},

	bindOrderTap: function (e) {
		let id = e.currentTarget.dataset.id;
		wx.navigateTo({
			url: '../order_edit/work_order_edit?id=' + id,
		});
	},

	bindItemCancelTap: function (e) {
		let id = e.currentTarget.dataset.id;
		if (!id) return;
		wx.showModal({
			title: '删除事项',
			content: '确认删除这条事项档期吗？',
			success: async res => {
				if (!res.confirm) return;
				try {
					await cloudHelper.callCloudSumbit('work/item_cancel', { id }, { title: '删除中' });
					pageHelper.showSuccToast('已删除');
					await this._loadDay();
				} catch (err) {
					console.error(err);
				}
			},
		});
	},

	bindAddTap: function () {
		let day = this.data.day || '';
		wx.setStorageSync('WORK_ADD_DAY', day);
		wx.navigateTo({
			url: '/projects/B00/pages/work/add/work_add' + (day ? '?day=' + encodeURIComponent(day) : ''),
			fail: err => {
				console.error(err);
				pageHelper.showModal((err && err.errMsg) || '打开新增页面失败');
			},
		});
	},
});
