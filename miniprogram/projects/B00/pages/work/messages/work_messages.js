const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		list: [],
		unreadCount: 0,
		detailVisible: false,
		detail: null,
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
	_loadList: async function () {
		let list = await cloudHelper.callCloudData('work/messages', {}, { title: 'bar' });
		list = (list || []).map(item => this._formatMessage(item));
		let unreadCount = list.filter(item => !item.MSG_IS_READ).length;
		this.setData({ list, unreadCount });
	},

	_formatMessage: function (item = {}) {
		item = Object.assign({}, item);
		let content = String(item.MSG_CONTENT || '').replace(/\s+/g, ' ').trim();
		item.MSG_BRIEF = content.length > 42 ? content.substr(0, 42) + '...' : content;
		if (item.MSG_REF_TYPE == 'order') item.MSG_REF_LABEL = '关联订单';
		else if (item.MSG_REF_TYPE == 'feedback') item.MSG_REF_LABEL = '关联反馈';
		else item.MSG_REF_LABEL = '';
		return item;
	},

	_markRead: async function (id, idx) {
		let item = this.data.list[idx] || {};
		if (!id || item.MSG_IS_READ) return item;
		await cloudHelper.callCloudSumbit('work/message_read', { id }, { title: 'bar' });
		let list = this.data.list || [];
		list[idx].MSG_IS_READ = 1;
		item = list[idx];
		this.setData({ list, unreadCount: Math.max(0, Number(this.data.unreadCount || 0) - 1) });
		return item;
	},

	bindMessageTap: async function (e) {
		let id = e.currentTarget.dataset.id || '';
		let idx = Number(e.currentTarget.dataset.idx || 0);
		let item = await this._markRead(id, idx);
		if (!item || !item._id) item = this.data.list[idx] || {};
		this.setData({ detailVisible: true, detail: item });
	},

	bindCloseDetailTap: function () {
		this.setData({ detailVisible: false, detail: null });
	},

	noop: function () {},

	bindOpenRefTap: function () {
		let item = this.data.detail || {};
		let refType = item.MSG_REF_TYPE || '';
		let refId = item.MSG_REF_ID || '';
		if (!refType || !refId) return pageHelper.showModal('这条消息没有可打开的关联内容');
		this.setData({ detailVisible: false });
		if (refType == 'order') {
			wx.navigateTo({ url: '../order_edit/work_order_edit?id=' + refId });
			return;
		}
		if (refType == 'feedback') {
			wx.navigateTo({ url: '../admin_feedback/work_admin_feedback' });
			return;
		}
		pageHelper.showModal('暂不支持打开该类型关联内容：' + refType);
	},

	bindReadAllTap: async function () {
		if (!this.data.unreadCount) return pageHelper.showSuccToast('没有未读消息');
		await cloudHelper.callCloudSumbit('work/message_read_all', {}, { title: '处理中' });
		let list = (this.data.list || []).map(item => Object.assign({}, item, { MSG_IS_READ: 1 }));
		this.setData({ list, unreadCount: 0 });
		pageHelper.showSuccToast('已全部标记已读');
	},
});
