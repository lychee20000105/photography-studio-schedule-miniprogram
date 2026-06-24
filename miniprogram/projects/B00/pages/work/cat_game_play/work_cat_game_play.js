const gameHelper = require('../../../../../helper/game_helper.js');

Page({
  data: {
    gameId: '',
    gameInfo: null,
    playing: false,
    score: 0,
    timeLeft: 180,
    timeDisplay: '3:00',
    result: null,
    // 新增动效状态
    countdown: 0,
    countdownAnim: false,
    screenShake: false,
    flashShow: false,
    particles: [],
    _particleId: 0,
  },

  _timer: null,
  _timers: [],
  _gameEnded: false,

  onLoad(options) {
    const gameId = options.id || 'photo';
    const gameTypes = gameHelper.GAME_TYPES;
    const gameInfo = gameTypes.find(g => g.id === gameId) || gameTypes[0];
    this.setData({ gameId, gameInfo });
  },

  onUnload() {
    this._clearAllResources();
  },

  onHide() {
    // If a game is in progress, end it immediately on hide to prevent stale state
    if (this.data.playing) {
      this._clearAllResources();
      this._endGame();
    }
  },

  _clearAllTimers() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._timers.forEach(id => clearTimeout(id));
    this._timers = [];
  },

  _clearAllResources() {
    this._clearAllTimers();
  },

  _setTimer(fn, delay) {
    const id = setTimeout(() => {
      const idx = this._timers.indexOf(id);
      if (idx >= 0) this._timers.splice(idx, 1);
      fn();
    }, delay);
    this._timers.push(id);
    return id;
  },

  onStartTap() {
    try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
    this._startCountdown();
  },

  _startCountdown() {
    this._gameEnded = false;
    this._clearAllTimers();
    this.setData({ countdown: 3, countdownAnim: true });
    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}

    const tick = (n) => {
      if (n <= 0) {
        this.setData({ countdown: 0, countdownAnim: false, playing: true, score: 0, timeLeft: 180, result: null });
        this._startTimer();
        return;
      }
      // 先缩放动画
      this.setData({ countdownAnim: true, countdown: n });
      try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
      // 缩小后重置
      this._setTimer(() => {
        this.setData({ countdownAnim: false });
      }, 600);
      this._setTimer(() => {
        tick(n - 1);
      }, 900);
    };
    tick(3);
  },

  _startTimer() {
    this._clearAllTimers();
    const timeDisplay = '3:00';
    this.setData({ timeDisplay });
    this._timer = setInterval(() => {
      let timeLeft = this.data.timeLeft - 1;
      if (timeLeft <= 0) {
        this._clearAllTimers();
        this._endGame();
        return;
      }
      const timeMin = Math.floor(timeLeft / 60);
      const timeSec = timeLeft % 60;
      const timeDisplay = timeMin + ':' + (timeSec < 10 ? '0' : '') + timeSec;
      this.setData({ timeLeft, timeDisplay });
    }, 1000);
  },

  _endGame() {
    // Guard against double-calling (e.g., onHide + timer both trigger)
    if (this._gameEnded) return;
    this._gameEnded = true;

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

    // 最后一震
    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}

    this.setData({
      playing: false,
      result: { coins, materials, inspiration, exp, score },
    });
  },

  onCanvasTap(e) {
    if (!this.data.playing) return;

    const newScore = this.data.score + 1;
    this.setData({ score: newScore });

    // 震动反馈
    try { wx.vibrateShort({ type: 'light' }); } catch (err) {}

    // 屏幕闪白 + 微震
    this.setData({ flashShow: true, screenShake: true });
    this._setTimer(() => this.setData({ flashShow: false, screenShake: false }), 150);

    // 粒子喷发效果
    this._spawnParticles(e);
  },

  _spawnParticles(e) {
    const colors = ['#ff6b6b', '#ffa07a', '#ffe066', '#a18cd1', '#fbc2eb'];
    let x = 187, y = 300; // 默认中心
    if (e && e.detail && e.detail.x) {
      x = e.detail.x;
      y = e.detail.y;
    }
    const newParticles = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const dist = 40 + Math.random() * 60;
      newParticles.push({
        id: this.data._particleId + i,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    this.setData({
      _particleId: this.data._particleId + 8,
      particles: newParticles,
    });
    this._setTimer(() => {
      this.setData({ particles: [] });
    }, 600);
  },

  onResultTap() {
    this.setData({ result: null });
    wx.navigateBack();
  },
});
