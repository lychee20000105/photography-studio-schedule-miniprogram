/**
 * Notes: 小猫小游戏数据管理
 * Ver : 2.59.0
 * Date: 2026-07-08
 */

const GAME_STATE_KEY = 'WORK_CAT_GAME_STATE';
const GAME_PLAY_LOG_KEY = 'WORK_CAT_GAME_PLAY_LOG';
const PET_KEY = 'WORK_PET_STATE';

const MAX_LEVEL = 20;
const MAX_RESOURCE = 9999999;

const PHASES = {
  intern: { label: '见习店长', levelRange: [1, 5], desc: '学习接待、照顾店铺和整理档期' },
  junior: { label: '独立店长', levelRange: [6, 10], desc: '能稳定完成接单和客户跟进' },
  senior: { label: '资深店长', levelRange: [11, 15], desc: '能统筹订单、员工和拍摄节奏' },
  manager: { label: '云屿主理猫', levelRange: [16, 20], desc: '守住店铺秩序，也守住客户体验' },
};

const GAME_TYPES = [
  {
    id: 'care',
    name: '小猫店长养成',
    desc: '喂食、玩耍、休息、清洁，让小猫保持好状态。',
    reward: 'exp',
    icon: 'cat',
  },
  {
    id: 'tower',
    name: '小猫守店塔防',
    desc: '布置员工塔，拦住混乱订单和临时改期。',
    reward: 'coins',
    icon: 'shield',
  },
];

