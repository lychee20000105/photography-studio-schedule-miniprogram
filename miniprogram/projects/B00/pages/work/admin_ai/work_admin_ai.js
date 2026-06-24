const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

const PROVIDER_PRESETS = [
	{
		id: 'agnes',
		name: 'Agnes',
		providerName: 'Agnes APIHub',
		website: 'https://apihub.agnes-ai.com',
		apiUrl: 'https://apihub.agnes-ai.com/v1',
		model: 'gpt-4o-mini',
		visionApiUrl: '',
		visionModel: '',
		remark: '聚合兼容接口',
	},
	{
		id: 'deepseek',
		name: 'DeepSeek',
		providerName: 'DeepSeek',
		website: 'https://platform.deepseek.com',
		apiUrl: 'https://api.deepseek.com/v1',
		model: 'deepseek-chat',
		visionApiUrl: '',
		visionModel: '',
		remark: '纯文本模型',
	},
	{
		id: 'openai',
		name: 'OpenAI',
		providerName: 'OpenAI兼容接口',
		website: 'https://platform.openai.com',
		apiUrl: 'https://api.openai.com/v1',
		model: 'gpt-4o-mini',
		visionApiUrl: '',
		visionModel: 'gpt-4o-mini',
		remark: '官方兼容接口',
	},
	{
		id: 'mimo',
		name: 'Mimo',
		providerName: 'Mimo',
		website: 'https://api.xiaomimimo.com',
		apiUrl: 'https://api.xiaomimimo.com/v1',
		model: 'mimo-v2.5',
		visionApiUrl: '',
		visionModel: '',
		remark: '小米 MiMo',
	},
	{
		id: 'custom',
		name: '自定义',
		providerName: '自定义兼容接口',
		website: '',
		apiUrl: '',
		model: '',
		visionApiUrl: '',
		visionModel: '',
		remark: '任意 OpenAI 兼容接口',
		custom: true,
	},
];

function defaultProviderEditForm() {
	return {
		id: '',
		name: '',
		providerName: '',
		website: '',
		apiUrl: '',
		model: '',
		visionApiUrl: '',
		visionModel: '',
		remark: '',
		apiKey: '',
	};
}

function defaultForm() {
	return {
		enabled: false,
		providerName: 'Mimo',
		apiUrl: 'https://api.xiaomimimo.com/v1',
		model: 'mimo-v2.5',
		visionApiUrl: '',
		visionModel: 'gpt-4o-mini',
		personality: 'ops_cat',
		personalityName: '值班小猫',
		personalities: [
			{ key: 'ops_cat', name: '值班小猫' },
			{ key: 'gentle_cat', name: '温柔小猫' },
			{ key: 'strict_cat', name: '审查小猫' },
			{ key: 'sales_cat', name: '成交小猫' },
		],
		systemPrompt: '你是云屿摄影小程序里的小猫 AI 助手，语气简洁、友好、务实。你主要帮助摄影工作室员工记录订单、梳理档期、整理客户跟进事项、解释小程序功能。不要编造系统里真实存在的数据；能通过工具查询的数据要主动查询。',
		temperature: 0.7,
		maxTokens: 600,
		contextLimit: 128000,
		visionContextLimit: 128000,
		memoryEnabled: false,
		memoryText: '',
		agentCatalog: {
			skills: [],
			actions: [],
			stats: {},
		},
	};
}

