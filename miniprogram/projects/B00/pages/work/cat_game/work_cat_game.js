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
    // 动画相关
    displayCoins: 0,
    displayMaterials: 0,
    displayInspiration: 0,
    coinsBump: false,
    materialsBump: false,
    inspirationBump: false,
    floatPopup: { show: false, text: '', x: 0, y: 0 },
  },

  _timers: [],

  onLoad() {
    // onShow will also fire, so skip _loadState here to avoid double-load
  },

  onShow() {
    this._loadState();
  },

  onHide() {
    this._clearAllTimers();
  },

  onUnload() {
    this._clearAllTimers();
  },

  _clearAllTimers() {
    this._timers.forEach(id => clearTimeout(id));
    this._timers = [];
  },

  _setTimer(fn, delay) {
    const id = setTimeout(() => {
      // Remove from tracking array when it fires
      const idx = this._timers.indexOf(id);
      if (idx >= 0) this._timers.splice(idx, 1);
      fn();
    }, delay);
    this._timers.push(id);
    return id;
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

    // 记录旧值用于 countUp
    const oldState = this.data.gameState;

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

    // countUp 动画
    if (oldState) {
      this._animateCountUp('displayCoins', 'coinsBump', oldState.coins, state.coins);
      this._animateCountUp('displayMaterials', 'materialsBump', oldState.materials, state.materials);
      this._animateCountUp('displayInspiration', 'inspirationBump', oldState.inspiration, state.inspiration);
    } else {
      this.setData({
        displayCoins: state.coins,
        displayMaterials: state.materials,
        displayInspiration: state.inspiration,
      });
    }
  },

  _animateCountUp(displayKey, bumpKey, fromVal, toVal) {
    if (fromVal === toVal) {
      this.setData({ [displayKey]: toVal });
      return;
    }
    const diff = toVal - fromVal;
    const steps = Math.min(Math.abs(diff), 10);
    const stepVal = diff / steps;
    let step = 0;

    // 触发 bump 动画
    this.setData({ [bumpKey]: true });
    this._setTimer(() => this.setData({ [bumpKey]: false }), 400);

    const tick = () => {
      step++;
      if (step >= steps) {
        this.setData({ [displayKey]: toVal });
        return;
      }
      this.setData({ [displayKey]: Math.round(fromVal + stepVal * step) });
      this._setTimer(tick, 50);
    };
    this._setTimer(tick, 50);
  },

  _showFloatPopup(text) {
    const query = wx.createSelectorQuery();
    query.select('.status-panel').boundingClientRect();
    query.exec((res) => {
      if (!res || !res[0]) return;
      const rect = res[0];
      this.setData({
        floatPopup: {
          show: true,
          text,
          x: rect.left + rect.width / 2 - 30,
          y: rect.top - 10,
        }
      });
      this._setTimer(() => {
        this.setData({ 'floatPopup.show': false });
      }, 900);
    });
  },

  onClaimOffline() {
    if (!this.data.showOfflineReward) return;
    const state = this.data.gameState;
    const reward = this.data.offlineReward;
    if (!reward || reward.coins <= 0) return;
    // Immediately hide to prevent double-tap
    this.setData({ showOfflineReward: false });
    try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
    gameHelper.addCoins(state, reward.coins);
    gameHelper.addExp(state, reward.exp);
    gameHelper.saveState(state);
    wx.showToast({ title: `领取 ${reward.coins} 金币`, icon: 'none' });
    this._loadState();
  },

  onCheckinTap() {
    const state = this.data.gameState;
    const result = gameHelper.claimDailyCheckin(state);
    if (result.ok) {
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
      this._showFloatPopup('+20 金币');
      wx.showToast({ title: `签到成功 +${result.coins}金币`, icon: 'none' });
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
    this._loadState();
  },

  onGameTap(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
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
