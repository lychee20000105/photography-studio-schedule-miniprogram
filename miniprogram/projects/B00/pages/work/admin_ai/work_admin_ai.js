const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

function defaultForm() {
	return {
		enabled: false,
		providerName: 'Agnes APIHub',
		apiUrl: 'https://apihub.agnes-ai.com/v1',
		model: 'gpt-4o-mini',
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
	};
}

Page({
	data: {
			isLoad: false,
			form: defaultForm(),
			keyInput: '',
			clearKey: false,
			hasApiKey: false,
			apiKeyMasked: '',
			keyPlaceholder: 'sk-...',
			modelOptions: [],
			modelIndex: 0,
			modelPickerText: '先获取模型列表',
			personalityIndex: 0,
			modelLoading: false,
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
			let modelState = this._buildModelPickerState(this.data.modelOptions, cfg.model);
			let personalityState = this._buildPersonalityState(cfg.personalities, cfg.personality);
			this.setData({
				isLoad: true,
				form: cfg,
				keyInput: '',
				clearKey: false,
				hasApiKey: !!cfg.hasApiKey,
				apiKeyMasked: cfg.apiKeyMasked || '',
				keyPlaceholder: cfg.hasApiKey ? ('已保存：' + (cfg.apiKeyMasked || '******') + '，留空不修改') : 'sk-...',
				modelIndex: modelState.modelIndex,
				modelPickerText: modelState.modelPickerText,
				personalityIndex: personalityState.personalityIndex,
			});
		},

		bindInput: function (e) {
			let field = e.currentTarget.dataset.field;
			let value = e.detail.value;
			let data = { ['form.' + field]: value };
			if (field == 'model') {
				Object.assign(data, this._buildModelPickerState(this.data.modelOptions, value));
				data['form.contextLimit'] = this._guessContextLimit(value);
			}
			this.setData(data);
		},

		_buildModelPickerState: function (models, model) {
			models = Array.isArray(models) ? models : [];
			model = (model || '').trim();
			let index = model ? models.indexOf(model) : -1;
			return {
				modelIndex: index >= 0 ? index : 0,
				modelPickerText: !models.length ? '先获取模型列表' : (index >= 0 ? model : '请选择模型'),
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
			if (model.indexOf('qwen') >= 0) return 128000;
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

		bindLoadModelsTap: async function () {
			let apiUrl = (this.data.form.apiUrl || '').trim();
			let apiKey = (this.data.keyInput || '').trim();
			if (!apiUrl || !/^https:\/\//.test(apiUrl)) return pageHelper.showModal('请先填写 https:// 开头的接口地址');
			if (!apiKey && !this.data.hasApiKey) return pageHelper.showModal('请先填写或保存 API Key，再获取模型列表');

			this.setData({ modelLoading: true });
			try {
				let ret = await cloudHelper.callCloudSumbit('work/admin_ai_models_get', {
					apiUrl,
					apiKey,
				}, { title: '获取中' });
				let models = this._parseModelsResult(ret);
				let modelState = this._buildModelPickerState(models, this.data.form.model);
				this.setData(Object.assign({
					modelOptions: models,
				}, modelState));
				if (models.length) pageHelper.showSuccToast('已获取模型');
				else pageHelper.showModal('没有识别到可选模型，可先手动填写模型 ID 后保存');
			} catch (err) {
				console.error(err);
			} finally {
				this.setData({ modelLoading: false });
			}
		},

		bindModelChange: function (e) {
			let index = Number(e.detail.value || 0);
			let model = this.data.modelOptions[index] || '';
			if (!model) return;
			this.setData({
				'form.model': model,
				'form.contextLimit': this._guessContextLimit(model),
				modelIndex: index,
				modelPickerText: model,
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

	bindEnabledChange: function (e) {
		this.setData({ 'form.enabled': !!e.detail.value });
	},

	bindClearKeyChange: function (e) {
		let checked = !!e.detail.value;
		this.setData({ clearKey: checked, keyInput: checked ? '' : this.data.keyInput });
	},

	bindSubmitTap: async function () {
		let form = Object.assign({}, this.data.form);
		form.providerName = (form.providerName || '').trim();
		form.apiUrl = (form.apiUrl || '').trim();
		form.model = (form.model || '').trim();
		form.apiKey = (this.data.keyInput || '').trim();
		form.temperature = Number(form.temperature || 0.7);
		form.maxTokens = Number(form.maxTokens || 600);

		if (form.enabled && !form.apiKey && !this.data.hasApiKey && !this.data.clearKey) {
			return pageHelper.showModal('启用前请先填写 API Key');
		}
		if (!form.apiUrl || !/^https:\/\//.test(form.apiUrl)) {
			return pageHelper.showModal('AI 接口地址必须以 https:// 开头');
		}
		if (!form.model) {
			return pageHelper.showModal('请填写模型名称');
		}

		try {
				let ret = await cloudHelper.callCloudSumbit('work/admin_ai_config_save', {
					config: form,
					clearKey: !!this.data.clearKey,
				}, { title: '保存中' });
				let cfg = ret && ret.data ? ret.data : null;
				cfg = Object.assign(defaultForm(), cfg || {});
				let modelState = this._buildModelPickerState(this.data.modelOptions, cfg.model);
				let personalityState = this._buildPersonalityState(cfg.personalities, cfg.personality);
				this.setData({
					form: cfg,
					keyInput: '',
					clearKey: false,
					hasApiKey: !!cfg.hasApiKey,
					apiKeyMasked: cfg.apiKeyMasked || '',
					keyPlaceholder: cfg.hasApiKey ? ('已保存：' + (cfg.apiKeyMasked || '******') + '，留空不修改') : 'sk-...',
					modelIndex: modelState.modelIndex,
					modelPickerText: modelState.modelPickerText,
					personalityIndex: personalityState.personalityIndex,
				});
				pageHelper.showSuccToast('保存成功');
		} catch (err) {
			console.error(err);
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
		}
	},
});
