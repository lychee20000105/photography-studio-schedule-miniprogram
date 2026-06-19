const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../../biz/project_biz.js');

Page({
	data: {
		roles: ['销售', '摄影', '摄像', '化妆', '选片', '后期', '助理', '运营'],
		modes: [{ label: '按比例', value: 'percent' }, { label: '固定金额', value: 'fixed' }, { label: '手动填写', value: 'manual' }, { label: '不计提成', value: 'none' }],
		roleNodes: [],
		list: [],
		form: { STAFF_NAME: '', STAFF_MOBILE: '', STAFF_BIND_CODE: '', STAFF_ROLES: [], STAFF_RULES: [], STAFF_STATUS: 1, STAFF_IS_ADMIN: 0 },
	},
	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		ProjectBiz.initPage(this, { isLoadSkin: true });
		this._syncRoleNodes();
		await this._loadList();
	},
	_loadList: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let list = await cloudHelper.callCloudData('admin/work_staff_list', {}, { title: 'bar' });
		list = (list || []).map(item => {
			item.ROLE_TEXT = (item.STAFF_ROLES || []).join('、');
			return item;
		});
		this.setData({ list: list || [] });
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
		this.setData({ form: { STAFF_NAME: '', STAFF_MOBILE: '', STAFF_BIND_CODE: '', STAFF_ROLES: [], STAFF_RULES: [], STAFF_STATUS: 1, STAFF_IS_ADMIN: 0 } });
		this._syncRoleNodes();
	},
	bindSubmitTap: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		await cloudHelper.callCloudSumbit('admin/work_staff_save', { staff: this.data.form }, { title: '保存中' });
		pageHelper.showSuccToast('已保存');
		await this._loadList();
	},
});
