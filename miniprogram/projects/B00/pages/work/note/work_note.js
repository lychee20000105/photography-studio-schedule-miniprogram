const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const guestHelper = require('../../../../../helper/guest_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

function isAiNote(note = {}) {
	return String(note.NOTE_TITLE || '').indexOf('AI操作记录') === 0;
}

function splitNoteLines(title = '', content = '') {
	let text = String(content || '').replace(/\r/g, '\n').trim();
	if (!text) return ['暂无详细内容'];
	text = text
		.replace(/([。；;])\s*(?=\d+[.、])/g, '$1\n')
		.replace(/\s+(?=\d+[.、]\s*)/g, '\n')
		.replace(/([。；;])\s*(?=[\u4e00-\u9fa5]{2,8}[：:])/g, '$1\n');
	let raw = text.split(/\n+/).map(item => item.trim()).filter(Boolean);
	if (raw.length <= 1) raw = text.split(/[。；;]/).map(item => item.trim()).filter(Boolean);
	let lines = raw.map(item => item.replace(/^\d+[.、]\s*/, '').trim()).filter(Boolean);
	if (!lines.length) lines = [text];
	if (lines.length == 1 && title && lines[0] != title) {
		let line = lines[0];
		let parts = line.split(/[，,]/).map(item => item.trim()).filter(Boolean);
		if (parts.length >= 2) lines = parts;
	}
	return lines.slice(0, 6);
}

function decorateNotes(list = [], type = 'all') {
	return (list || [])
		.map(item => {
			let note = Object.assign({}, item || {});
			note.NOTE_IS_AI_RECORD = isAiNote(note);
			note.NOTE_AGENT_LINES = splitNoteLines(note.NOTE_TITLE, note.NOTE_CONTENT);
			note.NOTE_AGENT_SUMMARY = note.NOTE_AGENT_LINES[0] || '';
			return note;
		})
		.filter(note => {
			if (type == 'ai') return note.NOTE_IS_AI_RECORD;
			return !note.NOTE_IS_AI_RECORD;
		});
}

Page({
	data: {
		isGuest: false,
		type: 'all',
		list: [],
	},
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
	},
	onShow: async function () {
		await this._loadList();
	},
	onPullDownRefresh: async function () {
		await this._loadList();
		wx.stopPullDownRefresh();
	},
	_loadList: async function () {
		if (guestHelper.isGuest()) {
			this.setData({ isGuest: true, list: decorateNotes(guestHelper.getNotes(this.data.type), this.data.type) });
			return;
		}
		let list = await cloudHelper.callCloudData('work/note_list', { type: this.data.type }, { title: 'bar' });
		this.setData({ isGuest: false, list: decorateNotes(list || [], this.data.type) });
	},
	bindTypeTap: async function (e) {
		this.setData({ type: e.currentTarget.dataset.type });
		await this._loadList();
	},
	url: function (e) {
		if (this.data.isGuest) return guestHelper.showReadonlyTip();
		if (Number(e.currentTarget.dataset.readonly || 0)) return;
		pageHelper.url(e, this);
	},
});