function clamp(num, min, max) {
  num = Number(num);
  if (Number.isNaN(num)) num = min;
  return Math.max(min, Math.min(max, num));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function defaultState() {
  return {
    phase: 'intern',
    level: 1,
    exp: 0,
    coins: 120,
    care: {
      hunger: 72,
      mood: 70,
      energy: 68,
      clean: 76,
    },
    dailyCheckin: false,
    dailyCheckinDate: '',
    dailyTaskDate: '',
    dailyTasks: [],
    dailyPlayCount: 0,
    dailyCareCount: 0,
    dailyTowerWin: 0,
    dailyBestScore: 0,
    lastActiveTime: Date.now(),
  };
}

function normalizeState(state) {
  const base = defaultState();
  if (!state || typeof state !== 'object') state = {};
  state = Object.assign({}, base, state);
  state.care = Object.assign({}, base.care, state.care || {});

  state.level = clamp(state.level, 1, MAX_LEVEL);
  state.exp = Math.max(0, Number(state.exp) || 0);
  state.coins = clamp(state.coins, 0, MAX_RESOURCE);
  state.care.hunger = clamp(state.care.hunger, 0, 100);
  state.care.mood = clamp(state.care.mood, 0, 100);
  state.care.energy = clamp(state.care.energy, 0, 100);
  state.care.clean = clamp(state.care.clean, 0, 100);
  state.phase = getPhase(state.level);
  initDailyTasks(state);
  return state;
}

function getState() {
  let state = wx.getStorageSync(GAME_STATE_KEY);
  state = normalizeState(state);
  try { wx.setStorageSync(GAME_STATE_KEY, state); } catch (e) {}
  return state;
}

function saveState(state) {
  if (!state) return;
  state.lastActiveTime = Date.now();
  try {
    wx.setStorageSync(GAME_STATE_KEY, normalizeState(state));
  } catch (e) {
    console.warn('[game_helper] saveState failed:', e);
  }
}

function getPhase(level) {
  for (const key of ['manager', 'senior', 'junior', 'intern']) {
    const item = PHASES[key];
    if (level >= item.levelRange[0] && level <= item.levelRange[1]) return key;
  }
  return 'intern';
}

function getPhaseInfo(phase) {
  return PHASES[phase] || PHASES.intern;
}

function getExpToNextLevel(level) {
  return level * 45;
}

function addExp(state, amount) {
  if (!state || amount <= 0) return state;
  state.exp += amount;
  while (state.level < MAX_LEVEL) {
    const need = getExpToNextLevel(state.level);
    if (state.exp < need) break;
    state.exp -= need;
    state.level += 1;
  }
  if (state.level >= MAX_LEVEL) state.exp = 0;
  state.phase = getPhase(state.level);
  return state;
}

function addCoins(state, amount) {
  if (!state || amount <= 0) return state;
  state.coins = clamp((state.coins || 0) + amount, 0, MAX_RESOURCE);
  return state;
}

function spendCoins(state, amount) {
  if (!state || amount <= 0) return false;
  if ((state.coins || 0) < amount) return false;
  state.coins -= amount;
  return true;
}

function calcCareScore(state) {
  const c = state.care || {};
  return Math.floor(((c.hunger || 0) + (c.mood || 0) + (c.energy || 0) + (c.clean || 0)) / 4);
}

function applyCareAction(state, actionId) {
  state = normalizeState(state);
  const c = state.care;
  const actions = {
    feed: { name: '喂食', cost: 8, exp: 4, care: { hunger: 18, mood: 3, clean: -3 } },
    play: { name: '玩耍', cost: 6, exp: 6, care: { mood: 18, energy: -8, hunger: -4 } },
    rest: { name: '休息', cost: 0, exp: 3, care: { energy: 20, mood: 4, hunger: -5 } },
    clean: { name: '清洁', cost: 5, exp: 5, care: { clean: 22, mood: 2, energy: -3 } },
  };
  const action = actions[actionId];
  if (!action) return { ok: false, msg: '养成动作不存在' };
  if (action.cost && !spendCoins(state, action.cost)) return { ok: false, msg: '金币不够啦' };

  Object.keys(action.care).forEach(key => {
    c[key] = clamp((c[key] || 0) + action.care[key], 0, 100);
  });
  addExp(state, action.exp);
  state.dailyCareCount = (state.dailyCareCount || 0) + 1;
  saveState(state);
  syncToPetState(state);
  addPlayLog('care', calcCareScore(state), { exp: action.exp, coins: -action.cost });
  return { ok: true, action, state, score: calcCareScore(state) };
}

function claimDailyCheckin(state) {
  state = normalizeState(state);
  const today = todayKey();
  if (state.dailyCheckinDate === today && state.dailyCheckin) {
    return { ok: false, msg: '今天已经签到过啦' };
  }
  state.dailyCheckin = true;
  state.dailyCheckinDate = today;
  addCoins(state, 20);
  addExp(state, 5);
  state.care.mood = clamp(state.care.mood + 6, 0, 100);
  saveState(state);
  return { ok: true, coins: 20, exp: 5 };
}

function calcOfflineReward(state) {
  state = normalizeState(state);
  const elapsed = Date.now() - (state.lastActiveTime || Date.now());
  const hours = elapsed / (1000 * 60 * 60);
  if (hours < 1) return null;
  const h = Math.min(Math.floor(hours), 12);
  return {
    coins: h * 3,
    exp: h * 2,
    hours: h,
  };
}

const DAILY_TASK_DEFS = [
  { id: 'checkin', desc: '完成今日签到', check: s => !!s.dailyCheckin, reward: { coins: 10, exp: 2 } },
  { id: 'care2', desc: '照顾小猫 2 次', check: s => (s.dailyCareCount || 0) >= 2, reward: { coins: 16, exp: 5 } },
  { id: 'play1', desc: '玩任意小游戏 1 局', check: s => (s.dailyPlayCount || 0) >= 1, reward: { coins: 20, exp: 6 } },
  { id: 'tower1', desc: '守店塔防胜利 1 次', check: s => (s.dailyTowerWin || 0) >= 1, reward: { coins: 35, exp: 10 } },
];

function initDailyTasks(state) {
  const today = todayKey();
  if (state.dailyTaskDate !== today) {
    state.dailyTaskDate = today;
    state.dailyTasks = DAILY_TASK_DEFS.map(item => ({ id: item.id, claimed: false }));
    state.dailyCheckin = false;
    state.dailyPlayCount = 0;
    state.dailyCareCount = 0;
    state.dailyTowerWin = 0;
    state.dailyBestScore = 0;
  }
  if (!Array.isArray(state.dailyTasks)) {
    state.dailyTasks = DAILY_TASK_DEFS.map(item => ({ id: item.id, claimed: false }));
  }
  return state;
}

function getDailyTaskStatus(state) {
  state = normalizeState(state);
  return DAILY_TASK_DEFS.map(def => {
    const task = state.dailyTasks.find(item => item.id === def.id) || { claimed: false };
    return {
      id: def.id,
      desc: def.desc,
      done: def.check(state),
      claimed: !!task.claimed,
      reward: def.reward,
    };
  });
}

function claimDailyTask(state, taskId) {
  state = normalizeState(state);
  const def = DAILY_TASK_DEFS.find(item => item.id === taskId);
  if (!def) return { ok: false, msg: '任务不存在' };
  const task = state.dailyTasks.find(item => item.id === taskId);
  if (!task) return { ok: false, msg: '任务不存在' };
  if (task.claimed) return { ok: false, msg: '已经领取过啦' };
  if (!def.check(state)) return { ok: false, msg: '任务还没完成' };
  task.claimed = true;
  if (def.reward.coins) addCoins(state, def.reward.coins);
  if (def.reward.exp) addExp(state, def.reward.exp);
  saveState(state);
  return { ok: true, reward: def.reward };
}

function recordGameResult(state, gameId, result) {
  state = normalizeState(state);
  state.dailyPlayCount = (state.dailyPlayCount || 0) + 1;
  const score = Number(result.score) || 0;
  if (score > (state.dailyBestScore || 0)) state.dailyBestScore = score;
  if (gameId === 'tower' && result.win) state.dailyTowerWin = (state.dailyTowerWin || 0) + 1;
  if (result.coins) addCoins(state, result.coins);
  if (result.exp) addExp(state, result.exp);
  saveState(state);
  syncToPetState(state);
  addPlayLog(gameId, score, result);
}

function addPlayLog(gameId, score, reward) {
  try {
    let logs = wx.getStorageSync(GAME_PLAY_LOG_KEY);
    if (!Array.isArray(logs)) logs = [];
    logs.unshift({ gameId, score, reward, time: Date.now() });
    wx.setStorageSync(GAME_PLAY_LOG_KEY, logs.slice(0, 50));
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
      saveState(state);
    }
  } catch (e) {}
}

module.exports = {
  GAME_STATE_KEY,
  GAME_PLAY_LOG_KEY,
  PET_KEY,
  PHASES,
  GAME_TYPES,
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
  calcCareScore,
  applyCareAction,
  claimDailyCheckin,
  calcOfflineReward,
  initDailyTasks,
  getDailyTaskStatus,
  claimDailyTask,
  recordGameResult,
  addPlayLog,
  syncToPetState,
  syncFromPetState,
};
