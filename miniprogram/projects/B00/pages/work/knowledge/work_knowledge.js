const pageHelper = require('../../../../../helper/page_helper.js');
const guestHelper = require('../../../../../helper/guest_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

function defaultKnowledge() {
	return [
		{
			id: 'sop',
			title: '拍摄SOP',
			type: '流程',
			permission: '全员可读',
			status: '待上传',
			summary: '后续可上传婚礼、写真、商拍、活动跟拍等标准流程。',
			items: ['拍前确认清单', '现场沟通要点', '交付节点', '异常处理'],
		},
		{
			id: 'sales',
			title: '销售话术',
			type: '成交',
			permission: '销售/管理员',
			status: '待配置',
			summary: '用于沉淀报价解释、跟进提醒、异议处理和活动转化话术。',
			items: ['报价说明', '客户追单', '转介绍邀约', '售后回访'],
		},
		{
			id: 'brand',
			title: '品牌与产品资料',
			type: '资料',
			permission: '全员可读',
			status: '待上传',
			summary: '统一展示店内套餐、案例、交付标准和对外介绍口径。',
			items: ['套餐结构', '样片案例', '交付标准', '品牌介绍'],
		},
		{
			id: 'finance',
			title: '财务与提成规则',
			type: '制度',
			permission: '管理员配置',
			status: '受限',
			summary: '涉及收款、提成、工资、审核的内容默认受权限控制。',
			items: ['收款口径', '提成规则', '冻结/释放', '申诉流程'],
		},
	];
}

Page({
	data: {
		isGuest: false,
		scope: 'all',
		list: [],
		showList: [],
	},

	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		this._loadList();
	},

	onPullDownRefresh: function () {
		this._loadList();
		wx.stopPullDownRefresh();
	},

	_loadList: function () {
		let list = defaultKnowledge();
		let isGuest = guestHelper.isGuest();
		if (isGuest) {
			list = list.map(item => Object.assign({}, item, {
				permission: '访客不可读真实资料',
				status: '需绑定员工',
			}));
		}
		this.setData({ isGuest, list }, () => this._filterList());
	},

	_filterList: function () {
		let scope = this.data.scope;
		let list = this.data.list || [];
		let showList = scope == 'all' ? list : list.filter(item => item.type == scope);
		this.setData({ showList });
	},

	bindScopeTap: function (e) {
		this.setData({ scope: e.currentTarget.dataset.scope || 'all' }, () => this._filterList());
	},

	bindCardTap: function (e) {
		let id = e.currentTarget.dataset.id || '';
		let item = (this.data.list || []).find(row => row.id == id);
		if (!item) return;
		if (this.data.isGuest) return guestHelper.showReadonlyTip();
		wx.showModal({
			title: item.title,
			content: `${item.summary}\n\n当前权限：${item.permission}\n\n目录：\n${(item.items || []).map((line, idx) => `${idx + 1}. ${line}`).join('\n')}\n\n上传、检索和权限配置将在管理中心接入。`,
			showCancel: false,
		});
	},

	bindAdminHintTap: function () {
		if (this.data.isGuest) return guestHelper.showReadonlyTip();
		pageHelper.showModal('店内知识将按“资料上传-权限配置-小猫助手检索-访问审计”接入。当前先保留入口和权限结构，避免和订单迁移冲突。');
	},
});
