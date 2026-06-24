const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const contentCheckHelper = require('../../../../../helper/content_check_helper.js');
const dateHelper = require('../../../../../helper/date_helper.js');
const perf = require('../../../../../helper/perf_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

const PAYMENT_TYPE_OPTIONS = [
	{ label: '定金', value: 'deposit', direction: 'income', baseType: 'shoot' },
	{ label: '尾款', value: 'final', direction: 'income', baseType: 'shoot' },
	{ label: '全款', value: 'supplement', direction: 'income', baseType: 'all' },
	{ label: '加选/产品', value: 'extra', direction: 'income', baseType: 'extra' },
	{ label: '产品', value: 'product', direction: 'income', baseType: 'extra' },
	{ label: '退款', value: 'refund', direction: 'refund', baseType: 'all' },
	{ label: '冲减', value: 'adjust', direction: 'adjust', baseType: 'all' },
];
const PAYMENT_BASE_TYPE_OPTIONS = [
	{ label: '拍摄基数', value: 'shoot' },
	{ label: '加选产品', value: 'extra' },
	{ label: '整单', value: 'all' },
];

Page({
	data: {
		id: '',
		isSaving: false,
		canFull: false,
		canEdit: false,
		isJoining: false,
		options: null,
		paymentTypeOptions: PAYMENT_TYPE_OPTIONS,
		paymentBaseTypeOptions: PAYMENT_BASE_TYPE_OPTIONS,
		imgList: [],
		skeletonRows: [
			{ avatar: false },
			{ avatar: false },
			{ avatar: false },
			{ avatar: false },
			{ avatar: false },
		],
		order: {
			ORDER_DATE: '',
			ORDER_TIME: '',
			ORDER_END_TIME: '',
			ORDER_TYPE_ID: '',
			ORDER_TYPE_NAME: '其他',
			ORDER_TYPE_COLOR: '#49cdbf',
			ORDER_PROGRESS: 10,
			ORDER_CUSTOMER_NAME: '',
			ORDER_CUSTOMER_MOBILE: '',
			ORDER_SOURCE: '',
			ORDER_CONTENT: '',
			ORDER_PLACE: '',
			ORDER_IS_OLD_CUSTOMER: 0,
			ORDER_AMOUNT: '',
			ORDER_DEPOSIT: '',
			ORDER_FINAL: '',
			ORDER_EXTRA: '',
			ORDER_PAYMENTS: [],
			ORDER_PARTICIPANTS: [],
			ORDER_ATTACHMENTS: [],
		},
	},

	onLoad: async function (options) {
		this._perfTimer = perf.startTimer('order_edit:onLoad');
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let id = options.id || '';
		this.setData({ id });
		await this._loadOptions();
		if (id) await this._loadDetail();
		else {
			let day = options.day || wx.getStorageSync('WORK_ADD_DAY') || '';
			let data = {
				canFull: true,
				canEdit: true,
			};
			if (day) data['order.ORDER_DATE'] = day;
			this.setData(data);
			perf.endTimer(this._perfTimer); this._perfTimer = null;
		}
	},

	_today() {
		return dateHelper.today();
	},

	_loadOptions: async function () {
		let data = await cloudHelper.callCloudData('work/options', {}, { title: 'bar' });
		if (data) this.setData({ options: data });
	},

	_loadDetail: async function () {
		let order = await perf.trackQuery('order_edit:_loadDetail', () => cloudHelper.callCloudData('work/order_detail', { id: this.data.id }, { title: '加载中' }));
		if (this._perfTimer) { perf.endTimer(this._perfTimer); this._perfTimer = null; }
		if (!order) return;
		let canFull = !!order.canFull;
		let canEdit = !!order.canEdit;
		order.ORDER_PAYMENTS = this._normalizePayments(order.ORDER_PAYMENTS || []);
		order.ORDER_PARTICIPANTS = this._normalizeParticipants(order.ORDER_PARTICIPANTS || []);
		this.setData({
			order,
			canFull,
			canEdit,
			imgList: order.ORDER_ATTACHMENTS || [],
		});
	},

	_normalizePayments(list) {
		return (list || []).map((item, idx) => {
			item = Object.assign({}, item || {});
			item.clientKey = item.clientKey || item.PAYMENT_CLIENT_KEY || item._id || item.PAYMENT_ID || ('p_old_' + idx);
			item.type = item.type || item.PAYMENT_TYPE || 'deposit';
			item.direction = item.direction || item.PAYMENT_DIRECTION || 'income';
			item.amount = item.amount !== undefined && item.amount !== null && String(item.amount) !== '' ? item.amount : (item.PAYMENT_AMOUNT || '');
			item.date = item.date || item.PAYMENT_DATE || item.PAYMENT_PAY_DATE || this._today();
			item.baseType = item.baseType || item.PAYMENT_BASE_TYPE || 'shoot';
			item.note = item.note !== undefined ? item.note : (item.PAYMENT_NOTE || item.PAYMENT_REMARK || '');
			item.isLocked = item.PAYMENT_IS_LOCKED == 1 || item.isLocked == 1;
			let typeIndex = PAYMENT_TYPE_OPTIONS.findIndex(opt => opt.value == item.type);
			if (typeIndex < 0) typeIndex = 0;
			let typeOption = PAYMENT_TYPE_OPTIONS[typeIndex];
			let baseTypeIndex = PAYMENT_BASE_TYPE_OPTIONS.findIndex(opt => opt.value == item.baseType);
			if (baseTypeIndex < 0) {
				item.baseType = typeOption.baseType || 'shoot';
				baseTypeIndex = PAYMENT_BASE_TYPE_OPTIONS.findIndex(opt => opt.value == item.baseType);
			}
			if (baseTypeIndex < 0) baseTypeIndex = 0;
			item.typeIndex = typeIndex;
			item.typeLabel = typeOption.label;
			item.direction = typeOption.direction;
			item.directionLabel = item.direction == 'refund' ? '退款' : (item.direction == 'adjust' ? '冲减' : '收入');
			item.baseTypeIndex = baseTypeIndex;
			item.baseTypeLabel = PAYMENT_BASE_TYPE_OPTIONS[baseTypeIndex].label;
			return item;
		});
	},

	_normalizeParticipants(list) {
		return (list || []).map((item, idx) => {
			item = Object.assign({}, item || {});
			item.id = item.id || item.participantId || item.staffId || ('part_' + Date.now() + '_' + idx);
			return item;
		});
	},

	bindInput: function (e) {
		let field = e.currentTarget.dataset.field;
		this.setData({
			['order.' + field]: e.detail.value,
		});
	},

	bindDateChange: function (e) {
		this.setData({ 'order.ORDER_DATE': e.detail.value });
	},

	bindTypeChange: function (e) {
		let type = this.data.options.types[e.detail.value];
		this.setData({
			'order.ORDER_TYPE_ID': type._id,
			'order.ORDER_TYPE_NAME': type.TYPE_NAME,
			'order.ORDER_TYPE_COLOR': type.TYPE_COLOR,
		});
	},

	bindProgressChange: function (e) {
		let item = this.data.options.progressOptions[e.detail.value];
		this.setData({ 'order.ORDER_PROGRESS': item.value });
	},

	bindSourceChange: function (e) {
		this.setData({ 'order.ORDER_SOURCE': this.data.options.sources[e.detail.value] });
	},

	bindOldChange: function (e) {
		this.setData({ 'order.ORDER_IS_OLD_CUSTOMER': e.detail.value ? 1 : 0 });
	},

	bindAddPaymentTap: function () {
		let list = this.data.order.ORDER_PAYMENTS || [];
		let today = this._today();
		let option = PAYMENT_TYPE_OPTIONS[0];
		let baseTypeIndex = PAYMENT_BASE_TYPE_OPTIONS.findIndex(opt => opt.value == option.baseType);
		if (baseTypeIndex < 0) baseTypeIndex = 0;
		list.push({
			clientKey: 'p_' + Date.now() + '_' + list.length,
			type: option.value,
			typeIndex: 0,
			typeLabel: option.label,
			direction: option.direction,
			directionLabel: '收入',
			amount: '',
			date: today,
			baseType: PAYMENT_BASE_TYPE_OPTIONS[baseTypeIndex].value,
			baseTypeIndex,
			baseTypeLabel: PAYMENT_BASE_TYPE_OPTIONS[baseTypeIndex].label,
			note: '',
			isLocked: false,
		});
		this.setData({ 'order.ORDER_PAYMENTS': list });
	},

	bindPaymentInput: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let field = e.currentTarget.dataset.field;
		let list = this.data.order.ORDER_PAYMENTS || [];
		if (!list[idx] || list[idx].isLocked || list[idx].PAYMENT_IS_LOCKED == 1) return;
		this.setData({ ['order.ORDER_PAYMENTS[' + idx + '].' + field]: e.detail.value });
	},

	bindPaymentTypeChange: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let optIdx = Number(e.detail.value || 0);
		let option = PAYMENT_TYPE_OPTIONS[optIdx] || PAYMENT_TYPE_OPTIONS[0];
		let list = this.data.order.ORDER_PAYMENTS || [];
		if (!list[idx] || list[idx].isLocked || list[idx].PAYMENT_IS_LOCKED == 1) return;
		let baseTypeIndex = PAYMENT_BASE_TYPE_OPTIONS.findIndex(opt => opt.value == option.baseType);
		if (baseTypeIndex < 0) baseTypeIndex = 0;
		list[idx].type = option.value;
		list[idx].typeIndex = optIdx;
		list[idx].typeLabel = option.label;
		list[idx].direction = option.direction;
		list[idx].directionLabel = option.direction == 'refund' ? '退款' : (option.direction == 'adjust' ? '冲减' : '收入');
		list[idx].baseType = PAYMENT_BASE_TYPE_OPTIONS[baseTypeIndex].value;
		list[idx].baseTypeIndex = baseTypeIndex;
		list[idx].baseTypeLabel = PAYMENT_BASE_TYPE_OPTIONS[baseTypeIndex].label;
		this.setData({ 'order.ORDER_PAYMENTS': list });
	},

	bindPaymentBaseTypeChange: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let optIdx = Number(e.detail.value || 0);
		let option = PAYMENT_BASE_TYPE_OPTIONS[optIdx] || PAYMENT_BASE_TYPE_OPTIONS[0];
		let list = this.data.order.ORDER_PAYMENTS || [];
		if (!list[idx] || list[idx].isLocked || list[idx].PAYMENT_IS_LOCKED == 1) return;
		list[idx].baseType = option.value;
		list[idx].baseTypeIndex = optIdx;
		list[idx].baseTypeLabel = option.label;
		this.setData({ 'order.ORDER_PAYMENTS': list });
	},

	bindDelPaymentTap: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let list = this.data.order.ORDER_PAYMENTS || [];
		let item = list[idx];
		if (!item) return;
		if (item.isLocked || item.PAYMENT_IS_LOCKED == 1) return pageHelper.showModal('该收款已锁定，不能删除');
		if (item._id || item.PAYMENT_ID) {
			item.IS_DELETE = 1;
			item.PAYMENT_STATUS = 20;
			list[idx] = item;
		} else {
			list.splice(idx, 1);
		}
		this.setData({ 'order.ORDER_PAYMENTS': list });
	},

	bindJoinParticipantTap: async function () {
		if (this.data.isJoining) return;
		this.setData({ isJoining: true });
		try {
			await cloudHelper.callCloudSumbit('work/order_join', { id: this.data.id }, { title: '加入中' });
			pageHelper.showSuccToast('已加入参与人');
			await this._loadDetail();
		} catch (err) {
			console.error(err);
		} finally {
			this.setData({ isJoining: false });
		}
	},

	bindAddParticipantTap: function () {
		let list = this.data.order.ORDER_PARTICIPANTS || [];
		list.push({
			id: 'part_' + Date.now() + '_' + list.length,
			staffId: '',
			staffName: '请选择员工',
			roleName: this.data.options.roles[0],
			calcMode: 'percent',
			manualAmount: 0,
		});
		this.setData({ 'order.ORDER_PARTICIPANTS': list });
	},

	bindDelParticipantTap: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let list = this.data.order.ORDER_PARTICIPANTS || [];
		list.splice(idx, 1);
		this.setData({ 'order.ORDER_PARTICIPANTS': list });
	},

	bindPartStaffChange: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let staff = this.data.options.staffList[e.detail.value];
		let list = this.data.order.ORDER_PARTICIPANTS || [];
		list[idx].staffId = staff._id;
		list[idx].staffName = staff.STAFF_NAME;
		if (staff.STAFF_ROLES && staff.STAFF_ROLES.length && !staff.STAFF_ROLES.includes(list[idx].roleName)) {
			list[idx].roleName = staff.STAFF_ROLES[0];
		}
		this.setData({ 'order.ORDER_PARTICIPANTS': list });
	},

	bindPartRoleChange: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let list = this.data.order.ORDER_PARTICIPANTS || [];
		list[idx].roleName = this.data.options.roles[e.detail.value];
		this.setData({ 'order.ORDER_PARTICIPANTS': list });
	},

	bindPartModeChange: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let list = this.data.order.ORDER_PARTICIPANTS || [];
		list[idx].calcMode = this.data.options.calcModes[e.detail.value].value;
		this.setData({ 'order.ORDER_PARTICIPANTS': list });
	},

	bindPartManualInput: function (e) {
		let idx = e.currentTarget.dataset.idx;
		this.setData({ ['order.ORDER_PARTICIPANTS[' + idx + '].manualAmount']: e.detail.value });
	},

	bindChooseImageTap: function () {
		wx.chooseMedia({
			count: 9,
			mediaType: ['image'],
			sizeType: ['compressed'],
			sourceType: ['album', 'camera'],
			success: async res => {
				let addImgs = [];
				wx.showLoading({
					title: '图片校验中',
					mask: true
				});

				for (let k = 0; k < res.tempFiles.length; k++) {
					let path = res.tempFiles[k].tempFilePath;
					let size = res.tempFiles[k].size;

					if (!contentCheckHelper.imgTypeCheck(path)) {
						wx.hideLoading();
						return pageHelper.showNoneToast('只能上传png、jpg、jpeg格式', 3000);
					}

					let maxSize = 20;
					let imageMaxSize = 1024 * 1000 * maxSize;
					if (!contentCheckHelper.imgSizeCheck(size, imageMaxSize)) {
						wx.hideLoading();
						return pageHelper.showModal('图片大小不能超过 ' + maxSize + '兆');
					}

					let check = await contentCheckHelper.imgCheck(path);
					if (!check) {
						wx.hideLoading();
						return pageHelper.showNoneToast('存在不合适的图片, 已屏蔽', 3000);
					}

					addImgs.push(path);
				}

				wx.hideLoading();
				this.setData({ imgList: this.data.imgList.concat(addImgs) });
			},
		});
	},

	bindDelImageTap: function (e) {
		let idx = e.currentTarget.dataset.idx;
		let imgList = this.data.imgList;
		imgList.splice(idx, 1);
		this.setData({ imgList });
	},

	bindPreviewImageTap: function (e) {
		let src = e.currentTarget.dataset.src || '';
		if (!src) return;
		let urls = (this.data.imgList || []).filter(item => item);
		wx.previewImage({
			current: src,
			urls: urls.length ? urls : [src],
		});
	},

	_prepareOrder: async function () {
		let order = Object.assign({}, this.data.order);
		order._id = this.data.id;
		order.ORDER_DATE = String(order.ORDER_DATE || '').trim();
		order.ORDER_PAYMENTS = (order.ORDER_PAYMENTS || []).map(item => {
			item = Object.assign({}, item || {});
			return {
				_id: item._id || '',
				PAYMENT_ID: item.PAYMENT_ID || '',
				PAYMENT_CLIENT_KEY: item.PAYMENT_CLIENT_KEY || item.clientKey || '',
				clientKey: item.PAYMENT_CLIENT_KEY || item.clientKey || '',
				PAYMENT_TYPE: item.PAYMENT_TYPE || item.type || 'deposit',
				type: item.PAYMENT_TYPE || item.type || 'deposit',
				PAYMENT_DIRECTION: item.PAYMENT_DIRECTION || item.direction || 'income',
				direction: item.PAYMENT_DIRECTION || item.direction || 'income',
				PAYMENT_BASE_TYPE: item.PAYMENT_BASE_TYPE || item.baseType || 'shoot',
				baseType: item.PAYMENT_BASE_TYPE || item.baseType || 'shoot',
				PAYMENT_AMOUNT: item.PAYMENT_AMOUNT !== undefined && item.PAYMENT_AMOUNT !== null && String(item.PAYMENT_AMOUNT) !== '' ? item.PAYMENT_AMOUNT : item.amount,
				amount: item.amount !== undefined && item.amount !== null && String(item.amount) !== '' ? item.amount : item.PAYMENT_AMOUNT,
				PAYMENT_DATE: item.PAYMENT_DATE || item.PAYMENT_PAY_DATE || item.date || '',
				date: item.date || item.PAYMENT_DATE || item.PAYMENT_PAY_DATE || '',
				PAYMENT_NOTE: item.PAYMENT_NOTE !== undefined ? item.PAYMENT_NOTE : (item.note || ''),
				note: item.note !== undefined ? item.note : (item.PAYMENT_NOTE || ''),
				PAYMENT_IS_LOCKED: item.PAYMENT_IS_LOCKED || 0,
				IS_DELETE: item.IS_DELETE || 0,
				PAYMENT_STATUS: item.PAYMENT_STATUS || '',
				PAYMENT_VOID_REASON: item.PAYMENT_VOID_REASON || '',
			};
		});
		let imgList = this.data.imgList || [];
		order.ORDER_ATTACHMENTS = await cloudHelper.transTempPics(imgList, 'work/order/', this.data.id || '');
		return order;
	},

	_validateOrder: function (order) {
		if (!String(order.ORDER_CUSTOMER_NAME || '').trim()) {
			pageHelper.showModal('请填写客户名称');
			return false;
		}
		return true;
	},

	bindSubmitTap: async function () {
		if (this.data.isSaving) return;
		if (!this._validateOrder(this.data.order)) return;

		this.setData({ isSaving: true });
		try {
			let order = await this._prepareOrder();
			let res = await cloudHelper.callCloudSumbit('work/order_save', { order }, { title: '保存中' });
			let id = res.data.id;
			this.setData({ id });
			this._backToCalendar(order.ORDER_DATE || '');
		} catch (err) {
			console.error(err);
		} finally {
			this.setData({ isSaving: false });
		}
	},

	_backToCalendar: function (day = '') {
		if (day) wx.setStorageSync('WORK_CALENDAR_DAY', day);
		wx.showToast({
			title: '已保存',
			icon: 'success',
			duration: 700,
			success() {
				setTimeout(() => {
					wx.switchTab({
						url: '/projects/B00/pages/work/calendar/work_calendar',
					});
				}, 700);
			},
		});
	},

	bindCompleteTap: async function () {
		if (!this.data.id) {
			let order = await this._prepareOrder();
			let res = await cloudHelper.callCloudSumbit('work/order_save', { order }, { title: '保存中' });
			this.setData({ id: res.data.id });
		}
		await cloudHelper.callCloudSumbit('work/order_complete', { id: this.data.id }, { title: '提交审核' });
		pageHelper.showSuccToast('已提交审核');
		await this._loadDetail();
	},

	bindCancelTap: function () {
		wx.showModal({
			title: '取消订单',
			content: '确认取消该订单吗？若已有收款，请先录入退款/冲减或作废未锁定收款。',
			success: async res => {
				if (!res.confirm) return;
				try {
					let ret = await cloudHelper.callCloudSumbit('work/order_cancel', { id: this.data.id, reason: '取消订单' }, { title: '处理中' });
					let data = ret && ret.data ? ret.data : ret;
					if (data && data.needFinance) return pageHelper.showModal(data.message || '该订单仍有收款余额，请先处理退款/冲减');
					pageHelper.showSuccToastReturn('已取消');
				} catch (err) {
					console.error(err);
					pageHelper.showModal('取消失败。若已有收款，请先录入退款/冲减或作废未锁定收款后再取消。');
				}
			},
		});
	},

	bindRestoreTap: async function () {
		await cloudHelper.callCloudSumbit('work/order_restore', { id: this.data.id }, { title: '处理中' });
		pageHelper.showSuccToast('已恢复');
		await this._loadDetail();
	},

	url: function (e) {
		pageHelper.url(e, this);
	},
});
