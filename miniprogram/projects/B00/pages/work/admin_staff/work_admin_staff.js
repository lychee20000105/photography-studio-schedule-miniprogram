const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		isLoad: false,
		roles: ['销售', '摄影', '摄像', '化妆', '选片', '后期', '助理', '运营'],
		modes: [{ label: '按比例', value: 'percent' }, { label: '固定金额', value: 'fixed' }, { label: '手动填写', value: 'manual' }, { label: '不计提成', value: 'none' }],
		roleNodes: [],
		list: [],
		ruleText: '',
		form: { STAFF_NAME: '', STAFF_MOBILE: '', STAFF_BIND_CODE: '', STAFF_ROLES: [], STAFF_RULES: [], STAFF_STATUS: 1, STAFF_IS_ADMIN: 0 },
	},
	onLoad: async function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		this._syncRoleNodes();
		await this._loadList();
	},
	onPullDownRefresh: async function () {
		await this._loadList();
		wx.stopPullDownRefresh();
	},
	_loadList: async function () {
		let list = await cloudHelper.callCloudData('work/admin_staff_list', {}, { title: this.data.isLoad ? 'bar' : '加载中' });
		list = (list || []).map(item => {
			item.ROLE_TEXT = (item.STAFF_ROLES || []).join('、') || '未设置岗位';
			item.BIND_TEXT = item.STAFF_OPENID ? '已绑定' : '未绑定';
			return item;
		});
		this.setData({ isLoad: true, list: list || [] });
	},
	_syncRoleNodes: function () {
		let selected = this.data.form.STAFF_ROLES || [];
		this.setData({
			roleNodes: this.data.roles.map(role => ({ name: role, checked: selected.includes(role) })),
		});
	},
	bindInput: function (e) {
		this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value });
	},
	bindRuleTextInput: function (e) {
		this.setData({ ruleText: e.detail.value });
	},
	_roleSegment: function (text, role) {
		let idx = text.indexOf(role);
		if (idx < 0) return text;
		return text.substring(Math.max(0, idx - 16), Math.min(text.length, idx + 42));
	},
	_parseRoleRule: function (text, role) {
		let seg = this._roleSegment(text, role);
		let rule = { roleName: role, mode: 'percent', percent: 0, amount: 0 };
		if (/不计|不算|无提成|没有提成/.test(seg)) {
			rule.mode = 'none';
			return rule;
		}
		let fixed = seg.match(/(\d+(?:\.\d+)?)\s*(?:元|块|固定)/);
		let percent = seg.match(/(\d+(?:\.\d+)?)\s*%/);
		if (!percent) percent = seg.match(/提成\s*(\d+(?:\.\d+)?)/);
		if (percent) {
			rule.mode = 'percent';
			rule.percent = Number(percent[1] || 0);
			return rule;
		}
		if (fixed) {
			rule.mode = 'fixed';
			rule.amount = Number(fixed[1] || 0);
		}
		return rule;
	},
	bindParseRuleTextTap: function () {
		let text = String(this.data.ruleText || '').trim();
		if (!text) return pageHelper.showModal('请先输入员工身份和提成规则说明');
		let form = Object.assign({}, this.data.form || {});
		let mobile = text.match(/1[3-9]\d{9}/);
		if (mobile && !form.STAFF_MOBILE) form.STAFF_MOBILE = mobile[0];
		let nameMatch = text.match(/(?:姓名|员工|名字)[：:\s]*([\u4e00-\u9fa5A-Za-z0-9]{2,12})/);
		if (!nameMatch) nameMatch = text.match(/^([\u4e00-\u9fa5]{2,6})[，,\s]/);
		if (nameMatch && !form.STAFF_NAME) form.STAFF_NAME = nameMatch[1];
		if (!form.STAFF_BIND_CODE && form.STAFF_MOBILE) form.STAFF_BIND_CODE = String(form.STAFF_MOBILE).slice(-4);

		let roles = [];
		for (let role of this.data.roles) {
			if (text.indexOf(role) >= 0 || text.indexOf(role + '师') >= 0) roles.push(role);
		}
		roles = roles.filter((role, idx) => roles.indexOf(role) == idx);
		if (!roles.length) return pageHelper.showModal('没有识别到岗位，请至少包含销售、摄影、摄像、化妆、选片、后期、助理或运营之一');
		let oldRoles = Array.isArray(form.STAFF_ROLES) ? form.STAFF_ROLES : [];
		form.STAFF_ROLES = oldRoles.concat(roles).filter((role, idx, arr) => arr.indexOf(role) == idx);
		let parsedRules = roles.map(role => this._parseRoleRule(text, role));
		let oldRules = Array.isArray(form.STAFF_RULES) ? form.STAFF_RULES : [];
		let merged = oldRules.filter(item => !roles.includes(item.roleName)).concat(parsedRules);
		form.STAFF_RULES = merged;
		this.setData({ form });
		this._syncRoleNodes();
		pageHelper.showSuccToast('已规整岗位与提成规则');
	},
	bindAdminChange: function (e) {
		this.setData({ 'form.STAFF_IS_ADMIN': e.detail.value ? 1 : 0 });
	},
	bindStatusChange: function (e) {
		this.setData({ 'form.STAFF_STATUS': e.detail.value ? 1 : 0 });
	},
	bindRoleTap: function (e) {
		let role = e.currentTarget.dataset.role;
		let roles = this.data.form.STAFF_ROLES || [];
		if (roles.includes(role)) roles = roles.filter(item => item != role);
		else roles.push(role);
		this.setData({ 'form.STAFF_ROLES': roles });
		this._syncRoleNodes();
	},
	bindAddRuleTap: function () {
		let rules = this.data.form.STAFF_RULES || [];
		rules.push({ roleName: this.data.roles[0], mode: 'percent', percent: 0, amount: 0 });
		this.setData({ 'form.STAFF_RULES': rules });
	},
	bindRuleRoleChange: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let rules = this.data.form.STAFF_RULES || [];
		rules[idx].roleName = this.data.roles[e.detail.value];
		this.setData({ 'form.STAFF_RULES': rules });
	},
	bindRuleModeChange: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let rules = this.data.form.STAFF_RULES || [];
		rules[idx].mode = this.data.modes[e.detail.value].value;
		this.setData({ 'form.STAFF_RULES': rules });
	},
	bindRuleInput: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let field = e.currentTarget.dataset.field;
		let rules = this.data.form.STAFF_RULES || [];
		rules[idx][field] = e.detail.value;
		this.setData({ 'form.STAFF_RULES': rules });
	},
	bindRuleDelTap: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let rules = this.data.form.STAFF_RULES || [];
		rules.splice(idx, 1);
		this.setData({ 'form.STAFF_RULES': rules });
	},
	bindEditTap: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let staff = JSON.parse(JSON.stringify(this.data.list[idx]));
		this.setData({ form: staff });
		this._syncRoleNodes();
		wx.pageScrollTo({ scrollTop: 0 });
	},
	bindNewTap: function () {
		this.setData({ ruleText: '', form: { STAFF_NAME: '', STAFF_MOBILE: '', STAFF_BIND_CODE: '', STAFF_ROLES: [], STAFF_RULES: [], STAFF_STATUS: 1, STAFF_IS_ADMIN: 0 } });
		this._syncRoleNodes();
	},
	bindSubmitTap: async function () {
		await cloudHelper.callCloudSumbit('work/admin_staff_save', { staff: this.data.form }, { title: '保存中' });
		pageHelper.showSuccToast('已保存');
		this.bindNewTap();
		await this._loadList();
	},
});
