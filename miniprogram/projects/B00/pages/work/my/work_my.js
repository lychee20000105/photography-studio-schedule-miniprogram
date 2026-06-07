const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		me: null,
		mobile: '',
		code: '',
	},
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
	},
	onShow: async function () {
		await this._loadMe();
	},
	_loadMe: async function () {
		let me = await cloudHelper.callCloudData('work/me', {}, { title: 'bar' });
		if (!me) me = { isBind: false };
		if (me && me.staff) me.staffInitial = me.staff.STAFF_NAME ? me.staff.STAFF_NAME.substr(0, 1) : '云';
		this.setData({ me });
	},
	bindInput: function (e) {
		this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
	},
	bindBindTap: async function () {
		await cloudHelper.callCloudSumbit('work/bind_staff', {
			mobile: this.data.mobile,
			code: this.data.code,
		}, { title: '绑定中' });
		pageHelper.showSuccToast('绑定成功');
		await this._loadMe();
	},
	bindAdminTap: function () {
		wx.navigateTo({ url: '../admin_home/work_admin_home' });
	},
	url: function (e) {
		pageHelper.url(e, this);
	},
});
