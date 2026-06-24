const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

const PROVIDER_PRESETS = [
	{
		name: 'Agnes',
		providerName: 'Agnes APIHub',
		apiUrl: 'https://apihub.agnes-ai.com/v1',
		model: 'gpt-4o-mini',
		visionApiUrl: '',
		visionModel: '',
	},
	{
		name: 'DeepSeek',
		providerName: 'DeepSeek',
		apiUrl: 'https://api.deepseek.com/v1',
		model: 'deepseek-chat',
		visionApiUrl: '',
		visionModel: '',
	},
	{
		name: 'OpenAI',
		providerName: 'OpenAI兼容接口',
		apiUrl: 'https://api.openai.com/v1',
		model: 'gpt-4o-mini',
		visionApiUrl: '',
		visionModel: 'gpt-4o-mini',
	},
	{
		name: 'Mimo',
		providerName: 'Mimo',
		apiUrl: 'https://api.xiaomimimo.com/v1',
		model: 'mimo-v2.5',
		visionApiUrl: '',
		visionModel: '',
	},
	{
		name: '自定义',
		providerName: '自定义兼容接口',
		apiUrl: '',
		model: '',
		visionApiUrl: '',
		visionModel: '',
		custom: true,
	},
];

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
		}, {
			textModelIndex: textModelState.modelIndex,
			textModelPickerText: textModelState.modelPickerText,
			visionModelIndex: visionModelState.modelIndex,
			visionModelPickerText: visionModelState.modelPickerText,
		}));
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
