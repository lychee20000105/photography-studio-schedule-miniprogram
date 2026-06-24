const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

const ACTION_OPTIONS = [
	{ key: 'create_order', name: '新增订单' },
	{ key: 'update_order', name: '修改订单' },
	{ key: 'cancel_order', name: '取消订单' },
	{ key: 'save_payment', name: '录入收款' },
	{ key: 'void_payment', name: '作废收款' },
	{ key: 'pay_payroll', name: '发放工资' },
	{ key: 'audit_order', name: '审核订单' },
	{ key: 'agent_confirm_pending', name: '确认待处理' },
	{ key: 'agent_confirm_approved', name: '确认已执行' },
	{ key: 'agent_confirm_rejected', name: '确认已驳回' },
	{ key: 'agent_confirm_failed', name: '确认失败' },
	{ key: 'create_item', name: '新增事项' },
	{ key: 'create_rest', name: '新增休息' },
	{ key: 'add_note', name: '新增小记' },
	{ key: 'agent_action', name: '其他动作' },
];

const RISK_OPTIONS = [
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

function optionLabel(list, key, fallback) {
	let item = list.find(x => x.key == key);
	return item ? item.name : (key || fallback);
}

function buildRows(detail) {
	return [
		{ label: '动作', value: detail.actionText || '' },
		{ label: '风险', value: detail.riskText || '' },
		{ label: '员工', value: detail.AGENTAUDIT_STAFF_NAME || '未知员工' },
		{ label: '时间', value: detail.addTimeText || '' },
		{ label: '关联类型', value: detail.AGENTAUDIT_REF_TYPE || '无' },
		{ label: '关联ID', value: detail.AGENTAUDIT_REF_ID || '无' },
	];
}

function buildSummaryRows(summary) {
	summary = summary || {};
	return [
		{ label: '摘要版本', value: summary.schemaVersion ? 'v' + summary.schemaVersion : 'v1' },
		{ label: '复查建议', value: summary.requiresAdminReview ? '建议管理员复查' : '普通留痕' },
		{ label: '安全决策', value: summary.safetyDecision || 'normal_audited_write' },
		{ label: '关联对象', value: [summary.refType, summary.refId].filter(Boolean).join(' / ') || '无' },
	].filter(item => item.value);
}

Page({
	data: {
		isLoad: false,
		id: '',
		detail: null,
		rows: [],
		riskClass: 'risk-normal',
	},

	onLoad: async function (options) {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let id = decodeURIComponent(options.id || '');
		this.setData({ id });
		await this._loadDetail();
	},

	onPullDownRefresh: async function () {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	async _loadDetail() {
		if (!this.data.id) {
			wx.showToast({ title: '缺少审计ID', icon: 'none' });
			return;
		}

		let detail = await cloudHelper.callCloudData('work/admin_agent_audit_detail', {
			id: this.data.id,
		}, { title: this.data.isLoad ? 'bar' : '加载中' });

		detail = detail || {};
		detail.addTimeText = formatTime(detail.AGENTAUDIT_ADD_TIME);
		detail.editTimeText = formatTime(detail.AGENTAUDIT_EDIT_TIME);
		detail.actionText = optionLabel(ACTION_OPTIONS, detail.AGENTAUDIT_ACTION, '未知动作');
		detail.riskText = optionLabel(RISK_OPTIONS, detail.AGENTAUDIT_RISK_LEVEL, '普通');
		detail.safetyLines = detail.safety && Array.isArray(detail.safety.lines) ? detail.safety.lines : [];
		detail.actionSummary = detail.AGENTAUDIT_ACTION_SUMMARY || {};
		detail.summaryRows = buildSummaryRows(detail.actionSummary);
		detail.summarySignals = Array.isArray(detail.actionSummary.signals) ? detail.actionSummary.signals : [];
		detail.summaryTags = Array.isArray(detail.actionSummary.tags) ? detail.actionSummary.tags : [];

		this.setData({
			isLoad: true,
			detail,
			rows: buildRows(detail),
			riskClass: 'risk-' + (detail.AGENTAUDIT_RISK_LEVEL || 'normal'),
		});
	},
});
