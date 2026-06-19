const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../../biz/project_biz.js');

Page({
	data: {
		staffList: [],
		staffIndex: 0,
		currentStaffName: '选择员工',
		month: '',
		data: null,
		actualAmount: '',
		note: '',
	},
	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		this.setData({ month: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` });
		await this._loadStaff();
		await this._loadPayroll();
	},
	_loadStaff: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let list = await cloudHelper.callCloudData('admin/work_staff_list', {}, { title: 'bar' });
		list = (list || []).filter(item => item.STAFF_STATUS == 1);
		this.setData({ staffList: list, currentStaffName: list[0] ? list[0].STAFF_NAME : '选择员工' });
	},
	_loadPayroll: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		if (!this.data.staffList.length) return;
		let staff = this.data.staffList[this.data.staffIndex];
		let data = await cloudHelper.callCloudData('admin/work_payroll', { staffId: staff._id, month: this.data.month }, { title: 'bar' });
		this.setData({ data, actualAmount: data ? data.total : '' });
	},
	bindStaffChange: async function (e) {
		let staffIndex = Number(e.detail.value);
		this.setData({ staffIndex, currentStaffName: this.data.staffList[staffIndex].STAFF_NAME });
		await this._loadPayroll();
	},
	bindMonthChange: async function (e) {
		this.setData({ month: e.detail.value });
		await this._loadPayroll();
	},
	bindInput: function (e) {
		this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
	},
	bindPayTap: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		if (!this.data.data) return;
		let staff = this.data.staffList[this.data.staffIndex];
		await cloudHelper.callCloudSumbit('admin/work_payroll_pay', {
			staffId: staff._id,
			month: this.data.month,
			actualAmount: this.data.actualAmount,
			note: this.data.note,
		}, { title: '结算中' });
		pageHelper.showSuccToast('已发工资');
		await this._loadPayroll();
	},
});
