/**
 * Notes: 小猫助手游戏数据管理
 * Ver : 1.0.0
 * Date: 2026-06-24
 */

const GAME_STATE_KEY = 'WORK_CAT_GAME_STATE';
const GAME_PLAY_LOG_KEY = 'WORK_CAT_GAME_PLAY_LOG';
const GAME_GUIDE_KEY = 'WORK_CAT_GAME_GUIDE';
const PET_KEY = 'WORK_PET_STATE';

const PHASES = {
  intern:   { label: '实习生', levelRange: [1, 5],  desc: '学拍照、整理道具' },
  junior:   { label: '初级员工', levelRange: [6, 10], desc: '独立接单、修图出片' },
  senior:   { label: '资深员工', levelRange: [11, 15], desc: '带新人、管排期' },
  manager:  { label: '工作室主管', levelRange: [16, 20], desc: '统筹全局、策划活动' },
};

const GAME_TYPES = [
  { id: 'photo',   name: '猫咪快抓', desc: '打地鼠！快速点击冒出来的角色', reward: 'coins', icon: 'camera' },
  { id: 'retouch', name: '记忆翻牌', desc: '翻牌配对！找出相同的装备', reward: 'materials', icon: 'edit' },
  { id: 'post',    name: '合成2048', desc: '滑动合成！合并相同摄影装备', reward: 'inspiration', icon: 'star' },
];

// 2048 颜色配置
const TILE_COLORS = {
  0:    { bg: '#cdc1b4', text: '#776e65' },
  2:    { bg: '#eee4da', text: '#776e65' },
  4:    { bg: '#ede0c8', text: '#776e65' },
  8:    { bg: '#f2b179', text: '#f9f6f2' },
  16:   { bg: '#f59563', text: '#f9f6f2' },
  32:   { bg: '#f67c5f', text: '#f9f6f2' },
  64:   { bg: '#f65e3b', text: '#f9f6f2' },
  128:  { bg: '#edcf72', text: '#f9f6f2' },
  256:  { bg: '#edcc61', text: '#f9f6f2' },
  512:  { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
};

function defaultState() {
  return {
    phase: 'intern',
    level: 1,
    exp: 0,
    coins: 100,
    materials: 0,
    inspiration: 0,
    dailyCheckin: false,
    dailyCheckinDate: '',
    dailyTasks: [],
    furniture: [],
    decor: [],
    collection: [],
    lastActiveTime: Date.now(),
  };
}

function getState() {
  let state = wx.getStorageSync(GAME_STATE_KEY);
  if (!state || typeof state !== 'object') {
    state = defaultState();
    try { wx.setStorageSync(GAME_STATE_KEY, state); } catch (e) {}
  }
  // Ensure level is within valid range [1, 20]
  state.level = Math.max(1, Math.min(20, Number(state.level) || 1));
  state.coins = Math.max(0, Number(state.coins) || 0);
  state.materials = Math.max(0, Number(state.materials) || 0);
  state.inspiration = Math.max(0, Number(state.inspiration) || 0);
  state.exp = Math.max(0, Number(state.exp) || 0);
  return state;
}

function saveState(state) {
  if (!state) return;
  state.lastActiveTime = Date.now();
  try {
    wx.setStorageSync(GAME_STATE_KEY, state);
  } catch (e) {
    // Storage quota exceeded or other error — degrade gracefully
    console.warn('[game_helper] saveState failed:', e);
  }
}

function getPhase(level) {
  for (const key of ['manager', 'senior', 'junior', 'intern']) {
    const p = PHASES[key];
    if (level >= p.levelRange[0] && level <= p.levelRange[1]) return key;
  }
  return 'intern';
}

function getPhaseInfo(phase) {
  return PHASES[phase] || PHASES.intern;
}

function getExpToNextLevel(level) {
  return level * 40;
}

function addExp(state, amount) {
  if (!state || amount <= 0) return state;
  state.exp += amount;
  while (state.level < 20) {
    const needed = getExpToNextLevel(state.level);
    if (state.exp < needed) break;
    state.exp -= needed;
    state.level += 1;
  }
  if (state.level >= 20) {
    state.exp = 0;
  }
  state.phase = getPhase(state.level);
  return state;
}

const MAX_RESOURCE = 9999999;

function addCoins(state, amount) {
  if (!state || amount <= 0) return state;
  state.coins = Math.min(MAX_RESOURCE, (state.coins || 0) + amount);
  return state;
}

function spendCoins(state, amount) {
  if (!state || amount <= 0) return false;
  if ((state.coins || 0) < amount) return false;
  state.coins -= amount;
  return true;
}

function addMaterials(state, amount) {
  if (!state || amount <= 0) return state;
  state.materials = Math.min(MAX_RESOURCE, (state.materials || 0) + amount);
  return state;
}

function addInspiration(state, amount) {
  if (!state || amount <= 0) return state;
  state.inspiration = Math.min(MAX_RESOURCE, (state.inspiration || 0) + amount);
  return state;
}

function claimDailyCheckin(state) {
  if (!state) return { ok: false, msg: '数据异常' };
  const today = new Date().toISOString().slice(0, 10);
  if (state.dailyCheckinDate === today && state.dailyCheckin) {
    return { ok: false, msg: '今天已经签到啦' };
  }
  state.dailyCheckin = true;
  state.dailyCheckinDate = today;
  state.coins = (state.coins || 0) + 20;
  addExp(state, 5);
  saveState(state);
  return { ok: true, coins: 20, exp: 5 };
}

function calcOfflineReward(state) {
  if (!state || !state.lastActiveTime) return null;
  const now = Date.now();
  const elapsed = now - state.lastActiveTime;
  const hours = elapsed / (1000 * 60 * 60);
  if (hours < 1) return null;
  const maxHours = Math.min(hours, 24);
  const coins = Math.floor(maxHours * 3);
  const materials = Math.floor(maxHours * 1.5);
  const inspiration = Math.floor(maxHours * 1);
  const exp = Math.floor(maxHours * 2);
  return { coins, materials, inspiration, exp, hours: Math.floor(maxHours) };
}

// ===== 每日任务系统 =====
const DAILY_TASK_DEFS = [
  { id: 'play1',    desc: '玩一局小游戏',       check: (s) => s.dailyPlayCount >= 1,  reward: { coins: 15, exp: 3 } },
  { id: 'play3',    desc: '玩3局小游戏',         check: (s) => s.dailyPlayCount >= 3,  reward: { coins: 30, exp: 8 } },
  { id: 'checkin',  desc: '每日签到',             check: (s) => s.dailyCheckin,         reward: { coins: 10, exp: 2 } },
  { id: 'score10',  desc: '单局得分超过10',       check: (s) => s.dailyBestScore >= 10, reward: { coins: 20, exp: 5 } },
  { id: 'combo5',   desc: '达成5连击',            check: (s) => s.dailyBestCombo >= 5,  reward: { coins: 25, exp: 6 } },
];

function initDailyTasks(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.dailyTaskDate !== today) {
    state.dailyTaskDate = today;
    state.dailyTasks = DAILY_TASK_DEFS.map(t => ({ id: t.id, claimed: false }));
    state.dailyPlayCount = 0;
    state.dailyBestScore = 0;
    state.dailyBestCombo = 0;
  }
  if (!state.dailyTasks || !Array.isArray(state.dailyTasks)) {
    state.dailyTasks = DAILY_TASK_DEFS.map(t => ({ id: t.id, claimed: false }));
  }
  return state;
}

