const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

function centText(value) {
	let cent = Number(value || 0);
	if (!Number.isFinite(cent)) cent = 0;
	return (cent / 100).toFixed(2);
}

Page({
	data: {
		month: '',
		data: null,
		currentText: '0.00',
		releaseText: '0.00',
		totalText: '0.00',
		deductText: '0.00',
		adjustText: '0.00',
		frozenRemainText: '0.00',
		items: [],
		frozenItems: [],
		payrollList: [],
		payable: [],
		adjustments: [],
	},
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		this.setData({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
	},
	onShow: async function () {
		await this._loadData();
	},
	onPullDownRefresh: async function () {
		await this._loadData();
		wx.stopPullDownRefresh();
	},
	bindMonthChange: async function (e) {
		this.setData({ month: e.detail.value });
		await this._loadData();
	},
	_normalizeData(data) {
		let payrollList = data && Array.isArray(data.payrollList) ? data.payrollList : [];
		payrollList = payrollList.map(item => Object.assign({}, item, { payrollNoteText: item.PAYROLL_NOTE || '已确认发放' }));
		this.setData({
			data,
			currentText: centText(data && data.currentCent),
			releaseText: centText(data && data.releaseCent),
			totalText: centText(data && data.totalCent),
			deductText: centText(data && data.deductCent),
			adjustText: centText(data && data.adjustCent),
			frozenRemainText: centText(data && data.frozenRemainCent),
			items: data && Array.isArray(data.items) ? data.items : [],
			frozenItems: data && Array.isArray(data.frozenItems) ? data.frozenItems : [],
			payrollList,
			payable: data && Array.isArray(data.payable) ? data.payable : [],
			adjustments: data && Array.isArray(data.adjustments) ? data.adjustments : [],
		});
	},
	_loadData: async function () {
		let data = await cloudHelper.callCloudData('work/my_payroll', { month: this.data.month }, { title: 'bar' });
		this._normalizeData(data);
	},
});
