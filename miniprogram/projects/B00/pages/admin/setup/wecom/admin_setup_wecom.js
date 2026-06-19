const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const constants = require('../../../../../../comm/constants.js');

Page({
	data: {
		isLoad: false,
		formWebhookUrl: '',
		savedWebhookUrl: ''
	},

	onLoad: async function () {
		if (!AdminBiz.isAdmin(this)) return;
		await this._loadDetail();
	},

	onPullDownRefresh: async function () {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	_loadDetail: async function () {
		let opts = {
			title: 'bar'
		};
		let params = {
			key: constants.SETUP_WECOM_WEBHOOK_URL
		};

		let webhookUrl = await cloudHelper.callCloudData('admin/setup_get', params, opts);
		this.setData({
			formWebhookUrl: webhookUrl || '',
			savedWebhookUrl: webhookUrl || '',
			isLoad: true
		});
	},

	bindFormSubmit: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let webhookUrl = (this.data.formWebhookUrl || '').trim();
		if (webhookUrl && !this._checkWebhook(webhookUrl)) {
			this.setData({
				formWebhookUrlFocus: '请填写企业微信群机器人 Webhook 地址'
			});
			return;
		}

		let params = {
			key: constants.SETUP_WECOM_WEBHOOK_URL,
			content: webhookUrl
		};

		try {
			await cloudHelper.callCloudSumbit('admin/setup_set', params);
			this.setData({
				savedWebhookUrl: webhookUrl
			});
			pageHelper.showSuccToast('保存成功');
		} catch (err) {
			console.error(err);
		}
	},

	bindTestTap: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let webhookUrl = (this.data.formWebhookUrl || '').trim();
		if (webhookUrl && !this._checkWebhook(webhookUrl)) {
			return pageHelper.showModal('请填写企业微信群机器人 Webhook 地址');
		}
		if (webhookUrl && webhookUrl !== (this.data.savedWebhookUrl || '').trim()) {
			return pageHelper.showModal('请先保存企业微信 Webhook 后再测试发送');
		}

		wx.showLoading({
			title: '发送中',
			mask: true
		});

		wx.cloud.callFunction({
			name: 'autoSendDaily',
			success: res => {
				wx.hideLoading();
				let result = res.result || {};
				if (result.code === 0) {
					pageHelper.showModal('测试发送成功，已推送今天档期。');
				} else {
					pageHelper.showModal(result.message || '测试发送失败，请检查 Webhook 地址');
				}
			},
			fail: err => {
				wx.hideLoading();
				console.error(err);
				pageHelper.showModal('测试发送失败，请确认 autoSendDaily 云函数已部署');
			}
		});
	},

	_checkWebhook(url) {
		return /^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=/.test(url);
	}
});
