const gameHelper = require('../../../../../helper/game_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');

const PET_KEY = 'WORK_PET_STATE';
const PET_TYPES = {
  cloud:  { label: '云朵小猫', career: '摄影助理', icon: 'cloud' },
  camera: { label: '相机小猫', career: '客户接待', icon: 'camera' },
  star:   { label: '星光小猫', career: '运营达人', icon: 'star' },
};

Page({
  data: {
    gameState: null,
    phaseInfo: null,
    expPercent: 0,
    petType: 'cloud',
    petTypeInfo: PET_TYPES.cloud,
    showOfflineReward: false,
    offlineReward: null,
    gameTypes: gameHelper.GAME_TYPES,
    loading: true,
  },

  onLoad() {
    this._loadState();
  },

  onShow() {
    this._loadState();
  },

  _loadState() {
    gameHelper.syncFromPetState();
    const state = gameHelper.getState();
    const phase = state.phase || 'intern';
    const phaseInfo = gameHelper.getPhaseInfo(phase);
    const expToNext = gameHelper.getExpToNextLevel(state.level);
    const expPercent = state.level >= 20 ? 100 : Math.min(100, Math.floor((state.exp / expToNext) * 100));

    let petType = 'cloud';
    try {
      const pet = wx.getStorageSync(PET_KEY);
      if (pet && pet.type) petType = pet.type;
    } catch (e) {}

    const offlineReward = gameHelper.calcOfflineReward(state);

    this.setData({
      gameState: state,
      phaseInfo,
      expPercent,
      petType,
      petTypeInfo: PET_TYPES[petType] || PET_TYPES.cloud,
      offlineReward,
      showOfflineReward: !!offlineReward && offlineReward.coins > 0,
      loading: false,
    });
  },

  onClaimOffline() {
    const state = this.data.gameState;
    const reward = this.data.offlineReward;
    if (!reward) return;
    gameHelper.addCoins(state, reward.coins);
    gameHelper.addExp(state, reward.exp);
    gameHelper.saveState(state);
    this.setData({ showOfflineReward: false });
    wx.showToast({ title: `领取 ${reward.coins} 金币`, icon: 'none' });
    this._loadState();
  },

  onCheckinTap() {
    const state = this.data.gameState;
    const result = gameHelper.claimDailyCheckin(state);
    if (result.ok) {
      wx.showToast({ title: `签到成功 +${result.coins}金币`, icon: 'none' });
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
    this._loadState();
  },

  onGameTap(e) {
    const gameId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `../cat_game_play/work_cat_game_play?id=${gameId}`,
    });
  },

  onShopTap() {
    wx.showToast({ title: '商店即将开放', icon: 'none' });
  },

  onDecorTap() {
    wx.showToast({ title: '装修即将开放', icon: 'none' });
  },

  onBackTap() {
    wx.navigateBack();
  },
});
