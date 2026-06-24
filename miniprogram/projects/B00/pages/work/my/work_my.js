const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const guestHelper = require('../../../../../helper/guest_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');
const versionInfo = require('../../../../../version.js');

const PET_KEY = 'WORK_PET_STATE';
const PET_TYPES = [
	{ label: '云朵小猫', value: 'cloud' },
	{ label: '相机小猫', value: 'camera' },
	{ label: '星光小猫', value: 'star' },
];

Page({
	data: {
		me: null,
		isGuest: false,
		mobile: '',
		code: '',
		pet: null,
		petTypes: PET_TYPES,
		petTypeIndex: 0,
		unreadCount: 0,
		versionInfo,
	},
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
	},
	onShow: async function () {
		await this._loadMe();
		await this._loadMessageSummary();
		this._loadPet();
	},
	_loadMe: async function () {
		if (guestHelper.isGuest()) {
			this.setData({
				isGuest: true,
				me: {
					isBind: false,
					isGuest: true,
					staff: guestHelper.getGuestStaff(),
				},
			});
			return;
		}
		let me = await cloudHelper.callCloudData('work/me', {}, { title: 'bar' });
		if (!me) me = { isBind: false };
		if (me && me.staff) me.staffInitial = me.staff.STAFF_NAME ? me.staff.STAFF_NAME.substr(0, 1) : '云';
		this.setData({ me, isGuest: false });
	},
	_loadMessageSummary: async function () {
		let me = this.data.me || {};
		if (this.data.isGuest || !me.isBind) {
			this.setData({ unreadCount: 0 });
			return;
		}
		try {
			let summary = await cloudHelper.callCloudData('work/message_summary', {}, { title: 'bar' });
			this.setData({ unreadCount: Number(summary && summary.unreadCount || 0) });
		} catch (err) {
			try {
				let list = await cloudHelper.callCloudData('work/messages', {}, { title: 'bar' });
				this.setData({ unreadCount: (list || []).filter(item => !item.MSG_IS_READ).length });
			} catch (e) {
				this.setData({ unreadCount: 0 });
			}
		}
	},
	_defaultPet() {
		return {
			enabled: true,
			type: 'cloud',
			level: 1,
			exp: 0,
			hunger: 70,
			health: 90,
			mood: 'happy',
			moodText: '状态很好',
			lastCareTime: Date.now(),
		};
	},
	_petWithText(pet) {
		pet = Object.assign(this._defaultPet(), pet || {});
		let idx = PET_TYPES.findIndex(item => item.value == pet.type);
		if (idx < 0) idx = 0;
		pet.typeText = PET_TYPES[idx].label;
		pet.statusText = pet.enabled ? '展示中' : '已关闭';
		pet.moodText = pet.moodText || (pet.health < 35 ? '有点不舒服' : (pet.hunger < 25 ? '有点饿' : '状态很好'));
		return { pet, idx };
	},
	_loadPet() {
		let ret = this._petWithText(wx.getStorageSync(PET_KEY) || {});
		wx.setStorageSync(PET_KEY, ret.pet);
		this.setData({ pet: ret.pet, petTypeIndex: ret.idx });
		this._refreshPetComponent();
	},
	_savePet(pet) {
		let ret = this._petWithText(pet);
		wx.setStorageSync(PET_KEY, ret.pet);
		this.setData({ pet: ret.pet, petTypeIndex: ret.idx });
		this._refreshPetComponent();
	},
	_refreshPetComponent() {
		let petCmpt = this.selectComponent('#workPet');
		if (petCmpt && petCmpt.refresh) petCmpt.refresh();
	},
	bindInput: function (e) {
		this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
	},
	bindBindTap: async function () {
		await cloudHelper.callCloudSumbit('work/bind_staff', {
			mobile: this.data.mobile,
			code: this.data.code,
		}, { title: '绑定中' });
		guestHelper.exitGuest();
		pageHelper.showSuccToast('绑定成功');
		await this._loadMe();
	},
	bindGuestTap: function () {
		guestHelper.enterGuest();
		this.setData({ isGuest: true });
		wx.switchTab({ url: '/projects/B00/pages/work/calendar/work_calendar' });
	},
	bindExitGuestTap: async function () {
		guestHelper.exitGuest();
		this.setData({ isGuest: false, me: null });
		await this._loadMe();
	},
	bindAdminTap: function () {
		wx.navigateTo({ url: '../admin_home/work_admin_home' });
	},
	bindPetSwitch: function (e) {
		let pet = Object.assign({}, this.data.pet || this._defaultPet());
		pet.enabled = !!e.detail.value;
		pet.moodText = pet.enabled ? '我回来啦' : '休息中';
		this._savePet(pet);
	},
	bindPetTypeChange: function (e) {
		let idx = Number(e.detail.value || 0);
		let pet = Object.assign({}, this.data.pet || this._defaultPet());
		pet.type = PET_TYPES[idx] ? PET_TYPES[idx].value : 'cloud';
		pet.mood = 'happy';
		pet.moodText = '换新造型啦';
		this._savePet(pet);
	},
	bindFeedPetTap: function () {
		let pet = Object.assign({}, this.data.pet || this._defaultPet());
		pet.hunger = Math.min(100, Number(pet.hunger || 0) + 22);
		pet.health = Math.min(100, Number(pet.health || 0) + 5);
		pet.exp = Number(pet.exp || 0) + 8;
		pet.mood = 'happy';
		pet.moodText = '吃饱了';
		this._savePet(pet);
		pageHelper.showSuccToast('已喂食');
	},
	bindCarePetTap: function () {
		let pet = Object.assign({}, this.data.pet || this._defaultPet());
		pet.health = Math.min(100, Number(pet.health || 0) + 18);
		pet.exp = Number(pet.exp || 0) + 6;
		pet.mood = 'happy';
		pet.moodText = '被照顾好了';
		this._savePet(pet);
		pageHelper.showSuccToast('已照顾');
	},
	bindCustomPetTap: function () {
		wx.navigateTo({ url: '../cat_game/work_cat_game' });
	},
	url: function (e) {
		pageHelper.url(e, this);
	},
});
