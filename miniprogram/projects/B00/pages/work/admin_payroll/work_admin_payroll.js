const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

function centText(value) {
	let cent = Number(value || 0);
	if (!Number.isFinite(cent)) cent = 0;
	return (cent / 100).toFixed(2);
}

Page({
	data: {
		staffList: [],
		staffIndex: 0,
		currentStaffName: '选择员工',
		hasStaff: false,
		month: '',
		data: null,
		note: '',
		currentText: '0.00',
		releaseText: '0.00',
		totalText: '0.00',
		items: [],
		frozenItems: [],
		itemsEmpty: true,
		frozenEmpty: true,
		isLegacy: false,
		canPay: false,
	},

	onLoad: async function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		this.setData({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
		await this._loadStaff();
		await this._loadData();
	},

	onPullDownRefresh: async function () {
		await this._loadData();
		wx.stopPullDownRefresh();
	},

	_syncStaffView() {
		let staffList = this.data.staffList || [];
		let staffIndex = Number(this.data.staffIndex || 0);
		if (staffIndex < 0 || staffIndex >= staffList.length) staffIndex = 0;
		let staff = staffList[staffIndex] || null;
		this.setData({
			staffIndex,
			hasStaff: !!staff,
			currentStaffName: staff ? (staff.STAFF_NAME || '未命名员工') : '暂无可发工资员工',
		});
		return staff;
	},

	_normalizePreview(data) {
		data = data || null;
		let items = data && Array.isArray(data.items) ? data.items : [];
		let frozenItems = data && Array.isArray(data.frozenItems) ? data.frozenItems : [];
		let isLegacy = !!(data && data.legacy);
		this.setData({
			data,
			isLegacy,
			currentText: centText(data && data.currentCent),
			releaseText: centText(data && data.releaseCent),
			totalText: centText(data && data.totalCent),
			items,
			frozenItems,
			itemsEmpty: items.length === 0,
			frozenEmpty: frozenItems.length === 0,
			canPay: !!(data && !isLegacy && Array.isArray(data.commissionIds) && data.commissionIds.length > 0),
		});
	},

	_loadStaff: async function () {
		let list = await cloudHelper.callCloudData('work/admin_staff_options', { status: 1 }, { title: 'bar' });
		this.setData({ staffList: list || [] });
		this._syncStaffView();
	},

	_loadData: async function () {
		let staff = this._syncStaffView();
		if (!staff) {
			this._normalizePreview(null);
			return;
		}
		let data = await cloudHelper.callCloudData('work/admin_payroll_preview', { staffId: staff._id, month: this.data.month }, { title: 'bar' });
		this._normalizePreview(data);
	},

	bindStaffChange: async function (e) {
		this.setData({ staffIndex: Number(e.detail.value) });
		await this._loadData();
	},

	bindMonthChange: async function (e) {
		this.setData({ month: e.detail.value });
		await this._loadData();
	},

	bindInput: function (e) {
		this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
	},

	bindPayTap: function () {
		if (!this.data.data || this.data.isLegacy) return pageHelper.showModal('旧月份请用旧后台工资入口');
		if (!this.data.canPay) return pageHelper.showModal('没有待发提成');
		let staff = this.data.staffList[this.data.staffIndex];
		if (!staff) return pageHelper.showModal('请选择员工');
		wx.showModal({
			title: '确认发工资',
			content: `确认给${staff.STAFF_NAME}发放 ${this.data.month} 工资 ¥${this.data.totalText}？发放后相关提成和收款会锁定。`,
			success: async r => {
				if (!r.confirm) return;
				await cloudHelper.callCloudSumbit('work/admin_payroll_pay', {
					staffId: staff._id,
					month: this.data.month,
					note: this.data.note,
					expectedCommissionIds: this.data.data.commissionIds,
					expectedTotalCent: this.data.data.totalCent,
					previewHash: this.data.data.previewHash,
				}, { title: '发放中' });
				pageHelper.showSuccToast('已发工资');
				await this._loadData();
			},
		});
	},
});
