const gameHelper = require('../../../../../helper/game_helper.js');

// 三种小游戏统一框架：photo(接单快拍) | retouch(修图挑战) | post(小红书爆款)
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
    // 修图挑战专用
    retouchChallenge: null,   // {targetFilter, options[], photoArea}
    retouchRound: 0,
    // 小红书爆款专用
    postChallenge: null,      // {titles[], covers[], bestCombo}
    postRound: 0,
  },

  _timer: null,
  _timers: [],
  _gameEnded: false,
  _canvas: null,
  _ctx: null,
  _canvasW: 0,
  _canvasH: 0,
  _animId: null,
  _lastTime: 0,
  // photo game
  _targets: [],
  _targetTimer: null,
  _spawnInterval: 1200,
  // retouch game
  _retouchOptions: [],
  // post game
  _postOptions: [],

  _EXPRESSIONS: {
    photo: ['😊', '😍', '🤩', '😄', '🥰'],
    retouch: ['🎨', '✨', '🖌️', '💎', '🌈'],
    post: ['📱', '❤️', '🔥', '🌟', '👍'],
  },

  // ===== 滤镜库 =====
  _FILTERS: [
    { id: 'warm', name: '暖阳', emoji: '☀️', color: '#ff9800', desc: '温暖色调' },
    { id: 'cool', name: '清冷', emoji: '❄️', color: '#42a5f5', desc: '冷色调' },
    { id: 'vintage', name: '复古', emoji: '📷', color: '#8d6e63', desc: '复古胶片' },
    { id: 'bright', name: '明亮', emoji: '💡', color: '#ffee58', desc: '提亮曝光' },
    { id: 'bw', name: '黑白', emoji: '🖤', color: '#616161', desc: '黑白经典' },
    { id: 'pink', name: '粉嫩', emoji: '🌸', color: '#f48fb1', desc: '少女粉调' },
    { id: 'fresh', name: '清新', emoji: '🌿', color: '#81c784', desc: '清新自然' },
    { id: 'dramatic', name: '戏剧', emoji: '🎭', color: '#7e57c2', desc: '高对比度' },
  ],

  // ===== 小红书标题库 =====
  _POST_TITLES: [
    { text: '姐妹们！这套写真绝了！🔥', score: 3 },
    { text: '今天是仙女本仙✨', score: 2 },
    { text: '拍照姿势分享', score: 1 },
    { text: '一整个爱住！这个光线太美了', score: 3 },
    { text: '年度最佳写真📸', score: 2 },
    { text: '分享一下我的拍摄花絮', score: 1 },
    { text: '氛围感拉满的室内写真', score: 3 },
    { text: '客片分享 每一张都是故事', score: 2 },
    { text: '周末约拍', score: 1 },
    { text: '这个角度拍显脸小！必收藏', score: 3 },
    { text: '发朋友圈被问爆的拍照地', score: 2 },
    { text: '日系清新人像摄影', score: 1 },
  ],
  _POST_COVERS: [
    { emoji: '🌅', name: '逆光剪影', score: 3 },
    { emoji: '💐', name: '花丛特写', score: 2 },
    { emoji: '🏙️', name: '城市街拍', score: 2 },
    { emoji: '🌊', name: '海边漫步', score: 3 },
    { emoji: '☕', name: '咖啡馆', score: 1 },
    { emoji: '🌳', name: '公园草地', score: 1 },
    { emoji: '✨', name: '光影斑驳', score: 3 },
    { emoji: '🎀', name: '室内布景', score: 2 },
  ],

  onLoad(options) {
    const gameId = options.id || 'photo';
    const gameTypes = gameHelper.GAME_TYPES;
    const gameInfo = gameTypes.find(g => g.id === gameId) || gameTypes[0];
    this.setData({ gameId, gameInfo });
  },

  onReady() { this._initCanvas(); },
  onUnload() { this._cleanup(); },
  onHide() {
    if (this.data.playing) { this._cleanup(); this._endGame(); }
  },

  _initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas').fields({ node: true, size: true }).exec((res) => {
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
    const w = this._canvasW, h = this._canvasH;
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

  // ===== 通用定时器 =====
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

  // ===== 游戏开始 =====
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
    this._lastTime = Date.now();
    this._startTimer();
    const gameId = this.data.gameId;
    if (gameId === 'photo') {
      this._startPhotoGame();
    } else if (gameId === 'retouch') {
      this._startRetouchGame();
    } else if (gameId === 'post') {
      this._startPostGame();
    }
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
    }, 1000);
  },

  // =================================================================
  // 接单快拍 (photo) - Canvas 2D 目标下落
  // =================================================================
  _startPhotoGame() {
    this._targets = [];
    this._spawnInterval = 1200;
    this._spawnPhotoTarget();
    this._targetTimer = setInterval(() => this._spawnPhotoTarget(), this._spawnInterval);
    this._photoLoop();
  },

  _spawnPhotoTarget() {
    const w = this._canvasW || 350;
    const h = this._canvasH || 300;
    const expressions = this._EXPRESSIONS.photo;
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

  _photoLoop() {
    if (!this.data.playing || this.data.gameId !== 'photo') return;
    const now = Date.now();
    const dt = now - this._lastTime;
    this._lastTime = now;
    this._updatePhotoTargets(dt, now);
    this._renderPhoto();
    this._animId = this._canvas.requestAnimationFrame(() => this._photoLoop());
  },

  _updatePhotoTargets(dt, now) {
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
      } else { return false; }
      return t.y <= h + t.radius;
    });
  },

  _renderPhoto() {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._canvasW, h = this._canvasH;
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

    this._targets.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.opacity;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);
      if (t.phase === 'best') {
        ctx.beginPath();
        ctx.arc(0, 0, t.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 180, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
      ctx.fillStyle = t.phase === 'best' ? '#fff8e1' : '#fff';
      ctx.fill();
      ctx.strokeStyle = t.phase === 'best' ? '#ffb300' : '#ddd';
      ctx.lineWidth = t.phase === 'best' ? 2.5 : 1.5;
      ctx.stroke();
      ctx.font = (t.radius * 1.1) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.emoji, 0, 1);
      if (t.phase === 'best') {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#ff8f00';
        ctx.fillText('📸快拍!', 0, t.radius + 14);
      }
      ctx.restore();
    });
  },

  // =================================================================
  // 修图挑战 (retouch) - 点选滤镜匹配目标
  // =================================================================
  _startRetouchGame() {
    this._spawnRetouchRound();
  },

  _spawnRetouchRound() {
    const filters = this._FILTERS;
    const target = filters[Math.floor(Math.random() * filters.length)];
    // 生成4个选项（含正确答案）
    let options = [target];
    while (options.length < 4) {
      const f = filters[Math.floor(Math.random() * filters.length)];
      if (!options.find(o => o.id === f.id)) options.push(f);
    }
    // 洗牌
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    this.setData({
      retouchChallenge: { target, options },
      retouchRound: this.data.retouchRound + 1,
    });
    this._renderRetouch(target);
  },

  _renderRetouch(target) {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._canvasW, h = this._canvasH;
    ctx.clearRect(0, 0, w, h);
    // 背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f5f0e8');
    grad.addColorStop(1, '#e8e0d0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // 模拟照片区域
    ctx.fillStyle = '#ddd';
    ctx.fillRect(w * 0.1, 20, w * 0.8, h * 0.45);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(w * 0.1, 20, w * 0.8, h * 0.45);
    // 照片emoji
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📸', w / 2, 20 + h * 0.225);
    // 目标区域高亮
    ctx.fillStyle = target.color + '33';
    ctx.fillRect(w * 0.1, 20, w * 0.8, h * 0.45);
    ctx.strokeStyle = target.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(w * 0.1, 20, w * 0.8, h * 0.45);
    // 提示文字
    ctx.fillStyle = target.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('需要：' + target.name + '滤镜 ' + target.emoji, w / 2, 20 + h * 0.5);
  },

  onRetouchOptionTap(e) {
    if (!this.data.playing || this.data.gameId !== 'retouch') return;
    const idx = e.currentTarget.dataset.idx;
    const challenge = this.data.retouchChallenge;
    if (!challenge) return;
    const option = challenge.options[idx];
    const isCorrect = option.id === challenge.target.id;

    if (isCorrect) {
      let combo = this.data.combo + 1;
      let points = 2 + (combo >= 3 ? Math.min(combo, 10) : 0);
      this.setData({
        score: this.data.score + points,
        combo,
        comboShow: combo >= 3,
        comboText: combo >= 3 ? ('🔥 ' + combo + '连击!') : '',
        hitFeedback: '完美修图! +' + points,
        hitFeedbackShow: true,
      });
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
      this.setData({ flashShow: true });
      this._setTimer(() => this.setData({ flashShow: false, hitFeedbackShow: false }), 500);
      // 下一轮
      this._setTimer(() => this._spawnRetouchRound(), 400);
    } else {
      this.setData({
        combo: 0,
        comboShow: false,
        hitFeedback: '滤镜不对哦~',
        hitFeedbackShow: true,
        screenShake: true,
      });
      try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
      // 扣3秒
      let newTime = Math.max(0, this.data.timeLeft - 3);
      const m = Math.floor(newTime / 60);
      const s = newTime % 60;
      this.setData({ timeLeft: newTime, timeDisplay: m + ':' + (s < 10 ? '0' : '') + s });
      if (newTime <= 0) {
        this._clearAllTimers();
        this._endGame();
        return;
      }
      this._setTimer(() => this.setData({ hitFeedbackShow: false, screenShake: false }), 600);
    }
  },

  // =================================================================
  // 小红书爆款 (post) - 选择标题+封面最佳组合
  // =================================================================
  _startPostGame() {
    this._spawnPostRound();
  },

  _spawnPostRound() {
    const titles = this._POST_TITLES;
    const covers = this._POST_COVERS;
    // 随机选3个标题和3个封面
    const shuffledTitles = titles.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    const shuffledCovers = covers.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    this.setData({
      postChallenge: { titles: shuffledTitles, covers: shuffledCovers, selectedTitle: -1, selectedCover: -1 },
      postRound: this.data.postRound + 1,
    });
    this._renderPost(shuffledTitles, shuffledCovers);
  },

  _renderPost(titles, covers) {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._canvasW, h = this._canvasH;
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fff0f5');
    grad.addColorStop(1, '#ffe4ec');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // 标题
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📰 选择爆款标题:', 15, 25);
    // 封面
    ctx.fillText('🖼️ 选择封面:', 15, h * 0.45);
    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('先点标题，再点封面，组合得分!', w / 2, h - 10);
  },

  onPostTitleTap(e) {
    if (!this.data.playing || this.data.gameId !== 'post') return;
    const idx = e.currentTarget.dataset.idx;
    const challenge = this.data.postChallenge;
    if (!challenge) return;
    challenge.selectedTitle = idx;
    this.setData({ postChallenge: challenge });
    try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
    // 如果封面也选了，结算
    if (challenge.selectedCover >= 0) {
      this._settlePostRound();
    }
  },

  onPostCoverTap(e) {
    if (!this.data.playing || this.data.gameId !== 'post') return;
    const idx = e.currentTarget.dataset.idx;
    const challenge = this.data.postChallenge;
    if (!challenge) return;
    challenge.selectedCover = idx;
    this.setData({ postChallenge: challenge });
    try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
    if (challenge.selectedTitle >= 0) {
      this._settlePostRound();
    }
  },

  _settlePostRound() {
    const challenge = this.data.postChallenge;
    if (!challenge) return;
    const title = challenge.titles[challenge.selectedTitle];
    const cover = challenge.covers[challenge.selectedCover];
    const totalScore = title.score + cover.score; // 2-6分
    let combo = this.data.combo;
    if (totalScore >= 5) {
      combo++;
    } else {
      combo = 0;
    }
    let bonus = combo >= 3 ? Math.min(combo, 10) : 0;
    let points = totalScore + bonus;

    this.setData({
      score: this.data.score + points,
      combo,
      comboShow: combo >= 3,
      comboText: combo >= 3 ? ('🔥 ' + combo + '连爆!') : '',
      hitFeedback: totalScore >= 5 ? '爆款! +' + points : (totalScore >= 3 ? '还不错 +' + points : '一般般 +' + points),
      hitFeedbackShow: true,
      flashShow: totalScore >= 5,
    });
    if (totalScore >= 5) {
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
    }
    this._setTimer(() => this.setData({ flashShow: false, hitFeedbackShow: false }), 600);
    this._setTimer(() => this._spawnPostRound(), 500);
  },

  // =================================================================
  // Canvas 点击（接单快拍）
  // =================================================================
  onCanvasTap(e) {
    if (!this.data.playing) return;
    if (this.data.gameId === 'photo') {
      this._onPhotoCanvasTap(e);
    }
  },

  _onPhotoCanvasTap(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
    const touch = e.touches ? e.touches[0] : e.detail;
    if (!touch) return;
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas').boundingClientRect().exec((res) => {
      if (!res || !res[0]) return;
      const rect = res[0];
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;
      this._handlePhotoTap(tx, ty);
    });
  },

  _handlePhotoTap(tx, ty) {
    let hitTarget = null, hitIdx = -1;
    for (let i = this._targets.length - 1; i >= 0; i--) {
      const t = this._targets[i];
      if (t.hit) continue;
      const dx = tx - t.x, dy = ty - t.y;
      if (Math.sqrt(dx * dx + dy * dy) <= t.radius * 1.6) {
        if (t.phase === 'best') { hitTarget = t; hitIdx = i; break; }
        if (!hitTarget) { hitTarget = t; hitIdx = i; }
      }
    }
    if (!hitTarget) {
      this.setData({ flashShow: true });
      this._setTimer(() => this.setData({ flashShow: false }), 80);
      return;
    }
    hitTarget.hit = true;
    let points = hitTarget.phase === 'best' ? 3 : hitTarget.phase === 'fading' ? 1 : 2;
    let combo = this.data.combo;
    if (hitTarget.phase === 'best') combo++; else combo = 0;
    let comboBonus = combo >= 3 ? Math.min(combo, 10) : 0;
    if (comboBonus) points += comboBonus;

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
    this.setData({ _particleId: this.data._particleId + 8, particles });
    this._setTimer(() => this.setData({ particles: [] }), 600);
  },

  // =================================================================
  // 游戏结束
  // =================================================================
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
