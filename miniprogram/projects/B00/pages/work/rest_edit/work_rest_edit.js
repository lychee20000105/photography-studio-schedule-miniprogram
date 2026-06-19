const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		rest: {
			REST_DATE: '',
			REST_TYPE: '休息',
			REST_REASON: '',
		},
		types: ['休息', '请假', '调休'],
	},
	onLoad: function (options) {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let d = new Date();
		let day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
		this.setData({ 'rest.REST_DATE': options.day || day });
	},
	bindDateChange: function (e) {
		this.setData({ 'rest.REST_DATE': e.detail.value });
	},
	bindTypeChange: function (e) {
		this.setData({ 'rest.REST_TYPE': this.data.types[e.detail.value] });
	},
	bindInput: function (e) {
		this.setData({ ['rest.' + e.currentTarget.dataset.field]: e.detail.value });
	},
	bindSubmitTap: async function () {
		await cloudHelper.callCloudSumbit('work/rest_save', { rest: this.data.rest }, { title: '提交中' });
		pageHelper.showSuccToastReturn('已提交');
	},
});
