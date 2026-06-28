// work_admin_ai.js — CC Switch style multi-provider management page
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

function defaultConfig() {
  return {
    enabled: false,
    providers: [],
    activeProviderId: '',
    personality: 'ops_cat',
    personalityName: '值班小猫',
    personalities: [
      { key: 'ops_cat', name: '值班小猫' },
      { key: 'gentle_cat', name: '温柔小猫' },
      { key: 'strict_cat', name: '审查小猫' },
      { key: 'sales_cat', name: '成交小猫' },
    ],
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 600,
    contextLimit: 128000,
    visionContextLimit: 128000,
    memoryEnabled: false,
    memoryText: '',
    agentCatalog: { skills: [], actions: [], stats: {} },
  };
}

function emptyProvider() {
  return {
    id: '',
    providerName: '',
    apiUrl: '',
    model: '',
    visionApiUrl: '',
    visionModel: '',
    apiKey: '',
    visionApiKey: '',
  };
}

Page({
  data: {
    isLoad: false,
    cfg: null,
    editorOpen: false,
    editIndex: -1,
    editForm: emptyProvider(),
    editKeyVisible: false,
    editVisionKeyVisible: false,
    switchOpen: false,
    modelLoading: false,
    advancedOpen: false,
    personalityIndex: 0,
    saving: false,
    '_editHasKey': false,
    '_editKeyMasked': '',
    '_editHasVisionKey': false,
    '_editVisionKeyMasked': '',
  },

  onLoad: async function () {
    ProjectBiz.initPage(this, { isLoadSkin: true });
    await this._loadDetail();
  },

  onPullDownRefresh: async function () {
    await this._loadDetail();
    wx.stopPullDownRefresh();
  },

  _loadDetail: async function () {
    let raw = await cloudHelper.callCloudData('work/admin_ai_config_get', {}, { title: this.data.isLoad ? 'bar' : '加载中..' });
    let cfg = Object.assign(defaultConfig(), raw || {});
    if (!cfg.providers) cfg.providers = [];
    if (!cfg.activeProviderId && cfg.providers.length > 0) {
      cfg.activeProviderId = cfg.providers[0].id;
    }
    const personalityIdx = this._personalityIndex(cfg);
    this.setData({
      isLoad: true,
      cfg,
      personalityIndex: personalityIdx,
      advancedOpen: false,
      editorOpen: false,
      editIndex: -1,
      editForm: emptyProvider(),
      editKeyVisible: false,
      editVisionKeyVisible: false,
      switchOpen: false,
    });
  },

  _personalityIndex: function (cfg) {
    if (!cfg.personalities || !cfg.personality) return 0;
    const idx = cfg.personalities.findIndex(p => p.key === cfg.personality);
    return idx >= 0 ? idx : 0;
  },

  _activeProvider: function () {
    const { cfg } = this.data;
    if (!cfg || !cfg.providers) return null;
    return cfg.providers.find(p => p.id === cfg.activeProviderId) || null;
  },

  _keyStatus: function (provider) {
    const key = provider.apiKey || '';
    if (!key) return { ready: false, masked: '', text: '未配置' };
    if (key.length <= 6) return { ready: true, masked: key.slice(0, 2) + '****', text: '已配置' };
    return { ready: true, masked: key.slice(0, 4) + '****' + key.slice(-4), text: '已配置' };
  },

  _initials: function (name) {
    if (!name) return '??';
    return name.slice(0, 2).toUpperCase();
  },

  _truncateUrl: function (url) {
    if (!url) return '';
    if (url.length <= 30) return url;
    return url.slice(0, 16) + '..' + url.slice(-10);
  },

  bindEnabledChange: function (e) {
    const val = !!e.detail.value;
    const cfg = { ...this.data.cfg, enabled: val };
    this.setData({ cfg });
    this._saveFullConfig(cfg);
  },

  bindTestChatTap: async function () {
    const active = this._activeProvider();
    if (!active) return pageHelper.showModal('请先添加至少一个供应商');
    if (!this.data.cfg.enabled) return pageHelper.showModal('请先开启 AI 小助手');
    try {
      const ret = await cloudHelper.callCloudSumbit('work/ai_chat', {
        message: '请用一句话介绍你能帮云屿摄影做什么',
        history: [],
      }, { title: '测试中..' });
      const res = ret && ret.data ? ret.data : null;
      pageHelper.showModal((res && res.reply) ? res.reply : 'AI 已响应，但没有返回文本');
    } catch (err) {
      console.error(err);
      pageHelper.showModal('测试失败，请检查 AI 配置和网络');
    }
  },

  bindSwitchProviderTap: function () {
    this.setData({ switchOpen: !this.data.switchOpen });
  },

  bindSelectProviderTap: function (e) {
    const id = e.currentTarget.dataset.id;
    if (!id || id === this.data.cfg.activeProviderId) {
      this.setData({ switchOpen: false });
      return;
    }
    const cfg = { ...this.data.cfg, activeProviderId: id };
    this.setData({ cfg, switchOpen: false });
    this._saveFullConfig(cfg);
  },

  bindEditProviderTap: function (e) {
    const idx = parseInt(e.currentTarget.dataset.index, 10);
    const provider = this.data.cfg.providers[idx];
    if (!provider) return;
    const keyStatus = this._keyStatus(provider);
    const vk = provider.visionApiKey || '';
    const visionKeyStatus = vk ? this._keyStatus({ apiKey: vk }) : { ready: false, masked: '' };
    this.setData({
      editIndex: idx,
      editForm: {
        providerName: provider.providerName || '',
        apiUrl: provider.apiUrl || '',
        model: provider.model || '',
        visionApiUrl: provider.visionApiUrl || '',
        visionModel: provider.visionModel || '',
        apiKey: '',
        visionApiKey: '',
      },
      editorOpen: true,
      editKeyVisible: false,
      editVisionKeyVisible: false,
      '_editHasKey': keyStatus.ready,
      '_editKeyMasked': keyStatus.masked,
      '_editHasVisionKey': visionKeyStatus.ready,
      '_editVisionKeyMasked': visionKeyStatus.masked,
    });
  },

  bindAddProviderTap: function () {
    const nowId = 'p' + Date.now();
    const empty = emptyProvider();
    empty.id = nowId;
    this.setData({
      editIndex: (this.data.cfg.providers || []).length,
      editForm: empty,
      editorOpen: true,
      editKeyVisible: false,
      editVisionKeyVisible: false,
      '_editHasKey': false,
      '_editKeyMasked': '',
      '_editHasVisionKey': false,
      '_editVisionKeyMasked': '',
    });
  },

  bindEditorCancelTap: function () {
    this.setData({ editorOpen: false, editIndex: -1, editForm: emptyProvider() });
  },

  bindProviderInput: function (e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ ['editForm.' + field]: value });
  },

  bindEditorToggleKeyTap: function () {
    this.setData({ editKeyVisible: !this.data.editKeyVisible });
  },

  bindEditorToggleVisionKeyTap: function () {
    this.setData({ editVisionKeyVisible: !this.data.editVisionKeyVisible });
  },

  bindEditorPasteKeyTap: async function () {
    try {
      const data = await wx.getClipboardData({});
      this.setData({ 'editForm.apiKey': data.data || '' });
    } catch (_) {}
  },

  bindEditorPasteVisionKeyTap: async function () {
    try {
      const data = await wx.getClipboardData({});
      this.setData({ 'editForm.visionApiKey': data.data || '' });
    } catch (_) {}
  },

  bindEditorClearKeyTap: function () {
    this.setData({ 'editForm.apiKey': '' });
  },

  bindEditorClearVisionKeyTap: function () {
    this.setData({ 'editForm.visionApiKey': '' });
  },

  bindEditorTestModelsTap: async function () {
    const form = this.data.editForm;
    if (!form.apiUrl) return pageHelper.showModal('请先填写 API 地址');
    this.setData({ modelLoading: true });
    try {
      const ret = await cloudHelper.callCloudSumbit('work/admin_ai_models_get', {
        apiUrl: form.apiUrl,
        apiKey: form.apiKey || '__skip__',
      }, { title: '获取模型列表' });
      const models = ret && ret.data ? ret.data : null;
      if (!models || (Array.isArray(models) && models.length === 0)) {
        pageHelper.showModal('未获取到模型列表，请检查 API 地址和 Key');
      } else {
        const list = Array.isArray(models) ? models : (models.models || models.data || []);
        const names = list.map(m => m.id || m.name || String(m)).join('\n');
        pageHelper.showModal('可用模型：\n' + names);
      }
    } catch (err) {
      console.error(err);
      pageHelper.showModal('获取模型列表失败：' + (err.errMsg || '网络错误'));
    }
    this.setData({ modelLoading: false });
  },

  bindEditorDeleteTap: function () {
    const { cfg, editIndex } = this.data;
    const providers = [...(cfg.providers || [])];
    if (providers.length <= 1) {
      return pageHelper.showModal('至少保留一个供应商，无法删除');
    }
    const deletedId = providers[editIndex] ? providers[editIndex].id : null;
    providers.splice(editIndex, 1);
    let activeProviderId = cfg.activeProviderId;
    if (deletedId && activeProviderId === deletedId) {
      activeProviderId = providers[0] ? providers[0].id : '';
    }
    const newCfg = { ...cfg, providers, activeProviderId };
    this.setData({ cfg: newCfg, editorOpen: false, editIndex: -1, editForm: emptyProvider() });
    this._saveFullConfig(newCfg);
  },

  bindEditorSaveTap: function () {
    if (this.data.saving) return;
    const form = { ...this.data.editForm };
    form.providerName = (form.providerName || '').trim();
    form.apiUrl = (form.apiUrl || '').trim();
    form.model = (form.model || '').trim();
    form.visionApiUrl = (form.visionApiUrl || '').trim();
    form.visionModel = (form.visionModel || '').trim();

    if (!form.providerName) return pageHelper.showModal('请填写供应商名称');
    if (!form.apiUrl || !/^https:\/\//.test(form.apiUrl)) {
      return pageHelper.showModal('API 地址必须以 https:// 开头');
    }
    if (!form.model) return pageHelper.showModal('请填写模型名称');

    const { cfg, editIndex } = this.data;
    const providers = [...(cfg.providers || [])];
    const existing = providers[editIndex];

    const merged = {
      id: existing ? existing.id : ('p' + Date.now()),
      providerName: form.providerName,
      apiUrl: form.apiUrl,
      model: form.model,
      visionApiUrl: form.visionApiUrl,
      visionModel: form.visionModel,
      apiKey: form.apiKey || (existing ? existing.apiKey || '' : ''),
      visionApiKey: form.visionApiKey || (existing ? existing.visionApiKey || '' : ''),
    };

    if (existing) {
      providers[editIndex] = merged;
    } else {
      providers.push(merged);
    }

    let activeProviderId = cfg.activeProviderId;
    if (!activeProviderId) {
      activeProviderId = merged.id;
    }

    const newCfg = { ...cfg, providers, activeProviderId };
    this.setData({ cfg: newCfg, editorOpen: false, editIndex: -1, editForm: emptyProvider() });
    this._saveFullConfig(newCfg);
  },

  bindPersonalityChange: function (e) {
    const idx = parseInt(e.detail.value, 10);
    const per = this.data.cfg.personalities[idx];
    if (!per) return;
    const cfg = { ...this.data.cfg, personality: per.key, personalityName: per.name };
    this.setData({ cfg, personalityIndex: idx });
    this._saveFullConfig(cfg);
  },

  bindToggleAdvancedTap: function () {
    this.setData({ advancedOpen: !this.data.advancedOpen });
  },

  bindInput: function (e) {
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;
    if (field === 'temperature') value = Number(value) || 0;
    if (field === 'maxTokens') value = Number(value) || 0;
    this.setData({ ['cfg.' + field]: value });
  },

  bindMemoryEnabledChange: function (e) {
    const val = !!e.detail.value;
    const cfg = { ...this.data.cfg, memoryEnabled: val };
    this.setData({ cfg });
    this._saveFullConfig(cfg);
  },

  _saveFullConfig: async function (cfg) {
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      const payload = {
        providers: (cfg.providers || []).map(p => ({
          id: p.id,
          providerName: p.providerName || '',
          apiUrl: p.apiUrl || '',
          model: p.model || '',
          visionApiUrl: p.visionApiUrl || '',
          visionModel: p.visionModel || '',
          apiKey: p.apiKey || '',
          visionApiKey: p.visionApiKey || '',
        })),
        activeProviderId: cfg.activeProviderId || '',
        personality: cfg.personality || 'ops_cat',
        systemPrompt: (cfg.systemPrompt || '').trim(),
        temperature: Number(cfg.temperature || 0.7),
        maxTokens: Number(cfg.maxTokens || 600),
        memoryEnabled: !!cfg.memoryEnabled,
        memoryText: (cfg.memoryText || '').trim(),
      };
      const ret = await cloudHelper.callCloudSumbit('work/admin_ai_providers_save', payload, { title: '保存中..' });
      const saved = ret && ret.data ? ret.data : null;
      if (saved) {
        const merged = Object.assign({}, cfg);
        if (saved.hasApiKey !== undefined) merged.hasApiKey = saved.hasApiKey;
        if (saved.apiKeyMasked !== undefined) merged.apiKeyMasked = saved.apiKeyMasked;
        this.setData({ cfg: merged });
      }
    } catch (err) {
      console.error(err);
      pageHelper.showErrToast('保存失败');
    }
    this.setData({ saving: false });
  },
});
