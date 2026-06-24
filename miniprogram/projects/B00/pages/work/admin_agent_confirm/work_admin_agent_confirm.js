const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

const ACTION_OPTIONS = [
	{ key: 'all', name: '全部动作' },
	{ key: 'cancel_order', name: '取消订单' },
	{ key: 'save_payment', name: '录入收款' },
	{ key: 'void_payment', name: '作废收款' },
	{ key: 'pay_payroll', name: '发放工资' },
	{ key: 'audit_order', name: '审核订单' },
];

const STATUS_OPTIONS = [
	{ key: '0', name: '待确认' },
	{ key: 'all', name: '全部状态' },
	{ key: '1', name: '已执行' },
	{ key: '2', name: '已驳回' },
	{ key: '3', name: '执行失败' },
	{ key: '4', name: '执行中' },
];

function formatTime(ts) {
	if (!ts) return '';
	let d = new Date(Number(ts) * 1000);
	let y = d.getFullYear();
	let m = String(d.getMonth() + 1).padStart(2, '0');
	let day = String(d.getDate()).padStart(2, '0');
	let h = String(d.getHours()).padStart(2, '0');
	let min = String(d.getMinutes()).padStart(2, '0');
	return `${y}-${m}-${day} ${h}:${min}`;
}

function actionLabel(action) {
	let item = ACTION_OPTIONS.find(x => x.key == action);
	return item ? item.name : (action || '未知动作');
}

function statusLabel(status) {
	status = String(status);
	let item = STATUS_OPTIONS.find(x => x.key == status);
	return item ? item.name : '未知状态';
}

function payloadText(payload) {
	try {
		let text = JSON.stringify(payload || {}, null, 2);
		return text.length > 700 ? text.slice(0, 700) + '...' : text;
	} catch (err) {
		return '';
	}
}

function formatStats(stats) {
	stats = stats || {};
	return {
		total: Number(stats.total || 0),
		pendingCount: Number(stats.pendingCount || 0),
		doneCount: Number(stats.doneCount || 0),
		rejectCount: Number(stats.rejectCount || 0),
		failedCount: Number(stats.failedCount || 0),
	};
}

Page({
	data: {
		isLoad: false,
		list: [],
		stats: formatStats({}),
		page: 1,
		size: 20,
		total: 0,
		oldTotal: 0,
		hasMore: true,
		keyword: '',
		actionOptions: ACTION_OPTIONS,
		actionIndex: 0,
		actionPickerText: ACTION_OPTIONS[0].name,
		statusOptions: STATUS_OPTIONS,
		statusIndex: 0,
		statusPickerText: STATUS_OPTIONS[0].name,
	},

	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
	},

	onShow: async function () {
		if (!this.data.isLoad) await this._loadList(true);
	},

	onPullDownRefresh: async function () {
		await this._loadList(true);
		wx.stopPullDownRefresh();
	},

	onReachBottom: async function () {
		if (this.data.hasMore) await this._loadList(false);
	},

	bindKeywordInput: function (e) {
		this.setData({ keyword: e.detail.value });
	},

	bindSearchTap: async function () {
		await this._loadList(true);
	},

	bindActionChange: async function (e) {
		let actionIndex = Number(e.detail.value || 0);
		let action = ACTION_OPTIONS[actionIndex] || ACTION_OPTIONS[0];
		this.setData({ actionIndex, actionPickerText: action.name });
		await this._loadList(true);
	},

	bindStatusChange: async function (e) {
		let statusIndex = Number(e.detail.value || 0);
		let status = STATUS_OPTIONS[statusIndex] || STATUS_OPTIONS[0];
		this.setData({ statusIndex, statusPickerText: status.name });
		await this._loadList(true);
	},

	bindResetTap: async function () {
		this.setData({
			keyword: '',
			actionIndex: 0,
			actionPickerText: ACTION_OPTIONS[0].name,
			statusIndex: 0,
			statusPickerText: STATUS_OPTIONS[0].name,
		});
		await this._loadList(true);
	},

	bindApproveTap: function (e) {
		let id = e.currentTarget.dataset.id || '';
		if (!id) return;
		wx.showModal({
			title: '确认执行',
			content: '确认后会用当前管理员身份执行该高风险动作，业务数据会真实变更。',
			confirmText: '确认执行',
			success: async res => {
				if (!res.confirm) return;
				await cloudHelper.callCloudSumbit('work/admin_agent_confirm_approve', {
					id,
					note: '管理员确认执行',
				}, { title: '执行中' });
				wx.showToast({ title: '已执行', icon: 'success' });
				await this._loadList(true);
			},
		});
	},

	bindRejectTap: function (e) {
		let id = e.currentTarget.dataset.id || '';
		if (!id) return;
		wx.showModal({
			title: '驳回申请',
			content: '驳回后该高风险动作不会执行。',
			confirmText: '驳回',
			success: async res => {
				if (!res.confirm) return;
				await cloudHelper.callCloudSumbit('work/admin_agent_confirm_reject', {
					id,
					note: '管理员驳回',
				}, { title: '处理中' });
				wx.showToast({ title: '已驳回', icon: 'success' });
				await this._loadList(true);
			},
		});
	},

	async _loadList(reset) {
		let nextPage = reset ? 1 : this.data.page + 1;
		let action = this.data.actionOptions[this.data.actionIndex] || this.data.actionOptions[0];
		let status = this.data.statusOptions[this.data.statusIndex] || this.data.statusOptions[0];
		let ret = await cloudHelper.callCloudData('work/admin_agent_confirm_list', {
			page: nextPage,
			size: this.data.size,
			oldTotal: reset ? 0 : this.data.oldTotal,
			keyword: (this.data.keyword || '').trim(),
			action: action.key,
			status: status.key,
		}, { title: this.data.isLoad ? 'bar' : '加载中' });

		ret = ret || {};
		let incoming = (ret.list || []).map(item => {
			item.addTimeText = formatTime(item.AGENTCONFIRM_ADD_TIME);
			item.reviewTimeText = formatTime(item.AGENTCONFIRM_REVIEW_TIME);
			item.actionText = actionLabel(item.AGENTCONFIRM_ACTION);
			item.statusText = statusLabel(item.AGENTCONFIRM_STATUS);
			item.statusClass = 'status-' + String(item.AGENTCONFIRM_STATUS);
			item.payloadText = payloadText(item.AGENTCONFIRM_PAYLOAD);
			item.canReview = Number(item.AGENTCONFIRM_STATUS) === 0;
			return item;
		});
		let list = reset ? incoming : this.data.list.concat(incoming);
		this.setData({
			isLoad: true,
			list,
			stats: formatStats(ret.stats),
			page: ret.page || nextPage,
			total: ret.total || this.data.total || 0,
			oldTotal: ret.total || this.data.oldTotal || 0,
			hasMore: incoming.length >= this.data.size,
		});
	},
});
