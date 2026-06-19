const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		content: '',
	},
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
	},
	bindInput: function (e) {
		this.setData({ content: e.detail.value });
	},
	bindSubmitTap: async function () {
		let content = String(this.data.content || '').trim();
		if (!content) return pageHelper.showModal('请先填写反馈内容');
		await cloudHelper.callCloudSumbit('work/feedback_submit', { content }, { title: '提交中' });
		pageHelper.showSuccToast('已提交');
		setTimeout(() => wx.navigateBack(), 700);
	},
});
