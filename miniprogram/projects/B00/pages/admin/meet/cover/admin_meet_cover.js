const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const dataHelper = require('../../../../../../helper/data_helper.js');
const contentCheckHelper = require('../../../../../../helper/content_check_helper.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {

		title: '',
		status: '',

		mode: '',
		desc: '',
		pic: '',

	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		let parent = pageHelper.getPrevPage(2);
		if (!parent) return; 

		let formStyleSet = parent.data.formStyleSet;
		let title = parent.data.formTitle;
		let status = parent.data.beginSetDesc;
		this.setData({ 
			title,
			status,
			...formStyleSet
		});
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {

	},

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
	onPullDownRefresh: function () {

	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom: function () {

	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	bindChooseImgTap: function (e) {
		let that = this;
		wx.chooseMedia({
			count: 1,
			mediaType: ['image'],
			sizeType: ['compressed'], //可以指定是原图还是压缩图，默认二者都有
			sourceType: ['album', 'camera'], //从相册选择
			success: async (res) => {
				let pic = res.tempFiles[0].tempFilePath;
				let size = res.tempFiles[0].size;
				wx.showLoading({
					title: '图片校验中',
					mask: true
				});

				if (!contentCheckHelper.imgTypeCheck(pic)) {
					wx.hideLoading();
					return pageHelper.showNoneToast('只能上传png、jpg、jpeg格式', 3000);
				}

				let maxSize = 20;
				let imageMaxSize = 1024 * 1000 * maxSize;
				if (!contentCheckHelper.imgSizeCheck(size, imageMaxSize)) {
					wx.hideLoading();
					return pageHelper.showModal('图片大小不能超过 ' + maxSize + '兆');
				}

				let check = await contentCheckHelper.imgCheck(pic);
				if (!check) {
					wx.hideLoading();
					return pageHelper.showNoneToast('存在不合适的图片, 已屏蔽', 3000);
				}

				wx.hideLoading();
				that.setData({
					pic
				});
			}
		});
	},
	catchDelImgTap: function (e) {
		let that = this;
		let callback = function () {
			that.setData({
				pic: ''
			});
		}
		pageHelper.showConfirm('确定要删除该图片吗？', callback);
	},

	bindSaveTap: function (e) {
		let parent = pageHelper.getPrevPage(2);
		if (!parent) return;

		if (!this.data.pic) return pageHelper.showModal('请上传封面图片');

		parent.setData({
			formStyleSet: {
				desc: dataHelper.fmtText(this.data.desc),
				pic: this.data.pic
			}
		});

		wx.navigateBack();

	}
})
