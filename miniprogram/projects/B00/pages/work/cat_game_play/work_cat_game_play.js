const gameHelper = require('../../../../../helper/game_helper.js');

// Canvas渲染：目标出现→下降→最佳时机→消失，玩家点击拍照
Page({
  data: {
    gameId: '',
    gameInfo: null,
    playing: false,
    score: 0,
    timeLeft: 180,
    timeDisplay: '3:00',
    result: null,
    countdown: 0,
    countdownAnim: false,
    screenShake: false,
    flashShow: false,
    particles: [],
    _particleId: 0,
    combo: 0,
    comboShow: false,
    comboText: '',
    hitFeedback: '',
    hitFeedbackShow: false,
  },

  _timer: null,
  _timers: [],
  _gameEnded: false,
  _canvas: null,
  _ctx: null,
  _canvasW: 0,
  _canvasH: 0,
  _targets: [],
  _animId: null,
  _targetTimer: null,
  _spawnInterval: 1200,
  _lastTime: 0,

  _EXPRESSIONS: {
    photo: ['😊', '😍', '🤩', '😄', '🥰'],
    retouch: ['🎨', '✨', '🖌️', '💎', '🌈'],
    post: ['📱', '❤️', '🔥', '🌟', '👍'],
  },

  _SCORE_TEXTS: [
    { min: 0, text: '', color: '#ff6b6b' },
    { min: 2, text: '不错!', color: '#ffa07a' },
    { min: 3, text: '完美!', color: '#ffb300' },
  ],

  onLoad(options) {
    const gameId = options.id || 'photo';
    const gameTypes = gameHelper.GAME_TYPES;
    const gameInfo = gameTypes.find(g => g.id === gameId) || gameTypes[0];
    this.setData({ gameId, gameInfo });
  },

  onReady() {
    this._initCanvas();
  },

  onUnload() {
    this._cleanup();
  },

  onHide() {
    if (this.data.playing) {
      this._cleanup();
      this._endGame();
    }
  },

  _initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio || 2;
        const w = res[0].width;
        const h = res[0].height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
        this._canvas = canvas;
        this._ctx = ctx;
        this._canvasW = w;
        this._canvasH = h;
        this._drawIdle();
      });
  },

  _drawIdle() {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._canvasW;
    const h = this._canvasH;
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#e8f4f8');
    grad.addColorStop(1, '#d4ecf0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c8b896';
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.fillStyle = '#b8a886';
    ctx.fillRect(0, h * 0.78, w, 2);
    ctx.fillStyle = '#999';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('准备开始...', w / 2, h / 2);
  },

  // --- Timer helpers ---
  _setTimer(fn, delay) {
    const id = setTimeout(() => {
      const idx = this._timers.indexOf(id);
      if (idx >= 0) this._timers.splice(idx, 1);
      fn();
    }, delay);
    this._timers.push(id);
    return id;
  },

  _clearAllTimers() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._targetTimer) { clearInterval(this._targetTimer); this._targetTimer = null; }
    this._timers.forEach(id => clearTimeout(id));
    this._timers = [];
  },

  _cleanup() {
    this._clearAllTimers();
    if (this._animId && this._canvas) {
      this._canvas.cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    this._targets = [];
  },

  // --- Game start ---
  onStartTap() {
    try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
    this._startCountdown();
  },

  _startCountdown() {
    this._gameEnded = false;
    this._clearAllTimers();
    this.setData({ countdown: 3, countdownAnim: true, combo: 0 });
    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
    const tick = (n) => {
      if (n <= 0) {
        this.setData({ countdown: 0, countdownAnim: false, playing: true, score: 0, timeLeft: 180, result: null });
        this._startGame();
        return;
      }
      this.setData({ countdownAnim: true, countdown: n });
      try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
      this._setTimer(() => this.setData({ countdownAnim: false }), 600);
      this._setTimer(() => tick(n - 1), 900);
    };
    tick(3);
  },

  _startGame() {
    this._targets = [];
    this._lastTime = Date.now();
    this._spawnInterval = 1200;
    this._spawnTarget();
    this._targetTimer = setInterval(() => this._spawnTarget(), this._spawnInterval);
    this._startTimer();
    this._gameLoop();
  },

  _startTimer() {
    if (this._timer) { clearInterval(this._timer); }
    this.setData({ timeDisplay: '3:00' });
    this._timer = setInterval(() => {
      let timeLeft = this.data.timeLeft - 1;
      if (timeLeft <= 0) {
        this._clearAllTimers();
        this._endGame();
        return;
      }
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      this.setData({ timeLeft, timeDisplay: m + ':' + (s < 10 ? '0' : '') + s });
      if (timeLeft % 30 === 0 && this._spawnInterval > 600) {
        this._spawnInterval -= 100;
        clearInterval(this._targetTimer);
        this._targetTimer = setInterval(() => this._spawnTarget(), this._spawnInterval);
      }
    }, 1000);
  },

  // --- Target spawning ---
  _spawnTarget() {
    const w = this._canvasW || 350;
    const h = this._canvasH || 300;
    const expressions = this._EXPRESSIONS[this.data.gameId] || this._EXPRESSIONS.photo;
    const emoji = expressions[Math.floor(Math.random() * expressions.length)];
    const radius = 22 + Math.random() * 14;
    const x = radius + 10 + Math.random() * (w - radius * 2 - 20);
    const y = -radius;
    const speed = 0.25 + Math.random() * 0.35 + (180 - this.data.timeLeft) * 0.002;
    const lifeMs = 2200 + Math.random() * 1200;
    this._targets.push({
      x, y, radius, emoji, speed,
      born: Date.now(), lifeMs,
      bestStart: lifeMs * 0.25, bestEnd: lifeMs * 0.65,
      phase: 'normal', opacity: 1, scale: 0.3, hit: false,
    });
  },

  // --- Game loop ---
  _gameLoop() {
    if (!this.data.playing) return;
    const now = Date.now();
    const dt = now - this._lastTime;
    this._lastTime = now;
    this._updateTargets(dt, now);
    this._render();
    this._animId = this._canvas.requestAnimationFrame(() => this._gameLoop());
  },

  _updateTargets(dt, now) {
    const h = this._canvasH || 300;
    this._targets = this._targets.filter(t => {
      if (t.hit) return false;
      t.y += t.speed * (dt / 16);
      const age = now - t.born;
      if (age < t.bestStart) {
        t.phase = 'normal';
        t.scale = Math.min(1, 0.3 + (age / t.bestStart) * 0.7);
      } else if (age < t.bestEnd) {
        t.phase = 'best';
        t.scale = 1 + Math.sin(age * 0.008) * 0.12;
      } else if (age < t.lifeMs) {
        t.phase = 'fading';
        t.opacity = Math.max(0, 1 - (age - t.bestEnd) / (t.lifeMs - t.bestEnd));
        t.scale = 1 - (1 - t.opacity) * 0.3;
      } else {
        return false;
      }
      return t.y <= h + t.radius;
    });
  },

  _render() {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._canvasW;
    const h = this._canvasH;
    ctx.clearRect(0, 0, w, h);
    // 背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#e8f4f8');
    grad.addColorStop(1, '#d4ecf0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // 地板
    ctx.fillStyle = '#c8b896';
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.fillStyle = '#b8a886';
    ctx.fillRect(0, h * 0.78, w, 2);

    // 目标
    this._targets.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.opacity;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // 最佳时机光环
      if (t.phase === 'best') {
        ctx.beginPath();
        ctx.arc(0, 0, t.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 180, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 主体圆
      ctx.beginPath();
      ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
      ctx.fillStyle = t.phase === 'best' ? '#fff8e1' : '#fff';
      ctx.fill();
      ctx.strokeStyle = t.phase === 'best' ? '#ffb300' : '#ddd';
      ctx.lineWidth = t.phase === 'best' ? 2.5 : 1.5;
      ctx.stroke();

      // 表情
      ctx.font = (t.radius * 1.1) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.emoji, 0, 1);

      // 提示文字
      if (t.phase === 'best') {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#ff8f00';
        ctx.fillText('📸快拍!', 0, t.radius + 14);
      }

      ctx.restore();
    });
  },

  // --- Tap handling ---
  onCanvasTap(e) {
    if (!this.data.playing) return;
    try { wx.vibrateShort({ type: 'light' }); } catch (err) {}

    const touch = e.touches ? e.touches[0] : e.detail;
    if (!touch) return;
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas').boundingClientRect().exec((res) => {
      if (!res || !res[0]) return;
      const rect = res[0];
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;
      this._handleTap(tx, ty);
    });
  },

  _handleTap(tx, ty) {
    let hitTarget = null;
    let hitIdx = -1;

    // 从后往前找，优先命中最佳时机
    for (let i = this._targets.length - 1; i >= 0; i--) {
      const t = this._targets[i];
      if (t.hit) continue;
      const dx = tx - t.x;
      const dy = ty - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= t.radius * 1.6) {
        if (t.phase === 'best') {
          hitTarget = t; hitIdx = i; break;
        }
        if (!hitTarget) { hitTarget = t; hitIdx = i; }
      }
    }

    if (!hitTarget) {
      // 空拍 - 屏幕闪白
      this.setData({ flashShow: true });
      this._setTimer(() => this.setData({ flashShow: false }), 80);
      return;
    }

    hitTarget.hit = true;
    let points = hitTarget.phase === 'best' ? 3 : hitTarget.phase === 'fading' ? 1 : 2;
    let combo = this.data.combo;
    if (hitTarget.phase === 'best') {
      combo++;
    } else {
      combo = 0;
    }

    let comboBonus = 0;
    if (combo >= 3) {
      comboBonus = Math.min(combo, 10);
      points += comboBonus;
    }

    // 评语
    const scoreText = hitTarget.phase === 'best' ? '完美! +3' : hitTarget.phase === 'fading' ? '+1' : '不错! +2';
    this.setData({
      score: this.data.score + points,
      combo,
      comboShow: combo >= 3,
      comboText: combo >= 3 ? ('🔥 ' + combo + '连击! +' + comboBonus) : '',
      hitFeedback: scoreText + (comboBonus ? ' (连击+' + comboBonus + ')' : ''),
      hitFeedbackShow: true,
    });
    this._setTimer(() => this.setData({ hitFeedbackShow: false }), 600);

    // 特效
    this._spawnParticles(hitTarget.x, hitTarget.y, hitTarget.phase === 'best' ? '#ffb300' : '#ff6b6b');
    this.setData({ flashShow: true, screenShake: true });
    this._setTimer(() => this.setData({ flashShow: false, screenShake: false }), 120);
    this._targets.splice(hitIdx, 1);
  },

  _spawnParticles(x, y, color) {
    const particles = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const dist = 30 + Math.random() * 50;
      particles.push({
        id: this.data._particleId + i,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        color,
      });
    }
    this.setData({
      _particleId: this.data._particleId + 8,
      particles,
    });
    this._setTimer(() => this.setData({ particles: [] }), 600);
  },

  // --- Game end ---
  _endGame() {
    if (this._gameEnded) return;
    this._gameEnded = true;
    this._cleanup();

    const score = this.data.score;
    const gameId = this.data.gameId;
    let coins = 0, materials = 0, inspiration = 0, exp = 0;
    if (gameId === 'photo') {
      coins = Math.floor(score * 2); exp = Math.floor(score * 0.5);
    } else if (gameId === 'retouch') {
      materials = Math.floor(score * 1.5); exp = Math.floor(score * 0.4);
    } else if (gameId === 'post') {
      inspiration = Math.floor(score * 1.2); exp = Math.floor(score * 0.3);
    }

    const state = gameHelper.getState();
    if (coins > 0) gameHelper.addCoins(state, coins);
    if (materials > 0) gameHelper.addMaterials(state, materials);
    if (inspiration > 0) gameHelper.addInspiration(state, inspiration);
    if (exp > 0) gameHelper.addExp(state, exp);
    gameHelper.saveState(state);
    gameHelper.syncToPetState(state);
    gameHelper.addPlayLog(gameId, score, { coins, materials, inspiration, exp });

    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
    this.setData({
      playing: false,
      result: { coins, materials, inspiration, exp, score },
    });
  },

  onResultTap() {
    this.setData({ result: null });
    wx.navigateBack();
  },
});
