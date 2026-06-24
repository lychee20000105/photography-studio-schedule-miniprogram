const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

const ACTION_OPTIONS = [
	{ key: 'all', name: '全部动作' },
	{ key: 'create_order', name: '新增订单' },
	{ key: 'update_order', name: '修改订单' },
	{ key: 'cancel_order', name: '取消订单' },
	{ key: 'save_payment', name: '录入收款' },
	{ key: 'void_payment', name: '作废收款' },
	{ key: 'pay_payroll', name: '发放工资' },
	{ key: 'audit_order', name: '审核订单' },
	{ key: 'create_item', name: '新增事项' },
	{ key: 'create_rest', name: '新增休息' },
	{ key: 'add_note', name: '新增小记' },
	{ key: 'agent_action', name: '其他动作' },
];

const RISK_OPTIONS = [
	{ key: 'all', name: '全部风险' },
	{ key: 'high', name: '高风险' },
	{ key: 'finance', name: '财务相关' },
	{ key: 'normal', name: '普通' },
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

function riskLabel(risk) {
	let item = RISK_OPTIONS.find(x => x.key == risk);
	return item ? item.name : (risk || '普通');
}

Page({
	data: {
		isLoad: false,
		list: [],
		page: 1,
		size: 20,
		total: 0,
		oldTotal: 0,
		hasMore: true,
		keyword: '',
		actionOptions: ACTION_OPTIONS,
		actionIndex: 0,
		actionPickerText: ACTION_OPTIONS[0].name,
		riskOptions: RISK_OPTIONS,
		riskIndex: 0,
		riskPickerText: RISK_OPTIONS[0].name,
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

	bindRiskChange: async function (e) {
		let riskIndex = Number(e.detail.value || 0);
		let risk = RISK_OPTIONS[riskIndex] || RISK_OPTIONS[0];
		this.setData({ riskIndex, riskPickerText: risk.name });
		await this._loadList(true);
	},

	bindResetTap: async function () {
		this.setData({
			keyword: '',
			actionIndex: 0,
			actionPickerText: ACTION_OPTIONS[0].name,
			riskIndex: 0,
			riskPickerText: RISK_OPTIONS[0].name,
		});
		await this._loadList(true);
	},

	async _loadList(reset) {
		let nextPage = reset ? 1 : this.data.page + 1;
		let action = this.data.actionOptions[this.data.actionIndex] || this.data.actionOptions[0];
		let risk = this.data.riskOptions[this.data.riskIndex] || this.data.riskOptions[0];
		let ret = await cloudHelper.callCloudData('work/admin_agent_audit_list', {
			page: nextPage,
			size: this.data.size,
			oldTotal: reset ? 0 : this.data.oldTotal,
			keyword: (this.data.keyword || '').trim(),
			action: action.key,
			riskLevel: risk.key,
		}, { title: this.data.isLoad ? 'bar' : '加载中' });

		ret = ret || {};
		let incoming = (ret.list || []).map(item => {
			item.addTimeText = formatTime(item.AGENTAUDIT_ADD_TIME);
			item.actionText = actionLabel(item.AGENTAUDIT_ACTION);
			item.riskText = riskLabel(item.AGENTAUDIT_RISK_LEVEL);
			item.riskClass = 'risk-' + (item.AGENTAUDIT_RISK_LEVEL || 'normal');
			return item;
		});
		let list = reset ? incoming : this.data.list.concat(incoming);
		this.setData({
			isLoad: true,
			list,
			page: ret.page || nextPage,
			total: ret.total || this.data.total || 0,
			oldTotal: ret.total || this.data.oldTotal || 0,
			hasMore: incoming.length >= this.data.size,
		});
	},
});
