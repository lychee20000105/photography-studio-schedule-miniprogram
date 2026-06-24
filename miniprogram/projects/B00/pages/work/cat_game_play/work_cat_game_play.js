const gameHelper = require('../../../../../helper/game_helper.js');

Page({
  data: {
    gameId: '',
    gameInfo: null,
    playing: false,
    score: 0,
    timeLeft: 180,
    timeDisplay: '3:00',
    timer: null,
    result: null,
  },

  onLoad(options) {
    const gameId = options.id || 'photo';
    const gameTypes = gameHelper.GAME_TYPES;
    const gameInfo = gameTypes.find(g => g.id === gameId) || gameTypes[0];
    this.setData({ gameId, gameInfo });
  },

  onUnload() {
    this._clearTimer();
  },

  onHide() {
    this._clearTimer();
  },

  onStartTap() {
    this.setData({ playing: true, score: 0, timeLeft: 180, result: null });
    this._startTimer();
  },

  _startTimer() {
    this._clearTimer();
    const timer = setInterval(() => {
      let timeLeft = this.data.timeLeft - 1;
      if (timeLeft <= 0) {
        this._clearTimer();
        this._endGame();
        return;
      }
      const timeMin = Math.floor(timeLeft / 60);
      const timeSec = timeLeft % 60;
      const timeDisplay = timeMin + ':' + (timeSec < 10 ? '0' : '') + timeSec;
      this.setData({ timeLeft, timeDisplay });
    }, 1000);
    const timeDisplay = '3:00';
    this.setData({ timer, timeDisplay });
  },

  _clearTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  _endGame() {
    const score = this.data.score;
    const gameId = this.data.gameId;

    let coins = 0, materials = 0, inspiration = 0, exp = 0;
    if (gameId === 'photo') {
      coins = Math.floor(score * 2);
      exp = Math.floor(score * 0.5);
    } else if (gameId === 'retouch') {
      materials = Math.floor(score * 1.5);
      exp = Math.floor(score * 0.4);
    } else if (gameId === 'post') {
      inspiration = Math.floor(score * 1.2);
      exp = Math.floor(score * 0.3);
    }

    const state = gameHelper.getState();
    if (coins > 0) gameHelper.addCoins(state, coins);
    if (materials > 0) gameHelper.addMaterials(state, materials);
    if (inspiration > 0) gameHelper.addInspiration(state, inspiration);
    if (exp > 0) gameHelper.addExp(state, exp);
    gameHelper.saveState(state);
    gameHelper.syncToPetState(state);
    gameHelper.addPlayLog(gameId, score, { coins, materials, inspiration, exp });

    this.setData({
      playing: false,
      result: { coins, materials, inspiration, exp, score },
    });
  },

  onCanvasTap() {
    if (!this.data.playing) return;
    this.setData({ score: this.data.score + 1 });
  },

  onResultTap() {
    this.setData({ result: null });
    wx.navigateBack();
  },
});
