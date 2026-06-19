const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const MeetBiz = require('../../../biz/meet_biz.js');
const ProjectBiz = require('../../../biz/project_biz.js');
const PassportBiz = require('../../../../../comm/biz/passport_biz.js');
const projectSetting = require('../../../public/project_setting.js');
const AdminBiz = require('../../../../../comm/biz/admin_biz.js');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		isLogin: true,

		forms: [],
		isAdminAdd: false,
		isSubmitting: false,
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		ProjectBiz.initPage(this);
		if (!pageHelper.getOptions(this, options)) return;
		if (!pageHelper.getOptions(this, options, 'timeMark')) return;

		if (options && options.adminAdd == '1') {
			if (!AdminBiz.isAdmin(this)) return;
			this.setData({
				isAdminAdd: true
			});
		}

		if (!this.data.isAdminAdd && projectSetting.MEET_JOIN_MUST_LOGIN && !await PassportBiz.loginMustBackWin(this)) return;

		this._loadDetail();

	},

	_loadDetail: async function () {
		let id = this.data.id;
		if (!id) return;

		let timeMark = this.data.timeMark;
		if (!timeMark) return;

		let params = {
			meetId: id,
			timeMark
		};
		let opt = {
			title: 'bar'
		};
		let meet = await cloudHelper.callCloudData('meet/detail_for_join', params, opt);
		if (!meet) {
			this.setData({
				isLoad: null
			})
			return;
		}


		this.setData({
			isLoad: true,
			meet,
		});

	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () { },

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {

	},

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () {

	},

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () {

	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: async function () {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},



	url: function (e) {
		pageHelper.url(e, this);
	},

	onPageScroll: function (e) {
		// 回页首按钮
		pageHelper.showTopBtn(e, this);

	},

	bindCheckTap: async function (e) {
		if (this.data.isSubmitting) return;
		this.selectComponent("#form-show").checkForms();
	},

	bindSubmitCmpt: async function (e) {
		if (this.data.isSubmitting) return;
		this.setData({
			isSubmitting: true
		});
		let isSubmitSucc = false;
		let forms = e.detail;

		let callback = async () => {
			try {
				let opts = {
					title: '提交中'
				}
				let params = {
					meetId: this.data.id,
					timeMark: this.data.timeMark,
					forms
				}
				let route = this.data.isAdminAdd ? 'admin/meet_join_insert' : 'meet/join';
				await cloudHelper.callCloudSumbit(route, params, opts).then(res => {
					isSubmitSucc = true;
					let content = this.data.isAdminAdd ? '订单添加成功！' : '预约成功！'

					let joinId = res.data.joinId;
					wx.showModal({
						title: '温馨提示',
						showCancel: false,
						content,
						success: () => {
							let ck = () => {
								if (this.data.isAdminAdd) {
									wx.navigateBack({
										fail: () => {
											this.setData({
												isSubmitting: false
											});
										}
									});
								} else {
									wx.reLaunch({
										url: pageHelper.fmtURLByPID('/pages/meet/my_join_detail/meet_my_join_detail?flag=home&id=' + joinId),
										fail: () => {
											this.setData({
												isSubmitting: false
											});
										}
									})
								}
							}
							ck();
						}
					})
				})
			} catch (err) {
				console.log(err);
			};
		}

		try {
			if (this.data.isAdminAdd) {
				await callback();
			} else {
			// 消息订阅
				await MeetBiz.subscribeMessageMeet(callback);
			}
		} finally {
			if (!isSubmitSucc) {
				this.setData({
					isSubmitting: false
				});
			}
		}

	}
})
