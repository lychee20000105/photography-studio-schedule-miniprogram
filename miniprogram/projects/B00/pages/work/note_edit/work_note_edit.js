const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		id: '',
		note: {
			NOTE_TYPE: 'personal',
			NOTE_TITLE: '',
			NOTE_CONTENT: '',
			NOTE_DATE: '',
		},
		types: [{ label: '个人', value: 'personal' }, { label: '团队', value: 'team' }],
	},
	onLoad: async function (options) {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let id = options.id || '';
		this.setData({ id });
		let d = new Date();
		this.setData({ 'note.NOTE_DATE': `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` });
		if (id) await this._loadDetail();
	},
	_loadDetail: async function () {
		let note = await cloudHelper.callCloudData('work/note_detail', { id: this.data.id }, { title: '加载中' });
		if (note) this.setData({ note });
	},
	bindInput: function (e) {
		this.setData({ ['note.' + e.currentTarget.dataset.field]: e.detail.value });
	},
	bindTypeChange: function (e) {
		this.setData({ 'note.NOTE_TYPE': this.data.types[e.detail.value].value });
	},
	bindSubmitTap: async function () {
		let note = Object.assign({}, this.data.note, { _id: this.data.id });
		await cloudHelper.callCloudSumbit('work/note_save', { note }, { title: '保存中' });
		pageHelper.showSuccToastReturn('已保存');
	},
});
