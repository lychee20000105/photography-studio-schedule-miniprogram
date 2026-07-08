const gameHelper = require('../../../../../helper/game_helper.js');

const CARE_ACTIONS = [
  { id: 'feed', name: '喂食', desc: '饱腹 +18，消耗 8 金币' },
  { id: 'play', name: '玩耍', desc: '心情 +18，消耗 6 金币' },
  { id: 'rest', name: '休息', desc: '体力 +20，不消耗金币' },
  { id: 'clean', name: '清洁', desc: '清洁 +22，消耗 5 金币' },
];

const TOWER_TYPES = [
  { id: 'photo', name: '摄影师塔', short: '摄', cost: 35, range: 24, damage: 16, speed: 1, desc: '均衡输出' },
  { id: 'makeup', name: '化妆师塔', short: '妆', cost: 45, range: 20, damage: 26, speed: 0.7, desc: '高伤害' },
  { id: 'service', name: '客服塔', short: '客', cost: 30, range: 30, damage: 9, speed: 1.5, desc: '攻速快' },
];

const TOWER_SLOTS = [
  { id: 0, x: 24, y: 28 },
  { id: 1, x: 54, y: 28 },
  { id: 2, x: 74, y: 44 },
  { id: 3, x: 22, y: 62 },
  { id: 4, x: 48, y: 72 },
  { id: 5, x: 72, y: 72 },
];

const PATH = [
  { x: 4, y: 48 },
  { x: 24, y: 48 },
  { x: 24, y: 18 },
  { x: 55, y: 18 },
  { x: 55, y: 58 },
  { x: 86, y: 58 },
  { x: 96, y: 40 },
];

const ENEMY_TYPES = [
  { id: 'chaos', name: '混乱订单', short: '乱', hp: 45, speed: 0.38, damage: 1, reward: 8 },
  { id: 'change', name: '临时改期', short: '改', hp: 70, speed: 0.28, damage: 1, reward: 12 },
  { id: 'complaint', name: '客诉风险', short: '诉', hp: 110, speed: 0.2, damage: 2, reward: 18 },
];

