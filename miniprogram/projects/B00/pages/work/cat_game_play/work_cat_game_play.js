/**
 * 三款成熟小游戏：猫咪快抓(打地鼠) | 记忆翻牌(配对) | 合成2048
 * v2.07 全面重写，参考 GitHub 热门开源小游戏玩法
 */
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
    countdown: 0,
    countdownAnim: false,
    screenShake: false,
    flashShow: false,
    hitFeedback: '',
    hitFeedbackShow: false,
    combo: 0,
    // 记忆翻牌
    memCards: [],
    attempts: 0,
    // 合成2048
    tBgCells: [],
    tTiles: [],
    tBestScore: 0,
  },

  _timer: null,
  _timers: [],
  _gameEnded: false,
  // Canvas
  _canvas: null,
  _ctx: null,
  _canvasW: 0,
  _canvasH: 0,
  _animId: null,
  _lastTime: 0,
  // 打地鼠
  _moles: [],
  _spawnTimer: null,
  _spawnInterval: 1200,
  // 记忆翻牌
  _memLock: false,
  _memFirst: -1,
  _memMatched: 0,
  _memTotal: 8,
  // 2048
  _tGrid: null,
  _tMoved: false,
  _tTouchStart: null,

  // ===== 配置 =====
  _MOLE_EMOJIS: ['😊', '😍', '🤩', '😄', '🥰', '😎', '🌟', '📸'],
  _MOLE_GOLDEN_CHANCE: 0.15,
  _MOLE_CAT_CHANCE: 0.1,
  _MEM_EMOJIS: ['📸', '📷', '🎞️', '💡', '🎨', '🖌️', '⭐', '🌸'],

  _POS: [
    { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
    { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
    { col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 },
  ],

  // =================================================================
  // Lifecycle
  // =================================================================
  onLoad(options) {
    const gameId = options.id || 'photo';
    const info = gameHelper.GAME_TYPES.find(g => g.id === gameId) || gameHelper.GAME_TYPES[0];
    const best = wx.getStorageSync('T2048_BEST') || 0;
    this.setData({ gameId, gameInfo: info, tBestScore: best });
  },

  onReady() {
    if (this.data.gameId === 'photo') this._initCanvas();
  },

  onUnload() { this._cleanup(); },
  onHide() {
    if (this.data.playing) { this._cleanup(); this._endGame(); }
  },

  // =================================================================
  // Canvas init (打地鼠专用)
  // =================================================================
  _initCanvas() {
    const q = wx.createSelectorQuery();
    q.select('#gameCanvas').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0]) return;
      const c = res[0].node;
      const ctx = c.getContext('2d');
      const dpr = wx.getWindowInfo().pixelRatio || 2;
      const w = res[0].width, h = res[0].height;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.scale(dpr, dpr);
      this._canvas = c;
      this._ctx = ctx;
      this._canvasW = w;
      this._canvasH = h;
      this._drawIdleCanvas();
    });
  },

  _drawIdleCanvas() {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._canvasW, h = this._canvasH;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e8f4f8');
    g.addColorStop(1, '#d4ecf0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    this._drawHoles(ctx, w, h);
  },

  _drawHoles(ctx, w, h) {
    const cellW = w / 3, cellH = h / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cx = cellW * c + cellW / 2;
        const cy = cellH * r + cellH * 2 / 3;
        const rx = cellW * 0.35, ry = cellH * 0.18;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#8B7355';
        ctx.fill();
        ctx.strokeStyle = '#6B5335';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  },

  // =================================================================
  // Timer helpers
  // =================================================================
  _setTimer(fn, delay) {
    const id = setTimeout(() => {
      const i = this._timers.indexOf(id);
      if (i >= 0) this._timers.splice(i, 1);
      fn();
    }, delay);
    this._timers.push(id);
    return id;
  },

  _clearAllTimers() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._spawnTimer) { clearInterval(this._spawnTimer); this._spawnTimer = null; }
    this._timers.forEach(id => clearTimeout(id));
    this._timers = [];
  },

  _cleanup() {
    this._clearAllTimers();
    if (this._animId && this._canvas) {
      this._canvas.cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    this._moles = [];
  },

  // =================================================================
  // Game start flow
  // =================================================================
  onStartTap() {
    try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
    this._startCountdown();
  },

  _startCountdown() {
    this._gameEnded = false;
    this._clearAllTimers();
    this.setData({ countdown: 3, countdownAnim: true, combo: 0, score: 0, timeLeft: 180 });
    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
    const tick = (n) => {
      if (n <= 0) {
        this.setData({ countdown: 0, countdownAnim: false, playing: true, result: null });
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
    const id = this.data.gameId;
    if (id === 'photo') this._startWhackGame();
    else if (id === 'retouch') this._startMemoryGame();
    else if (id === 'post') this._start2048Game();
  },

  _startTimer() {
    if (this._timer) clearInterval(this._timer);
    this.setData({ timeDisplay: '3:00' });
    this._timer = setInterval(() => {
      let t = this.data.timeLeft - 1;
      if (t <= 0) {
        this._clearAllTimers();
        this._endGame();
        return;
      }
      const m = Math.floor(t / 60), s = t % 60;
      this.setData({ timeLeft: t, timeDisplay: m + ':' + (s < 10 ? '0' : '') + s });
    }, 1000);
  },

  // =================================================================
  // 1) 猫咪快抓 (打地鼠)
  // =================================================================
  _startWhackGame() {
    this._moles = [];
    this._spawnInterval = 1200;
    // 确保 canvas 已就绪
    if (!this._ctx) {
      this._initCanvas();
      this._setTimer(() => {
        if (!this._ctx) return;
        this._beginWhackSpawn();
      }, 300);
      return;
    }
    this._beginWhackSpawn();
  },

  _beginWhackSpawn() {
    this._spawnMole();
    this._spawnTimer = setInterval(() => this._spawnMole(), this._spawnInterval);
    this._whackLoop();
  },

  _spawnMole() {
    const now = Date.now();
    // 找空洞
    const occupied = {};
    this._moles.forEach(m => { if (now - m.born < m.duration) occupied[m.hole] = true; });
    const free = [];
    for (let i = 0; i < 9; i++) if (!occupied[i]) free.push(i);
    if (free.length === 0) return;
    const hole = free[Math.floor(Math.random() * free.length)];

    let emoji, isGolden = false, isCat = false;
    const r = Math.random();
    if (r < this._MOLE_CAT_CHANCE) {
      emoji = '🐱';
      isCat = true;
    } else if (r < this._MOLE_CAT_CHANCE + this._MOLE_GOLDEN_CHANCE) {
      emoji = '🌟';
      isGolden = true;
    } else {
      emoji = this._MOLE_EMOJIS[Math.floor(Math.random() * this._MOLE_EMOJIS.length)];
    }

    const elapsed = 180 - this.data.timeLeft;
    const duration = Math.max(600, 1800 - elapsed * 3);

    this._moles.push({
      hole, emoji, isGolden, isCat,
      born: now, duration, hit: false, hitTime: 0,
    });

    // 难度递增
    this._spawnInterval = Math.max(500, 1200 - elapsed * 2.5);
    if (this._spawnTimer) {
      clearInterval(this._spawnTimer);
      this._spawnTimer = setInterval(() => this._spawnMole(), this._spawnInterval);
    }
  },

  _whackLoop() {
    if (!this.data.playing || this.data.gameId !== 'photo') return;
    const now = Date.now();
    this._renderWhack(now);
    this._animId = this._canvas.requestAnimationFrame(() => this._whackLoop());
  },

  _renderWhack(now) {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._canvasW, h = this._canvasH;
    const cellW = w / 3, cellH = h / 3;

    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e8f4f8');
    g.addColorStop(1, '#d4ecf0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    this._drawHoles(ctx, w, h);

    // Prune dead moles to prevent unbounded array growth
    this._moles = this._moles.filter(m => now - m.born < m.duration + 300);

    this._moles.forEach(m => {
      const age = now - m.born;
      if (age > m.duration && !m.hit) return;
      const pos = this._POS[m.hole];
      const cx = cellW * pos.col + cellW / 2;
      const cy = cellH * pos.row + cellH / 2;

      let alpha = 1, scale = 1;
      if (m.hit) {
        const ha = now - m.hitTime;
        alpha = Math.max(0, 1 - ha / 300);
        scale = 1 - ha / 600;
        if (alpha <= 0) return;
      } else {
        if (age < 150) scale = age / 150;
        else if (age > m.duration - 200) scale = (m.duration - age) / 200;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.scale(Math.max(0.1, scale), Math.max(0.1, scale));

      if (m.isGolden && !m.hit) {
        ctx.beginPath();
        ctx.arc(0, 0, cellW * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 180, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.font = cellW * 0.35 + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.emoji, 0, 0);

      if (m.hit) {
        const pts = m.isCat ? '-5s' : (m.isGolden ? '+5' : '+1');
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = m.isCat ? '#e53e3e' : (m.isGolden ? '#ff8f00' : '#ff6b6b');
        ctx.fillText(pts, 0, -cellW * 0.3);
      }

      ctx.restore();
    });
  },

  onCanvasTap(e) {
    if (!this.data.playing || this.data.gameId !== 'photo') return;
    try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
    const touch = e.touches ? e.touches[0] : e.detail;
    if (!touch) return;
    const q = wx.createSelectorQuery();
    q.select('#gameCanvas').boundingClientRect().exec(res => {
      if (!res || !res[0]) return;
      const r = res[0];
      const tx = touch.clientX - r.left;
      const ty = touch.clientY - r.top;
      this._handleWhackTap(tx, ty);
    });
  },

  _handleWhackTap(tx, ty) {
    const w = this._canvasW, h = this._canvasH;
    const cellW = w / 3, cellH = h / 3;
    const now = Date.now();

    for (let i = this._moles.length - 1; i >= 0; i--) {
      const m = this._moles[i];
      if (m.hit) continue;
      if (now - m.born > m.duration) continue;
      const pos = this._POS[m.hole];
      const cx = cellW * pos.col + cellW / 2;
      const cy = cellH * pos.row + cellH / 2;
      const r = cellW * 0.28;
      if (Math.abs(tx - cx) > r || Math.abs(ty - cy) > r) continue;

      m.hit = true;
      m.hitTime = now;

      if (m.isCat) {
        let t = Math.max(0, this.data.timeLeft - 5);
        const mm = Math.floor(t / 60), ss = t % 60;
        this.setData({
          timeLeft: t, timeDisplay: mm + ':' + (ss < 10 ? '0' : '') + ss,
          combo: 0, hitFeedback: '猫咪不能打! -5秒',
          hitFeedbackShow: true, screenShake: true,
        });
        try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
        this._setTimer(() => this.setData({ hitFeedbackShow: false, screenShake: false }), 600);
        if (t <= 0) { this._clearAllTimers(); this._endGame(); }
        return;
      }

      let pts = m.isGolden ? 5 : 1;
      let c = this.data.combo + 1;
      let bonus = c >= 3 ? Math.min(c, 10) : 0;
      pts += bonus;

      this.setData({
        score: this.data.score + pts,
        combo: c,
        hitFeedback: (m.isGolden ? '金色! +' : '+') + pts + (bonus ? ' 连击x' + c : ''),
        hitFeedbackShow: true,
      });
      if (m.isGolden) {
        this.setData({ flashShow: true });
        this._setTimer(() => this.setData({ flashShow: false }), 100);
      }
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
      this._setTimer(() => this.setData({ hitFeedbackShow: false }), 500);
      return;
    }
  },

  // =================================================================
  // 2) 记忆翻牌
  // =================================================================
  _startMemoryGame() {
    const emojis = this._MEM_EMOJIS.slice(0, this._memTotal);
    const pairs = [...emojis, ...emojis];
    // Fisher-Yates 洗牌
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    const cards = pairs.map((emoji, idx) => ({
      id: idx, emoji, flipped: false, matched: false,
    }));
    this._memLock = false;
    this._memFirst = -1;
    this._memMatched = 0;
    this.setData({ memCards: cards, attempts: 0 });
  },

  onMemCardTap(e) {
    if (!this.data.playing || this.data.gameId !== 'retouch') return;
    if (this._memLock) return;
    const idx = e.currentTarget.dataset.idx;
    const cards = this.data.memCards;
    const card = cards[idx];
    if (!card || card.flipped || card.matched) return;

    try { wx.vibrateShort({ type: 'light' }); } catch (err) {}

    cards[idx].flipped = true;
    this.setData({ memCards: cards });

    if (this._memFirst < 0) {
      this._memFirst = idx;
      return;
    }

    // 第二张牌
    const firstIdx = this._memFirst;
    this._memFirst = -1;
    this._memLock = true;

    const first = cards[firstIdx];
    const second = cards[idx];
    this.setData({ attempts: this.data.attempts + 1 });

    if (first.emoji === second.emoji) {
      // 配对成功
      cards[firstIdx].matched = true;
      cards[idx].matched = true;
      this._memMatched++;
      this._memLock = false;
      this.setData({
        memCards: cards,
        hitFeedback: '配对成功!',
        hitFeedbackShow: true,
      });
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
      this._setTimer(() => this.setData({ hitFeedbackShow: false }), 500);

      // 全部配对完成
      if (this._memMatched >= this._memTotal) {
        this._setTimer(() => {
          this._clearAllTimers();
          this._endGame();
        }, 800);
      }
    } else {
      // 配对失败
      this.setData({
        hitFeedback: '再试试!',
        hitFeedbackShow: true,
      });
      this._setTimer(() => {
        cards[firstIdx].flipped = false;
        cards[idx].flipped = false;
        this._memLock = false;
        this.setData({ memCards: cards, hitFeedbackShow: false });
      }, 800);
    }
  },

  // =================================================================
  // 3) 合成2048
  // =================================================================
  _start2048Game() {
    this._tGrid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    this._tMoved = false;
    this._tAddTile();
    this._tAddTile();
    this._tSyncToData();
  },

  _tAddTile() {
    const empty = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (this._tGrid[r][c] === 0) empty.push({ r, c });
    if (empty.length === 0) return;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    this._tGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  },

  _tSyncToData() {
    // Cache static background cells array (never changes)
    if (!this._tBgCellsCache) {
      const cells = [];
      for (let i = 0; i < 16; i++) cells.push({ id: 'bg' + i });
      this._tBgCellsCache = cells;
    }
    const tiles = [];
    const TILE_SIZE = 120, GAP = 16, PAD = 12;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const v = this._tGrid[r][c];
        if (v === 0) continue;
        tiles.push({
          id: 't' + r + c + '_' + v + '_' + Date.now(),
          value: v,
          x: PAD + c * (TILE_SIZE + GAP),
          y: PAD + r * (TILE_SIZE + GAP),
          isNew: false,
          merged: false,
        });
      }
    }
    this.setData({ tBgCells: this._tBgCellsCache, tTiles: tiles });
  },

  on2048TouchStart(e) {
    if (!this.data.playing || this.data.gameId !== 'post') return;
    this._tTouchStart = e.touches[0];
  },

  on2048TouchEnd(e) {
    if (!this.data.playing || this.data.gameId !== 'post' || !this._tTouchStart) return;
    const end = e.changedTouches[0];
    const dx = end.clientX - this._tTouchStart.clientX;
    const dy = end.clientY - this._tTouchStart.clientY;
    this._tTouchStart = null;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;

    let moved = false;
    if (absDx > absDy) {
      moved = dx > 0 ? this._tMoveRight() : this._tMoveLeft();
    } else {
      moved = dy > 0 ? this._tMoveDown() : this._tMoveUp();
    }

    if (moved) {
      try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
      this._tAddTile();
      this._tSyncToData();
      // 检查游戏结束
      if (this._tCheckGameOver()) {
        this._setTimer(() => { this._clearAllTimers(); this._endGame(); }, 800);
      }
    }
  },

  _tMoveLeft() {
    let moved = false;
    let scoreGain = 0;
    for (let r = 0; r < 4; r++) {
      const row = this._tGrid[r].filter(v => v !== 0);
      const merged = [];
      let i = 0;
      while (i < row.length) {
        if (i + 1 < row.length && row[i] === row[i + 1]) {
          merged.push(row[i] * 2);
          scoreGain += row[i] * 2;
          i += 2;
        } else {
          merged.push(row[i]);
          i++;
        }
      }
      while (merged.length < 4) merged.push(0);
      for (let c = 0; c < 4; c++) {
        if (this._tGrid[r][c] !== merged[c]) moved = true;
        this._tGrid[r][c] = merged[c];
      }
    }
    if (scoreGain > 0) this.setData({ score: this.data.score + scoreGain });
    return moved;
  },

  _tMoveRight() {
    let moved = false;
    let scoreGain = 0;
    for (let r = 0; r < 4; r++) {
      const row = this._tGrid[r].filter(v => v !== 0);
      const merged = [];
      let i = row.length - 1;
      while (i >= 0) {
        if (i - 1 >= 0 && row[i] === row[i - 1]) {
          merged.unshift(row[i] * 2);
          scoreGain += row[i] * 2;
          i -= 2;
        } else {
          merged.unshift(row[i]);
          i--;
        }
      }
      while (merged.length < 4) merged.unshift(0);
      for (let c = 0; c < 4; c++) {
        if (this._tGrid[r][c] !== merged[c]) moved = true;
        this._tGrid[r][c] = merged[c];
      }
    }
    if (scoreGain > 0) this.setData({ score: this.data.score + scoreGain });
    return moved;
  },

  _tMoveUp() {
    let moved = false;
    let scoreGain = 0;
    for (let c = 0; c < 4; c++) {
      const col = [];
      for (let r = 0; r < 4; r++) if (this._tGrid[r][c] !== 0) col.push(this._tGrid[r][c]);
      const merged = [];
      let i = 0;
      while (i < col.length) {
        if (i + 1 < col.length && col[i] === col[i + 1]) {
          merged.push(col[i] * 2);
          scoreGain += col[i] * 2;
          i += 2;
        } else {
          merged.push(col[i]);
          i++;
        }
      }
      while (merged.length < 4) merged.push(0);
      for (let r = 0; r < 4; r++) {
        if (this._tGrid[r][c] !== merged[r]) moved = true;
        this._tGrid[r][c] = merged[r];
      }
    }
    if (scoreGain > 0) this.setData({ score: this.data.score + scoreGain });
    return moved;
  },

  _tMoveDown() {
    let moved = false;
    let scoreGain = 0;
    for (let c = 0; c < 4; c++) {
      const col = [];
      for (let r = 0; r < 4; r++) if (this._tGrid[r][c] !== 0) col.push(this._tGrid[r][c]);
      const merged = [];
      let i = col.length - 1;
      while (i >= 0) {
        if (i - 1 >= 0 && col[i] === col[i - 1]) {
          merged.unshift(col[i] * 2);
          scoreGain += col[i] * 2;
          i -= 2;
        } else {
          merged.unshift(col[i]);
          i--;
        }
      }
      while (merged.length < 4) merged.unshift(0);
      for (let r = 0; r < 4; r++) {
        if (this._tGrid[r][c] !== merged[r]) moved = true;
        this._tGrid[r][c] = merged[r];
      }
    }
    if (scoreGain > 0) this.setData({ score: this.data.score + scoreGain });
    return moved;
  },

  _tCheckGameOver() {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        if (this._tGrid[r][c] === 0) return false;
        if (c < 3 && this._tGrid[r][c] === this._tGrid[r][c + 1]) return false;
        if (r < 3 && this._tGrid[r][c] === this._tGrid[r + 1][c]) return false;
      }
    return true;
  },

  // =================================================================
  // Game end
  // =================================================================
  _endGame() {
    if (this._gameEnded) return;
    this._gameEnded = true;
    this._cleanup();

    const score = this.data.score;
    const gameId = this.data.gameId;
    let coins = 0, materials = 0, inspiration = 0, exp = 0;

    if (gameId === 'photo') {
      coins = Math.floor(score * 2);
      exp = Math.floor(score * 0.5);
    } else if (gameId === 'retouch') {
      // 配对完成奖励：剩余时间越多奖励越高
      const timeBonus = this._memMatched >= this._memTotal ? Math.floor(this.data.timeLeft / 10) : 0;
      materials = 10 + timeBonus;
      exp = 8 + Math.floor(timeBonus / 2);
    } else if (gameId === 'post') {
      inspiration = Math.floor(score * 0.8);
      exp = Math.floor(score * 0.4);
      // 保存2048最高分
      if (score > this.data.tBestScore) {
        wx.setStorageSync('T2048_BEST', score);
        this.setData({ tBestScore: score });
      }
    }

    const state = gameHelper.getState();
    if (coins > 0) gameHelper.addCoins(state, coins);
    if (materials > 0) gameHelper.addMaterials(state, materials);
    if (inspiration > 0) gameHelper.addInspiration(state, inspiration);
    if (exp > 0) gameHelper.addExp(state, exp);
    gameHelper.saveState(state);
    gameHelper.syncToPetState(state);
    gameHelper.addPlayLog(gameId, score, { coins, materials, inspiration, exp });
    gameHelper.recordGameResult(state, score, this.data.combo);

    const win = (gameId === 'retouch' && this._memMatched >= this._memTotal) ||
                (gameId === 'post' && score >= 1000);

    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
    this.setData({
      playing: false,
      result: { win, coins, materials, inspiration, exp, score },
    });
  },

  onResultTap() {
    this.setData({ result: null });
    wx.navigateBack();
  },
});
