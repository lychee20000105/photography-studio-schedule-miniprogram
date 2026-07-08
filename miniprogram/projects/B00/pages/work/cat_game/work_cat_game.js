const gameHelper = require('../../../../../helper/game_helper.js');

const PET_TYPES = {
  cloud: { label: '云朵小猫', career: '摄影店长' },
  camera: { label: '相机小猫', career: '客户接待' },
  star: { label: '星光小猫', career: '运营助手' },
};

Page({
  data: {
    gameState: null,
    phaseInfo: null,
    expPercent: 0,
    careScore: 0,
    petTypeInfo: PET_TYPES.cloud,
    gameTypes: gameHelper.GAME_TYPES,
    dailyTasks: [],
    showDailyTasks: true,
    offlineReward: null,
    showOfflineReward: false,
    floatText: '',
    floatShow: false,
  },

  _floatTimer: null,

  onShow() {
    this._loadState();
  },

  onUnload() {
    if (this._floatTimer) clearTimeout(this._floatTimer);
  },

  _loadState() {
    gameHelper.syncFromPetState();
    const state = gameHelper.getState();
    const phaseInfo = gameHelper.getPhaseInfo(state.phase);
    const expToNext = gameHelper.getExpToNextLevel(state.level);
    const expPercent = state.level >= 20 ? 100 : Math.floor((state.exp / expToNext) * 100);
    const offlineReward = gameHelper.calcOfflineReward(state);
    const dailyTasks = gameHelper.getDailyTaskStatus(state);
    let petType = 'cloud';
    try {
      const pet = wx.getStorageSync(gameHelper.PET_KEY);
      if (pet && pet.type) petType = pet.type;
    } catch (e) {}
    this.setData({
      gameState: state,
      phaseInfo,
      expPercent,
      careScore: gameHelper.calcCareScore(state),
      petTypeInfo: PET_TYPES[petType] || PET_TYPES.cloud,
      dailyTasks,
      offlineReward,
      showOfflineReward: !!offlineReward && offlineReward.coins > 0,
    });
  },

  _toast(title) {
    wx.showToast({ title, icon: 'none' });
  },

  _float(text) {
    if (this._floatTimer) clearTimeout(this._floatTimer);
    this.setData({ floatText: text, floatShow: true });
    this._floatTimer = setTimeout(() => this.setData({ floatShow: false }), 900);
  },

  onCareTap(e) {
    const action = e.currentTarget.dataset.action;
    const result = gameHelper.applyCareAction(this.data.gameState, action);
    if (!result.ok) {
      this._toast(result.msg);
      return;
    }
    try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
    this._float(`${result.action.name} +${result.action.exp}经验`);
    this._loadState();
  },

  onClaimOffline() {
    const reward = this.data.offlineReward;
    if (!reward) return;
    const state = this.data.gameState;
    gameHelper.addCoins(state, reward.coins);
    gameHelper.addExp(state, reward.exp);
    gameHelper.saveState(state);
    this._toast(`离线收益 +${reward.coins}金币`);
    this._loadState();
  },

  onCheckinTap() {
    const result = gameHelper.claimDailyCheckin(this.data.gameState);
    if (result.ok) {
      this._float(`签到 +${result.coins}金币`);
    } else {
      this._toast(result.msg);
    }
    this._loadState();
  },

  onToggleDailyTasks() {
    this.setData({ showDailyTasks: !this.data.showDailyTasks });
  },

  onClaimTask(e) {
    const result = gameHelper.claimDailyTask(this.data.gameState, e.currentTarget.dataset.id);
    if (result.ok) {
      this._toast('任务奖励已领取');
    } else {
      this._toast(result.msg);
    }
    this._loadState();
  },

  onGameTap(e) {
    const gameId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `../cat_game_play/work_cat_game_play?id=${gameId}` });
  },

  onBackTap() {
    wx.navigateBack();
  },
});