Page({
  data: {
    gameId: 'care',
    gameInfo: null,
    careActions: CARE_ACTIONS,
    gameState: null,
    careScore: 0,
    selectedTower: 'photo',
    towerTypes: TOWER_TYPES,
    towerSlots: TOWER_SLOTS,
    towers: [],
    enemies: [],
    wave: 0,
    lives: 8,
    coins: 120,
    score: 0,
    playing: false,
    result: null,
    logText: '选择塔位，守住今天的店铺秩序。',
  },

  _loop: null,
  _spawn: null,
  _enemySeq: 1,
  _spawnLeft: 0,
  _waveMax: 5,

  onLoad(options) {
    const gameId = options.id || 'care';
    const gameInfo = gameHelper.GAME_TYPES.find(item => item.id === gameId) || gameHelper.GAME_TYPES[0];
    this.setData({ gameId, gameInfo });
  },

  onShow() {
    const gameState = gameHelper.getState();
    this.setData({
      gameState,
      careScore: gameHelper.calcCareScore(gameState),
      coins: Math.max(120, gameState.coins || 120),
    });
  },

  onHide() {
    this._stopTower();
  },

  onUnload() {
    this._stopTower();
  },

  onCareActionTap(e) {
    const result = gameHelper.applyCareAction(this.data.gameState, e.currentTarget.dataset.id);
    if (!result.ok) {
      wx.showToast({ title: result.msg, icon: 'none' });
      return;
    }
    try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
    this.setData({
      gameState: result.state,
      careScore: result.score,
      logText: `${result.action.name}完成，小猫状态 ${result.score}`,
    });
  },

  onSelectTower(e) {
    this.setData({ selectedTower: e.currentTarget.dataset.id });
  },

  onStartTower() {
    this._stopTower();
    this._enemySeq = 1;
    this._spawnLeft = 0;
    this.setData({
      playing: true,
      result: null,
      wave: 0,
      lives: 8,
      coins: Math.max(120, this.data.gameState.coins || 120),
      score: 0,
      towers: [],
      enemies: [],
      logText: '第一波混乱订单来了。',
    });
    this._nextWave();
    this._loop = setInterval(() => this._tickTower(), 350);
  },

  onSlotTap(e) {
    if (!this.data.playing) return;
    const slotId = Number(e.currentTarget.dataset.id);
    if (this.data.towers.find(item => item.slotId === slotId)) {
      wx.showToast({ title: '这里已经有员工塔啦', icon: 'none' });
      return;
    }
    const tower = TOWER_TYPES.find(item => item.id === this.data.selectedTower) || TOWER_TYPES[0];
    if (this.data.coins < tower.cost) {
      wx.showToast({ title: '金币不够，先拦几单再升级', icon: 'none' });
      return;
    }
    const slot = TOWER_SLOTS.find(item => item.id === slotId);
    const towers = this.data.towers.concat([Object.assign({}, tower, {
      slotId,
      x: slot.x,
      y: slot.y,
      cooldown: 0,
    })]);
    this.setData({
      towers,
      coins: this.data.coins - tower.cost,
      logText: `${tower.name}已就位`,
    });
  },

  _nextWave() {
    const wave = this.data.wave + 1;
    if (wave > this._waveMax) return;
    this._spawnLeft = 5 + wave * 2;
    this.setData({ wave, logText: `第 ${wave} 波开始` });
    if (this._spawn) clearInterval(this._spawn);
    this._spawn = setInterval(() => this._spawnEnemy(), Math.max(650, 1100 - wave * 70));
  },

  _spawnEnemy() {
    if (!this.data.playing || this._spawnLeft <= 0) {
      if (this._spawn) clearInterval(this._spawn);
      this._spawn = null;
      return;
    }
    const wave = this.data.wave;
    let type = ENEMY_TYPES[0];
    if (wave >= 3 && Math.random() > 0.55) type = ENEMY_TYPES[1];
    if (wave >= 5 && Math.random() > 0.7) type = ENEMY_TYPES[2];
    const enemy = Object.assign({}, type, {
      uid: this._enemySeq++,
      maxHp: type.hp + wave * 10,
      hp: type.hp + wave * 10,
      progress: 0,
      x: PATH[0].x,
      y: PATH[0].y,
    });
    this._spawnLeft -= 1;
    this.setData({ enemies: this.data.enemies.concat([enemy]) });
  },

  _tickTower() {
    if (!this.data.playing) return;
    let enemies = this.data.enemies.map(item => Object.assign({}, item));
    let towers = this.data.towers.map(item => Object.assign({}, item));
    let lives = this.data.lives;
    let coins = this.data.coins;
    let score = this.data.score;

    enemies.forEach(enemy => {
      enemy.progress += enemy.speed + this.data.wave * 0.015;
      const pos = this._pointOnPath(enemy.progress);
      enemy.x = pos.x;
      enemy.y = pos.y;
    });

    enemies = enemies.filter(enemy => {
      if (enemy.progress >= 100) {
        lives -= enemy.damage;
        return false;
      }
      return enemy.hp > 0;
    });

    towers.forEach(tower => {
      tower.cooldown = Math.max(0, (tower.cooldown || 0) - 1);
      if (tower.cooldown > 0) return;
      let target = null;
      let bestDist = 999;
      enemies.forEach(enemy => {
        const dist = Math.sqrt(Math.pow(enemy.x - tower.x, 2) + Math.pow(enemy.y - tower.y, 2));
        if (dist <= tower.range && dist < bestDist) {
          target = enemy;
          bestDist = dist;
        }
      });
      if (!target) return;
      target.hp -= tower.damage;
      tower.cooldown = Math.max(1, Math.round(4 / tower.speed));
      if (target.hp <= 0 && !target.deadCounted) {
        target.deadCounted = true;
        coins += target.reward;
        score += target.reward * 2;
      }
    });

    enemies = enemies.filter(enemy => enemy.hp > 0);
    this.setData({ enemies, towers, lives, coins, score });

    if (lives <= 0) {
      this._finishTower(false);
      return;
    }
    if (!this._spawn && this._spawnLeft <= 0 && enemies.length === 0) {
      if (this.data.wave >= this._waveMax) this._finishTower(true);
      else this._nextWave();
    }
  },

  _pointOnPath(progress) {
    const total = PATH.length - 1;
    const raw = (progress / 100) * total;
    const idx = Math.min(total - 1, Math.floor(raw));
    const local = raw - idx;
    const a = PATH[idx];
    const b = PATH[idx + 1];
    return {
      x: a.x + (b.x - a.x) * local,
      y: a.y + (b.y - a.y) * local,
    };
  },

  _finishTower(win) {
    this._stopTower();
    const result = {
      win,
      score: this.data.score,
      coins: win ? 60 + Math.floor(this.data.score / 6) : Math.floor(this.data.score / 10),
      exp: win ? 24 : 10,
    };
    const state = gameHelper.getState();
    gameHelper.recordGameResult(state, 'tower', result);
    this.setData({
      playing: false,
      result,
      gameState: gameHelper.getState(),
      logText: win ? '守店成功，今天稳住了。' : '店铺被冲乱了，下次多放客服塔。',
    });
  },

  _stopTower() {
    if (this._loop) clearInterval(this._loop);
    if (this._spawn) clearInterval(this._spawn);
    this._loop = null;
    this._spawn = null;
  },

  onResultBack() {
    wx.navigateBack();
  },
});