function getDailyTaskStatus(state) {
  initDailyTasks(state);
  return DAILY_TASK_DEFS.map(def => {
    const task = state.dailyTasks.find(t => t.id === def.id) || { claimed: false };
    return {
      id: def.id,
      desc: def.desc,
      done: def.check(state),
      claimed: task.claimed,
      reward: def.reward,
    };
  });
}

function claimDailyTask(state, taskId) {
  initDailyTasks(state);
  const def = DAILY_TASK_DEFS.find(t => t.id === taskId);
  if (!def) return { ok: false, msg: '任务不存在' };
  const task = state.dailyTasks.find(t => t.id === taskId);
  if (!task) return { ok: false, msg: '任务不存在' };
  if (task.claimed) return { ok: false, msg: '已领取' };
  if (!def.check(state)) return { ok: false, msg: '未完成' };
  task.claimed = true;
  if (def.reward.coins) addCoins(state, def.reward.coins);
  if (def.reward.materials) addMaterials(state, def.reward.materials);
  if (def.reward.inspiration) addInspiration(state, def.reward.inspiration);
  if (def.reward.exp) addExp(state, def.reward.exp);
  saveState(state);
  return { ok: true, reward: def.reward };
}

function recordGameResult(state, score, combo) {
  initDailyTasks(state);
  state.dailyPlayCount = (state.dailyPlayCount || 0) + 1;
  if (score > (state.dailyBestScore || 0)) state.dailyBestScore = score;
  if (combo > (state.dailyBestCombo || 0)) state.dailyBestCombo = combo;
  saveState(state);
}

function addPlayLog(gameId, score, reward) {
  try {
    let logs = wx.getStorageSync(GAME_PLAY_LOG_KEY);
    if (!Array.isArray(logs)) logs = [];
    logs.unshift({
      gameId,
      score,
      reward,
      time: Date.now(),
    });
    if (logs.length > 50) logs = logs.slice(0, 50);
    wx.setStorageSync(GAME_PLAY_LOG_KEY, logs);
  } catch (e) {
    console.warn('[game_helper] addPlayLog failed:', e);
  }
}

function syncToPetState(gameState) {
  try {
    let pet = wx.getStorageSync(PET_KEY);
    if (!pet || typeof pet !== 'object') return;
    pet.level = gameState.level;
    pet.exp = gameState.exp;
    pet.lastCareTime = Date.now();
    wx.setStorageSync(PET_KEY, pet);
  } catch (e) {}
}

function syncFromPetState() {
  try {
    const pet = wx.getStorageSync(PET_KEY);
    if (!pet || typeof pet !== 'object') return;
    const state = getState();
    if (pet.level > state.level) {
      state.level = pet.level;
      state.exp = pet.exp || 0;
      state.phase = getPhase(state.level);
    }
    saveState(state);
  } catch (e) {}
}

module.exports = {
  PHASES,
  GAME_TYPES,
  TILE_COLORS,
  GAME_STATE_KEY,
  GAME_PLAY_LOG_KEY,
  GAME_GUIDE_KEY,
  DAILY_TASK_DEFS,
  defaultState,
  getState,
  saveState,
  getPhase,
  getPhaseInfo,
  getExpToNextLevel,
  addExp,
  addCoins,
  spendCoins,
  addMaterials,
  addInspiration,
  claimDailyCheckin,
  calcOfflineReward,
  addPlayLog,
  syncToPetState,
  syncFromPetState,
  initDailyTasks,
  getDailyTaskStatus,
  claimDailyTask,
  recordGameResult,
};