Page({
	data: {
		isLoad: false,
		form: defaultForm(),
		providerPresets: PROVIDER_PRESETS,
		providerPresetIndex: 0,
		providerCards: [],
		providerEditorOpen: false,
		providerEditIndex: -1,
		providerEditForm: defaultProviderEditForm(),
		providerEditKeyVisible: false,
		keyInput: '',
		visionKeyInput: '',
		clearKey: false,
		clearVisionKey: false,
		hasApiKey: false,
		hasVisionApiKey: false,
		apiKeyMasked: '',
		visionApiKeyMasked: '',
		showKeyInput: false,
		showVisionKeyInput: false,
		keyPlaceholder: 'sk-...',
		visionKeyPlaceholder: '留空沿用主 Key',
		textModelOptions: [],
		textModelIndex: 0,
		textModelPickerText: '从已获取列表选择',
		visionModelOptions: [],
		visionModelIndex: 0,
		visionModelPickerText: '从已获取列表选择',
		personalityIndex: 0,
		modelLoading: false,
		modelLoadingTarget: '',
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
		let cfg = await cloudHelper.callCloudData('work/admin_ai_config_get', {}, { title: this.data.isLoad ? 'bar' : '加载中' });
		cfg = Object.assign(defaultForm(), cfg || {});
		if (!cfg.visionContextLimit) cfg.visionContextLimit = this._guessContextLimit(cfg.visionModel || cfg.model);
		let textModelState = this._buildModelPickerState(this.data.textModelOptions, cfg.model, '从已获取列表选择');
		let visionModelState = this._buildModelPickerState(this.data.visionModelOptions, cfg.visionModel, '从已获取列表选择');
		let personalityState = this._buildPersonalityState(cfg.personalities, cfg.personality);
		this.setData({
			isLoad: true,
			form: cfg,
			providerPresetIndex: this._buildPresetState(cfg),
			providerCards: this._buildProviderCards(cfg),
			keyInput: '',
			visionKeyInput: '',
			clearKey: false,
			clearVisionKey: false,
			hasApiKey: !!cfg.hasApiKey,
			hasVisionApiKey: !!cfg.hasVisionApiKey,
			apiKeyMasked: cfg.apiKeyMasked || '',
			visionApiKeyMasked: cfg.visionApiKeyMasked || '',
			showKeyInput: false,
			showVisionKeyInput: false,
			keyPlaceholder: cfg.hasApiKey ? ('已保存：' + (cfg.apiKeyMasked || '******') + '，留空不修改') : 'sk-...',
			visionKeyPlaceholder: cfg.hasVisionApiKey ? ('已保存：' + (cfg.visionApiKeyMasked || '******') + '，留空不修改') : '留空沿用主 Key',
			textModelIndex: textModelState.modelIndex,
			textModelPickerText: textModelState.modelPickerText,
			visionModelIndex: visionModelState.modelIndex,
			visionModelPickerText: visionModelState.modelPickerText,
			personalityIndex: personalityState.personalityIndex,
		});
	},

	bindPresetTap: function (e) {
		let index = Number(e.currentTarget.dataset.index || 0);
		let preset = PROVIDER_PRESETS[index] || PROVIDER_PRESETS[0];
		let form = Object.assign({}, this.data.form);
		form.providerName = preset.providerName || form.providerName;
		form.apiUrl = preset.custom ? (preset.apiUrl || '') : (preset.apiUrl || form.apiUrl);
		form.model = preset.custom ? (preset.model || '') : (preset.model || form.model);
		form.visionApiUrl = preset.visionApiUrl || '';
		form.visionModel = preset.visionModel || '';
		form.contextLimit = this._guessContextLimit(form.model);
		form.visionContextLimit = this._guessContextLimit(form.visionModel || form.model);
		let textModelState = this._buildModelPickerState(this.data.textModelOptions, form.model, '从已获取列表选择');
		let visionModelState = this._buildModelPickerState(this.data.visionModelOptions, form.visionModel, '从已获取列表选择');
		this.setData(Object.assign({
			form,
			providerPresetIndex: index,
			providerCards: this._buildProviderCards(form),
		}, {
			textModelIndex: textModelState.modelIndex,
			textModelPickerText: textModelState.modelPickerText,
			visionModelIndex: visionModelState.modelIndex,
			visionModelPickerText: visionModelState.modelPickerText,
		}));
	},

	_providerInitials: function (name) {
		name = String(name || '').trim();
		if (!name) return 'AI';
		let upper = name.replace(/\s+/g, ' ').split(' ').filter(Boolean);
		if (upper.length >= 2) return (upper[0][0] + upper[1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	},

	_simplifyUrl: function (url) {
		url = String(url || '').trim();
		if (!url) return '';
		return url.replace(/\/v1\/?$/i, '').replace(/\/chat\/completions\/?$/i, '');
	},

	_isSameProvider: function (a, b) {
		let au = String(a.apiUrl || '').replace(/\/+$/, '').toLowerCase();
		let bu = String(b.apiUrl || '').replace(/\/+$/, '').toLowerCase();
		if (au && bu && au == bu) return true;
		let an = String(a.providerName || a.name || '').toLowerCase();
		let bn = String(b.providerName || b.name || '').toLowerCase();
		return !!(an && bn && an == bn);
	},

	_buildProviderCard: function (item, cfg, index) {
		let active = this._isSameProvider(item, cfg);
		let name = item.name || item.providerName || '自定义';
		return {
			id: item.id || ('custom_' + index),
			name,
			providerName: item.providerName || name,
			initials: this._providerInitials(name),
			website: item.website || this._simplifyUrl(item.apiUrl),
			apiUrl: item.apiUrl || '',
			model: item.model || '',
			visionApiUrl: item.visionApiUrl || '',
			visionModel: item.visionModel || '',
			remark: item.remark || '',
			active,
			modelText: item.model || '未填写模型',
			keyText: active && cfg.hasApiKey ? (cfg.apiKeyMasked || '已保存 Key') : '未保存 Key',
			keyReady: !!(active && cfg.hasApiKey),
			custom: !!item.custom,
		};
	},

	_buildProviderCards: function (cfg) {
		cfg = cfg || {};
		let cards = [];
		for (let i = 0; i < PROVIDER_PRESETS.length; i++) {
			let item = PROVIDER_PRESETS[i];
			if (item.custom) continue;
			cards.push(this._buildProviderCard(item, cfg, i));
		}
		let hasCurrent = cards.some(card => this._isSameProvider(card, cfg));
		if (!hasCurrent && (cfg.apiUrl || cfg.providerName || cfg.model)) {
			cards.push(this._buildProviderCard({
				id: 'current_custom',
				name: cfg.providerName || '自定义',
				providerName: cfg.providerName || '自定义兼容接口',
				website: this._simplifyUrl(cfg.apiUrl),
				apiUrl: cfg.apiUrl || '',
				model: cfg.model || '',
				visionApiUrl: cfg.visionApiUrl || '',
				visionModel: cfg.visionModel || '',
				remark: '当前正在使用',
				custom: true,
			}, cfg, cards.length));
		}
		return cards;
	},

	_applyProviderToForm: function (provider) {
		let form = Object.assign({}, this.data.form);
		form.providerName = provider.providerName || provider.name || form.providerName;
		form.apiUrl = provider.apiUrl || form.apiUrl;
		form.model = provider.model || form.model;
		form.visionApiUrl = provider.visionApiUrl || '';
		form.visionModel = provider.visionModel || '';
		form.contextLimit = this._guessContextLimit(form.model);
		form.visionContextLimit = this._guessContextLimit(form.visionModel || form.model);
		let textModelState = this._buildModelPickerState(this.data.textModelOptions, form.model, '从已获取列表选择');
		let visionModelState = this._buildModelPickerState(this.data.visionModelOptions, form.visionModel, '从已获取列表选择');
		this.setData({
			form,
			providerPresetIndex: this._buildPresetState(form),
			providerCards: this._buildProviderCards(form),
			textModelIndex: textModelState.modelIndex,
			textModelPickerText: textModelState.modelPickerText,
			visionModelIndex: visionModelState.modelIndex,
			visionModelPickerText: visionModelState.modelPickerText,
			clearKey: false,
			clearVisionKey: false,
		});
	},

	bindProviderUseTap: function (e) {
		let index = Number(e.currentTarget.dataset.index || 0);
		let provider = this.data.providerCards[index];
		if (!provider) return;
		this._applyProviderToForm(provider);
		pageHelper.showSuccToast('已切换，保存后生效');
	},

	bindProviderEditTap: function (e) {
		let index = Number(e.currentTarget.dataset.index);
		let provider = index >= 0 ? this.data.providerCards[index] : null;
		let form = provider ? Object.assign(defaultProviderEditForm(), provider) : defaultProviderEditForm();
		if (!form.name && this.data.form.providerName) form.name = this.data.form.providerName;
		if (!form.providerName && form.name) form.providerName = form.name;
		this.setData({
			providerEditorOpen: true,
			providerEditIndex: provider ? index : -1,
			providerEditForm: form,
			providerEditKeyVisible: false,
		});
	},

	bindProviderAddTap: function () {
		this.setData({
			providerEditorOpen: true,
			providerEditIndex: -1,
			providerEditForm: defaultProviderEditForm(),
			providerEditKeyVisible: false,
		});
	},

	bindProviderEditorCancelTap: function () {
		this.setData({
			providerEditorOpen: false,
			providerEditIndex: -1,
			providerEditForm: defaultProviderEditForm(),
			providerEditKeyVisible: false,
		});
	},

	bindProviderEditInput: function (e) {
		let field = e.currentTarget.dataset.field;
		this.setData({ ['providerEditForm.' + field]: e.detail.value });
	},

	bindProviderEditorToggleKeyTap: function () {
		this.setData({ providerEditKeyVisible: !this.data.providerEditKeyVisible });
	},

	bindProviderEditorPasteKeyTap: async function () {
		try {
			let value = await this._getClipboardSecret();
			if (!value) return pageHelper.showModal('剪贴板里没有可粘贴的 API Key');
			this.setData({ 'providerEditForm.apiKey': value });
			pageHelper.showSuccToast('已粘贴');
		} catch (err) {
			console.error(err);
			pageHelper.showModal('读取剪贴板失败，请确认微信已允许小程序访问剪贴板');
		}
	},

	bindProviderEditorClearKeyTap: function () {
		this.setData({ 'providerEditForm.apiKey': '' });
	},

	bindProviderEditorApplyTap: function () {
		let edit = Object.assign({}, this.data.providerEditForm);
		edit.name = String(edit.name || edit.providerName || '').trim();
		edit.providerName = String(edit.providerName || edit.name || '').trim();
		edit.website = String(edit.website || '').trim();
		edit.apiUrl = String(edit.apiUrl || '').trim();
		edit.model = String(edit.model || '').trim();
		edit.visionApiUrl = String(edit.visionApiUrl || '').trim();
		edit.visionModel = String(edit.visionModel || '').trim();
		edit.remark = String(edit.remark || '').trim();
		edit.apiKey = this._cleanSecretText(edit.apiKey);
		if (!edit.name) return pageHelper.showModal('请填写供应商名称');
		if (!edit.apiUrl || !/^https:\/\//.test(edit.apiUrl)) return pageHelper.showModal('API 请求地址必须以 https:// 开头');
		if (!edit.model) return pageHelper.showModal('请填写文本模型 ID');

		let cards = (this.data.providerCards || []).slice();
		let nextCard = this._buildProviderCard(Object.assign({}, edit, {
			id: edit.id || ('custom_' + Date.now()),
			custom: this.data.providerEditIndex < 0,
		}), edit, cards.length);
		if (this.data.providerEditIndex >= 0) cards[this.data.providerEditIndex] = nextCard;
		else cards.push(nextCard);
		this.setData({
			providerCards: cards,
			keyInput: edit.apiKey || this.data.keyInput,
			providerEditorOpen: false,
			providerEditIndex: -1,
			providerEditForm: defaultProviderEditForm(),
			providerEditKeyVisible: false,
		});
		this._applyProviderToForm(nextCard);
		pageHelper.showSuccToast('已应用，点保存生效');
	},

	bindInput: function (e) {
		let field = e.currentTarget.dataset.field;
		let value = e.detail.value;
		let data = { ['form.' + field]: value };
		if (field == 'model') {
			let state = this._buildModelPickerState(this.data.textModelOptions, value, '从已获取列表选择');
			data.textModelIndex = state.modelIndex;
			data.textModelPickerText = state.modelPickerText;
			data['form.contextLimit'] = this._guessContextLimit(value);
			if (!this.data.form.visionModel) data['form.visionContextLimit'] = this._guessContextLimit(value);
		}
		if (field == 'visionModel') {
			let state = this._buildModelPickerState(this.data.visionModelOptions, value, '从已获取列表选择');
			data.visionModelIndex = state.modelIndex;
			data.visionModelPickerText = state.modelPickerText;
			data['form.visionContextLimit'] = this._guessContextLimit(value || this.data.form.model);
		}
		this.setData(data);
	},

	_buildPresetState: function (form) {
		let apiUrl = String(form.apiUrl || '').replace(/\/+$/, '').toLowerCase();
		let providerName = String(form.providerName || '').toLowerCase();
		for (let i = 0; i < PROVIDER_PRESETS.length; i++) {
			let item = PROVIDER_PRESETS[i];
			if (item.custom) continue;
			let presetUrl = String(item.apiUrl || '').replace(/\/+$/, '').toLowerCase();
			if (presetUrl && apiUrl == presetUrl) return i;
			if (providerName && providerName.indexOf(String(item.providerName || '').toLowerCase()) >= 0) return i;
		}
		return PROVIDER_PRESETS.length - 1;
	},

	_buildModelPickerState: function (models, model, emptyText) {
		models = Array.isArray(models) ? models : [];
		model = (model || '').trim();
		let index = model ? models.indexOf(model) : -1;
		return {
			modelIndex: index >= 0 ? index : 0,
			modelPickerText: !models.length ? emptyText : (index >= 0 ? model : '从列表选择一个模型'),
		};
	},

	_buildPersonalityState: function (personalities, personality) {
		personalities = Array.isArray(personalities) && personalities.length ? personalities : defaultForm().personalities;
		let index = personalities.findIndex(item => item.key == personality);
		return { personalityIndex: index >= 0 ? index : 0 };
	},

	_guessContextLimit: function (model) {
		model = String(model || '').toLowerCase();
		if (!model) return 128000;
		if (model.indexOf('gemini-1.5') >= 0 || model.indexOf('agnes-1.5') >= 0 || model.indexOf('agnes-2.0') >= 0 || model.indexOf('flash') >= 0) return 1000000;
		if (model.indexOf('gpt-4.1') >= 0 || model.indexOf('gpt-4o') >= 0 || model.indexOf('claude-3-5') >= 0 || model.indexOf('claude-3-7') >= 0 || model.indexOf('claude-4') >= 0 || model.indexOf('claude-sonnet-4') >= 0 || model.indexOf('claude-opus-4') >= 0) return 128000;
		if (model.indexOf('deepseek') >= 0) return 64000;
		if (model.indexOf('qwen-long') >= 0) return 1000000;
		if (model.indexOf('qwen') >= 0 || model.indexOf('kimi') >= 0 || model.indexOf('mimo') >= 0) return 128000;
		return 128000;
	},

	_parseModelsResult: function (ret) {
		let candidates = [
			ret,
			ret && ret.data,
			ret && ret.result,
			ret && ret.data && ret.data.data,
			ret && ret.data && ret.data.result,
			ret && ret.result && ret.result.data,
			ret && ret.result && ret.result.result,
		];
		let raw = [];
		for (let item of candidates) {
			if (Array.isArray(item)) {
				raw = item;
				break;
			}
			if (item && Array.isArray(item.models)) {
				raw = item.models;
				break;
			}
			if (item && Array.isArray(item.data)) {
				raw = item.data;
				break;
			}
		}

		let seen = {};
		let models = [];
		for (let item of raw) {
			let id = '';
			if (typeof item == 'string') id = item;
			else if (item && typeof item == 'object') {
				id = item.id || item.name || item.modelId || item.model_id || item.model_name || '';
				if (!id && typeof item.model == 'string') id = item.model;
				if (!id && item.model && typeof item.model == 'object') id = item.model.id || item.model.name || '';
			}
			id = String(id || '').trim();
			if (!id || seen[id]) continue;
			seen[id] = true;
			models.push(id);
		}
		return models;
	},

	bindLoadModelsTap: async function (e) {
		let target = e.currentTarget.dataset.target == 'vision' ? 'vision' : 'text';
		let apiUrl = target == 'vision'
			? ((this.data.form.visionApiUrl || this.data.form.apiUrl || '').trim())
			: ((this.data.form.apiUrl || '').trim());
		let apiKey = target == 'vision'
			? ((this.data.visionKeyInput || this.data.keyInput || '').trim())
			: ((this.data.keyInput || '').trim());
		let hasSavedKey = target == 'vision'
			? (this.data.hasVisionApiKey || this.data.hasApiKey)
			: this.data.hasApiKey;
		if (!apiUrl || !/^https:\/\//.test(apiUrl)) return pageHelper.showModal('请先填写 https:// 开头的接口地址');
		if (!apiKey && !hasSavedKey) return pageHelper.showModal('请先填写或保存 API Key，再获取模型列表');

		this.setData({ modelLoading: true, modelLoadingTarget: target });
		try {
			let ret = await cloudHelper.callCloudSumbit('work/admin_ai_models_get', {
				target,
				apiUrl,
				apiKey,
			}, { title: '获取中' });
			let models = this._parseModelsResult(ret);
			if (target == 'vision') {
				let state = this._buildModelPickerState(models, this.data.form.visionModel, '从已获取列表选择');
				this.setData({
					visionModelOptions: models,
					visionModelIndex: state.modelIndex,
					visionModelPickerText: state.modelPickerText,
				});
			} else {
				let state = this._buildModelPickerState(models, this.data.form.model, '从已获取列表选择');
				this.setData({
					textModelOptions: models,
					textModelIndex: state.modelIndex,
					textModelPickerText: state.modelPickerText,
				});
			}
			if (models.length) pageHelper.showSuccToast('已获取模型');
			else pageHelper.showModal('没有识别到可选模型，可直接手动填写模型 ID 后保存');
		} catch (err) {
			console.error(err);
			pageHelper.showModal('获取模型失败；如果该平台不开放模型列表，请直接手动填写模型 ID');
		} finally {
			this.setData({ modelLoading: false, modelLoadingTarget: '' });
		}
	},

	bindModelChange: function (e) {
		let target = e.currentTarget.dataset.target == 'vision' ? 'vision' : 'text';
		let index = Number(e.detail.value || 0);
		let list = target == 'vision' ? this.data.visionModelOptions : this.data.textModelOptions;
		let model = list[index] || '';
		if (!model) return;
		if (target == 'vision') {
			this.setData({
				'form.visionModel': model,
				'form.visionContextLimit': this._guessContextLimit(model),
				visionModelIndex: index,
				visionModelPickerText: model,
			});
			return;
		}
		this.setData({
			'form.model': model,
			'form.contextLimit': this._guessContextLimit(model),
			textModelIndex: index,
			textModelPickerText: model,
		});
	},

	bindPersonalityChange: function (e) {
		let index = Number(e.detail.value || 0);
		let list = this.data.form.personalities || defaultForm().personalities;
		let item = list[index] || list[0];
		this.setData({
			'form.personality': item.key,
			'form.personalityName': item.name,
			personalityIndex: index,
		});
	},

	bindKeyInput: function (e) {
		this.setData({ keyInput: e.detail.value, clearKey: false });
	},

	bindVisionKeyInput: function (e) {
		this.setData({ visionKeyInput: e.detail.value, clearVisionKey: false });
	},

	_cleanSecretText: function (value) {
		return String(value || '').replace(/\s+/g, '').trim();
	},

	_getClipboardSecret: function () {
		return new Promise((resolve, reject) => {
			wx.getClipboardData({
				success: res => resolve(this._cleanSecretText(res && res.data)),
				fail: reject,
			});
		});
	},

	bindPasteKeyTap: async function () {
		try {
			let value = await this._getClipboardSecret();
			if (!value) return pageHelper.showModal('剪贴板里没有可粘贴的 API Key');
			this.setData({ keyInput: value, clearKey: false });
			pageHelper.showSuccToast('已粘贴');
		} catch (err) {
			console.error(err);
			pageHelper.showModal('读取剪贴板失败，请确认微信已允许小程序访问剪贴板');
		}
	},

	bindPasteVisionKeyTap: async function () {
		try {
			let value = await this._getClipboardSecret();
			if (!value) return pageHelper.showModal('剪贴板里没有可粘贴的视觉 API Key');
			this.setData({ visionKeyInput: value, clearVisionKey: false });
			pageHelper.showSuccToast('已粘贴');
		} catch (err) {
			console.error(err);
			pageHelper.showModal('读取剪贴板失败，请确认微信已允许小程序访问剪贴板');
		}
	},

	bindToggleKeyVisibleTap: function () {
		this.setData({ showKeyInput: !this.data.showKeyInput });
	},

	bindToggleVisionKeyVisibleTap: function () {
		this.setData({ showVisionKeyInput: !this.data.showVisionKeyInput });
	},

	bindClearKeyInputTap: function () {
		this.setData({ keyInput: '', clearKey: false });
	},

	bindClearVisionKeyInputTap: function () {
		this.setData({ visionKeyInput: '', clearVisionKey: false });
	},

	bindEnabledChange: function (e) {
		this.setData({ 'form.enabled': !!e.detail.value });
	},

	bindMemoryEnabledChange: function (e) {
		this.setData({ 'form.memoryEnabled': !!e.detail.value });
	},

	bindClearKeyChange: function (e) {
		let checked = !!e.detail.value;
		this.setData({ clearKey: checked, keyInput: checked ? '' : this.data.keyInput });
	},

	bindClearVisionKeyChange: function (e) {
		let checked = !!e.detail.value;
		this.setData({ clearVisionKey: checked, visionKeyInput: checked ? '' : this.data.visionKeyInput });
	},

	bindSubmitTap: async function () {
		let form = Object.assign({}, this.data.form);
		form.providerName = (form.providerName || '').trim();
		form.apiUrl = (form.apiUrl || '').trim();
		form.model = (form.model || '').trim();
		form.visionApiUrl = (form.visionApiUrl || '').trim();
		form.visionModel = (form.visionModel || '').trim();
		form.memoryText = (form.memoryText || '').trim();
		form.apiKey = this._cleanSecretText(this.data.keyInput);
		form.visionApiKey = this._cleanSecretText(this.data.visionKeyInput);
		form.temperature = Number(form.temperature || 0.7);
		form.maxTokens = Number(form.maxTokens || 600);

		if (form.enabled && !form.apiKey && !this.data.hasApiKey && !this.data.clearKey) {
			return pageHelper.showModal('启用前请先填写 API Key');
		}
		if (!form.apiUrl || !/^https:\/\//.test(form.apiUrl)) {
			return pageHelper.showModal('AI 接口地址必须以 https:// 开头');
		}
		if (form.visionApiUrl && !/^https:\/\//.test(form.visionApiUrl)) {
			return pageHelper.showModal('视觉接口地址必须以 https:// 开头；不单独配置时可以留空');
		}
		if (!form.model) {
			return pageHelper.showModal('请填写文本模型名称');
		}

		try {
			let ret = await cloudHelper.callCloudSumbit('work/admin_ai_config_save', {
				config: form,
				clearKey: !!this.data.clearKey,
				clearVisionKey: !!this.data.clearVisionKey,
			}, { title: '保存中' });
			let cfg = ret && ret.data ? ret.data : null;
			cfg = Object.assign(defaultForm(), cfg || {});
			if (!cfg.visionContextLimit) cfg.visionContextLimit = this._guessContextLimit(cfg.visionModel || cfg.model);
			let textModelState = this._buildModelPickerState(this.data.textModelOptions, cfg.model, '从已获取列表选择');
			let visionModelState = this._buildModelPickerState(this.data.visionModelOptions, cfg.visionModel, '从已获取列表选择');
			let personalityState = this._buildPersonalityState(cfg.personalities, cfg.personality);
			this.setData({
				form: cfg,
				providerPresetIndex: this._buildPresetState(cfg),
				providerCards: this._buildProviderCards(cfg),
				keyInput: '',
				visionKeyInput: '',
				clearKey: false,
				clearVisionKey: false,
				hasApiKey: !!cfg.hasApiKey,
				hasVisionApiKey: !!cfg.hasVisionApiKey,
				apiKeyMasked: cfg.apiKeyMasked || '',
				visionApiKeyMasked: cfg.visionApiKeyMasked || '',
				showKeyInput: false,
				showVisionKeyInput: false,
				keyPlaceholder: cfg.hasApiKey ? ('已保存：' + (cfg.apiKeyMasked || '******') + '，留空不修改') : 'sk-...',
				visionKeyPlaceholder: cfg.hasVisionApiKey ? ('已保存：' + (cfg.visionApiKeyMasked || '******') + '，留空不修改') : '留空沿用主 Key',
				textModelIndex: textModelState.modelIndex,
				textModelPickerText: textModelState.modelPickerText,
				visionModelIndex: visionModelState.modelIndex,
				visionModelPickerText: visionModelState.modelPickerText,
				personalityIndex: personalityState.personalityIndex,
			});
			pageHelper.showSuccToast('保存成功');
		} catch (err) {
			console.error(err);
			pageHelper.showModal('保存失败，请检查网络后重试');
		}
	},

	bindTestTap: async function () {
		if (!this.data.form.enabled) return pageHelper.showModal('请先启用 AI 小助手并保存配置');
		if (!this.data.hasApiKey) return pageHelper.showModal('请先保存 API Key 后再测试');
		try {
			let ret = await cloudHelper.callCloudSumbit('work/ai_chat', {
				message: '请用一句话介绍你能帮云屿摄影做什么',
				history: [],
			}, { title: '测试中' });
			let res = ret && ret.data ? ret.data : null;
			pageHelper.showModal((res && res.reply) ? res.reply : 'AI 已响应，但没有返回文本');
		} catch (err) {
			console.error(err);
			pageHelper.showModal('测试失败，请检查 AI 配置和网络');
		}
	},
});
