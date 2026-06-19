/**
 * Notes: 云屿摄影 AI 小助手服务
 */

const https = require('https');
const net = require('net');
const setupUtil = require('../../../framework/utils/setup/setup_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const WorkPermissionService = require('./work_permission_service.js');
const WorkService = require('./work_service.js');
const WorkStaffModel = require('../model/work_staff_model.js');
const WorkTypeModel = require('../model/work_type_model.js');
const WorkOrderModel = require('../model/work_order_model.js');
const WorkItemModel = require('../model/work_item_model.js');

const SETUP_KEY = 'WORK_AI_CHAT_CONFIG';
const LEGACY_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const DEFAULT_CONFIG = {
	enabled: false,
	providerName: 'Agnes APIHub',
	apiUrl: 'https://apihub.agnes-ai.com/v1',
	model: 'gpt-4o-mini',
	apiKey: '',
	personality: 'ops_cat',
	systemPrompt: '你是云屿摄影小程序里的小猫 AI 助手，语气简洁、友好、务实。你主要帮助摄影工作室员工记录订单、梳理档期、整理客户跟进事项、解释小程序功能。不要编造系统里真实存在的数据；能通过工具查询的数据要主动查询。',
	temperature: 0.7,
	maxTokens: 600,
};

const PERSONALITY_MAP = {
	ops_cat: {
		name: '值班小猫',
		prompt: '性格：稳、细、会主动补漏。像摄影工作室里认真值班的伙伴，先把档期、客户、金额、参与人、附件这些关键点盯住；表达温和但不啰嗦。',
	},
	gentle_cat: {
		name: '温柔小猫',
		prompt: '性格：温柔、耐心、安抚感强。适合面对新员工、客户跟进话术、复杂信息整理；遇到缺信息时用轻柔方式追问。',
	},
	strict_cat: {
		name: '审查小猫',
		prompt: '性格：谨慎、专业、偏审核。对收款、提成、工资、删除、审核等高风险事项要明确说明不能直接操作，并提醒走管理中心和审查流程。',
	},
	sales_cat: {
		name: '成交小猫',
		prompt: '性格：懂销售、会提炼卖点。适合客户跟进、报价解释、拍摄服务推荐、活动话术；说话真诚，不夸大承诺。',
	},
};

const LOCAL_APP_KNOWLEDGE = [
	'本项目定位：摄影工作室可二次开发的档期、订单、员工业绩提成与工资结算小程序；云屿摄影是案例配置和真实业务样本。',
	'核心工作台模块：档期日历、每日详情、订单新增/编辑/取消、事项档期、小记、休息申请、消息、问题反馈、我的业绩、我的工资。',
	'管理中心模块：业绩看板、订单搜索、收款记录、提成记录、冻结提成、员工管理、工资预览/发放、订单审核、AI配置、反馈审查。',
	'财务结构方向：收款账本按实际收款月份统计业绩，提成账本支持冻结/释放/扣回，工资单汇总不承担底层提成拆分。',
	'AI安全边界：允许查询档期/小记、直接新增订单档期、事项、休息申请和小记；禁止直接删除、作废、收款、退款、发工资、改提成、审核通过或批量修改。',
	'AI写入规则：凡是AI执行写入动作，都要在团队小记自动追加一条全体可见的操作审查流水。',
];

function asText(val, max = 1000) {
	if (val === undefined || val === null) return '';
	return String(val).trim().slice(0, max);
}

function asNumber(val, def, min, max) {
	let num = Number(val);
	if (!Number.isFinite(num)) num = def;
	return Math.max(min, Math.min(max, num));
}

function normalizeChatApiUrl(url) {
	url = asText(url, 400) || DEFAULT_CONFIG.apiUrl;
	url = url.replace(/\/+$/, '');
	if (url.toLowerCase().endsWith('/v1')) return url + '/chat/completions';
	return url;
}

function normalizeModelsApiUrl(url) {
	url = asText(url, 400) || DEFAULT_CONFIG.apiUrl;
	url = url.replace(/\/+$/, '');
	let lower = url.toLowerCase();
	if (lower.endsWith('/models')) return url;
	if (lower.endsWith('/chat/completions')) return url.slice(0, -'/chat/completions'.length) + '/models';
	if (lower.endsWith('/completions')) return url.slice(0, -'/completions'.length) + '/models';
	return url + '/models';
}

function getEnvApiKey() {
	if (typeof process == 'undefined' || !process.env) return '';
	return asText(process.env.B00_WORK_AI_API_KEY || process.env.WORK_AI_API_KEY || '', 400);
}

function estimateContextLimit(model) {
	model = asText(model, 120).toLowerCase();
	if (!model) return 128000;
	if (model.includes('gemini-1.5') || model.includes('agnes-1.5') || model.includes('agnes-2.0') || model.includes('flash')) return 1000000;
	if (model.includes('gpt-4.1') || model.includes('gpt-4o') || model.includes('claude-3-5') || model.includes('claude-3-7') || model.includes('claude-4') || model.includes('claude-sonnet-4') || model.includes('claude-opus-4')) return 128000;
	if (model.includes('deepseek')) return 64000;
	if (model.includes('qwen-long')) return 1000000;
	if (model.includes('qwen')) return 128000;
	return 128000;
}

class WorkAiService extends WorkPermissionService {

	async getAdminConfig() {
		let config = await this._getConfig();
		return this._publicConfig(config);
	}

	async saveAdminConfig(input = {}, options = {}) {
		let current = await this._getConfig({ includeEnvKey: false });
		let apiKey = asText(input.apiKey, 400);
		let next = {
			enabled: !!input.enabled,
			providerName: asText(input.providerName, 60) || DEFAULT_CONFIG.providerName,
			apiUrl: asText(input.apiUrl, 400) || DEFAULT_CONFIG.apiUrl,
			model: asText(input.model, 120) || DEFAULT_CONFIG.model,
			apiKey: options.clearKey ? '' : (apiKey || current.apiKey || ''),
			personality: PERSONALITY_MAP[input.personality] ? input.personality : DEFAULT_CONFIG.personality,
			systemPrompt: asText(input.systemPrompt, 3000) || DEFAULT_CONFIG.systemPrompt,
			temperature: asNumber(input.temperature, DEFAULT_CONFIG.temperature, 0, 2),
			maxTokens: Math.round(asNumber(input.maxTokens, DEFAULT_CONFIG.maxTokens, 128, 4000)),
		};

		this._assertApiUrl(normalizeChatApiUrl(next.apiUrl));
		if (next.enabled && !next.apiKey && !getEnvApiKey()) this.AppError('启用 AI 前请先填写 API Key');

		await setupUtil.set(SETUP_KEY, next);
		return this._publicConfig(await this._getConfig());
	}

	async chat(openId, message, history = [], attachments = [], pageContext = {}) {
		let staff = await this.assertStaff(openId);
		let config = await this._getConfig();

		if (!config.enabled) this.AppError('AI 小助手暂未启用，请管理员先配置');
		if (!config.apiKey) this.AppError('AI API Key 未配置，请管理员先配置');
		let chatApiUrl = normalizeChatApiUrl(config.apiUrl);
		this._assertApiUrl(chatApiUrl);

		message = asText(message, 800);
		if (!message) this.AppError('请输入要发送的内容');
		this._agentUserMessage = message;

		let imageAttachments = await this._normalizeImageAttachments(attachments);
		let messages = await this._buildAgentMessages(config, staff, message, history, imageAttachments, pageContext);
		let body = {
			model: config.model,
			messages,
			temperature: config.temperature,
			max_tokens: config.maxTokens,
			stream: false,
		};

		try {
			let result = await this._postJson(chatApiUrl, body, {
				Authorization: 'Bearer ' + config.apiKey,
			});
			let reply = this._pickReply(result);
			if (!reply) this.AppError('AI 接口返回格式不支持，请检查接口是否兼容 Chat Completions');
			return await this._handleAgentReply(openId, staff, reply, config, result, imageAttachments, pageContext);
		} catch (err) {
			if (err && err.name == 'AppError') throw err;
			console.error('AI chat failed:', err && err.message ? err.message : err);
			this.AppError(err && err.safeMessage ? err.safeMessage : 'AI 接口调用失败，请检查后台配置');
		}
	}

	async listModels(input = {}) {
		let config = await this._getConfig();
		let apiUrl = asText(input.apiUrl, 400) || config.apiUrl || DEFAULT_CONFIG.apiUrl;
		let apiKey = asText(input.apiKey, 400) || config.apiKey || getEnvApiKey();
		let modelsApiUrl = normalizeModelsApiUrl(apiUrl);

		this._assertApiUrl(modelsApiUrl);
		if (!apiKey) this.AppError('请先填写或保存 API Key，再获取模型列表');

		try {
			let result = await this._getJson(modelsApiUrl, {
				Authorization: 'Bearer ' + apiKey,
			});
			let models = this._parseModelList(result);
			if (!models.length) this.AppError('AI 接口没有返回可用模型，可手动填写模型 ID');
			return { models };
		} catch (err) {
			if (err && err.name == 'AppError') throw err;
			if (err && err.statusCode == 404) this.AppError('当前接口没有提供模型列表，请确认 Base URL 或手动填写模型 ID');
			if (err && err.statusCode == 401) this.AppError('API Key 无效或无权获取模型列表');
			if (err && err.statusCode == 403) this.AppError('API Key 没有获取模型列表权限');
			console.error('AI models failed:', err && err.message ? err.message : err);
			this.AppError('获取模型列表失败，请稍后再试或手动填写模型 ID');
		}
	}

	async _getConfig(options = {}) {
		let saved = await setupUtil.get(SETUP_KEY);
		let config = Object.assign({}, DEFAULT_CONFIG, saved || {});
		if (!config.providerName || config.providerName == 'OpenAI兼容接口') config.providerName = DEFAULT_CONFIG.providerName;
		if (!config.apiUrl || config.apiUrl == LEGACY_OPENAI_API_URL) config.apiUrl = DEFAULT_CONFIG.apiUrl;
		if (options.includeEnvKey !== false && !config.apiKey) config.apiKey = getEnvApiKey();
		return config;
	}

	_publicConfig(config) {
		config = Object.assign({}, DEFAULT_CONFIG, config || {});
		return {
			enabled: !!config.enabled,
			providerName: config.providerName || DEFAULT_CONFIG.providerName,
			apiUrl: config.apiUrl || DEFAULT_CONFIG.apiUrl,
			model: config.model || DEFAULT_CONFIG.model,
			personality: PERSONALITY_MAP[config.personality] ? config.personality : DEFAULT_CONFIG.personality,
			personalityName: (PERSONALITY_MAP[config.personality] || PERSONALITY_MAP[DEFAULT_CONFIG.personality]).name,
			personalities: Object.keys(PERSONALITY_MAP).map(key => ({ key, name: PERSONALITY_MAP[key].name })),
			systemPrompt: config.systemPrompt || DEFAULT_CONFIG.systemPrompt,
			temperature: asNumber(config.temperature, DEFAULT_CONFIG.temperature, 0, 2),
			maxTokens: Math.round(asNumber(config.maxTokens, DEFAULT_CONFIG.maxTokens, 128, 4000)),
			hasApiKey: !!config.apiKey,
			apiKeyMasked: this._maskKey(config.apiKey || ''),
			contextLimit: estimateContextLimit(config.model),
		};
	}

	_maskKey(key) {
		key = asText(key, 400);
		if (!key) return '';
		if (key.length <= 10) return key.slice(0, 2) + '******';
		return key.slice(0, 6) + '******' + key.slice(-4);
	}

	_assertApiUrl(url) {
		let parsed;
		try {
			parsed = new URL(url);
		} catch (err) {
			this.AppError('AI 接口地址格式错误');
		}
		if (parsed.protocol != 'https:') this.AppError('AI 接口地址必须使用 https');
		let host = String(parsed.hostname || '').toLowerCase();
		if (!host || host == 'localhost' || host.endsWith('.local')) this.AppError('AI 接口地址不能使用本地域名');
		if (this._isBlockedIp(host)) this.AppError('AI 接口地址不能使用内网或本机 IP');
	}

	_isBlockedIp(host) {
		let ipVer = net.isIP(host);
		if (!ipVer) return false;
		if (ipVer == 6) {
			return host == '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80');
		}
		let parts = host.split('.').map(n => Number(n));
		if (parts.length != 4 || parts.some(n => !Number.isInteger(n))) return true;
		let a = parts[0], b = parts[1];
		return a == 0 || a == 10 || a == 127 || (a == 169 && b == 254)
			|| (a == 172 && b >= 16 && b <= 31)
			|| (a == 192 && b == 168)
			|| (a == 100 && b >= 64 && b <= 127);
	}

	_buildMessages(config, staff, message, history) {
		let staffName = staff && staff.STAFF_NAME ? staff.STAFF_NAME : '员工';
		let system = config.systemPrompt || DEFAULT_CONFIG.systemPrompt;
		let personality = PERSONALITY_MAP[config.personality] || PERSONALITY_MAP[DEFAULT_CONFIG.personality];
		system += '\n\n' + personality.prompt;
		system += '\n\n当前用户：' + staffName + '。回答请控制在 200 字以内，除非用户明确要求详细说明。';

		let messages = [{ role: 'system', content: system }];
		messages = messages.concat(this._normalizeHistory(history));
		messages.push({ role: 'user', content: message });
		return messages;
	}

	async _buildAgentMessages(config, staff, message, history, attachments = [], pageContext = {}) {
		let messages = this._buildMessages(config, staff, message, history);
		let staffOptions = await WorkStaffModel.getAll({
			STAFF_STATUS: WorkStaffModel.STATUS.COMM,
		}, '_id,STAFF_NAME,STAFF_ROLES,STAFF_IS_ADMIN', {
			STAFF_NAME: 'asc',
		}, 200);
		let typeOptions = await WorkTypeModel.getAll({
			TYPE_STATUS: 1,
		}, '_id,TYPE_NAME,TYPE_COLOR,TYPE_ORDER', {
			TYPE_ORDER: 'asc',
			TYPE_ADD_TIME: 'asc',
		}, 200);
		let toolSystem = [
			'你现在也是云屿摄影小程序内的受控执行型业务智能体。',
			'当前日期：' + timeUtil.time('Y-M-D') + '，当前月份：' + timeUtil.time('Y-M') + '。',
			'用户说“今天/明天/后天/大后天/昨天/前天”时，必须严格按当前日期换算，不要把今天猜成当月1号或截图里的其他日期。',
			'当前登录员工：' + (staff.STAFF_NAME || '员工') + '，员工ID：' + staff._id + '，是否管理员：' + (staff.STAFF_IS_ADMIN == 1 ? '是' : '否') + '。',
			'当前页面上下文：' + JSON.stringify({ route: pageContext.route || '', orderId: pageContext.orderId || '', day: pageContext.day || '' }),
			'Date fallback rule: if pageContext.day exists and neither the user text nor screenshot gives a clearer date, use pageContext.day as the default write date; never override an explicit screenshot date.',
			'可用员工：' + JSON.stringify((staffOptions || []).map(item => ({ name: item.STAFF_NAME, id: item._id, roles: item.STAFF_ROLES || [] })).slice(0, 80)),
			'可用拍摄类型：' + JSON.stringify((typeOptions || []).map(item => ({ name: item.TYPE_NAME, id: item._id, color: item.TYPE_COLOR })).slice(0, 80)),
			'本地知识库与小程序功能摘要：' + LOCAL_APP_KNOWLEDGE.join('；'),
			'你要像一个有记忆、有性格、会主动补漏的工作台 agent：先判断用户是在查询、记录、整理、解释功能还是要做高风险管理动作，再选择回答或工具动作。',
			'回答业务问题时要贴合摄影工作室场景，例如婚礼跟拍、写真、活动拍摄、客户跟进、拍摄地点、订单金额、定金尾款、参与人和提成。',
			'如果用户问小程序能做什么，要按实际功能回答：档期、订单、事项、休息、小记、消息、反馈、业绩、工资、管理中心、收款、提成、审核、AI配置。',
			'如果用户问你能否识别图片，要回答可以，并提示点击聊天输入框左侧 + 上传截图。',
			'如果用户上传了截图或图片，请逐张识别图片里的日期、时间、客户、电话、地点、拍摄类型、备注等信息；一张图片里可能有多个订单/档期卡片，必须逐条提取，不能只处理第一条。',
			'如果用户明确要求查询档期/订单、或新增/记录/安排档期、订单、拍摄、客户跟进事项、休息/请假或小记，你可以输出一个动作JSON；否则正常回答。',
			'只允许这些动作：query_schedule（查询档期）、create_order（新增单个订单档期）、create_orders（批量新增多个订单档期）、join_order（把当前员工加入订单参与人）、create_item（新增事项档期/待办）、create_rest（新增休息/请假申请）、add_note（新增小记）、none（只聊天）。',
			'禁止输出删除、作废、收款、退款、工资、提成、审核通过、批量修改等动作。',
			'动作JSON必须是纯JSON对象，不要包Markdown。格式：{"action":"query_schedule|create_order|create_orders|create_item|create_rest|add_note|none","reply":"给用户看的简短回复","data":{...}}。',
			'query_schedule.data字段：startDate(YYYY-MM-DD，必填)、endDate(YYYY-MM-DD，可选)、scope(all/mine/joined/created，默认all)。用户问明天、今天、未来一周、某天档期、要干什么、有什么安排时必须用query_schedule，不要说自己不能查看。query_schedule会同时整理档期、事项、休息和相关小记。',
			'create_order.data字段：date(YYYY-MM-DD，必填)、time、endTime、typeName、typeId、customerName(必填)、customerMobile、source、place、content、amount、deposit、final、extra、paidAmount、paidDeposit、paidFinal、paidExtra、payments数组[{type,amount,date,baseType,note}]、participants数组[{staffName,staffId,roleName}]。',
			'金额识别必须区分：amount/ORDER_AMOUNT是订单总应收，deposit/final/extra是应收结构或约定金额；paidAmount/paidDeposit/paidFinal/paidExtra/payments才是实际已收。看到“已收/实收/收了/收款100”只记录100为实收；看到“尾款199/未收199/待收199”不能当作已收。',
			'Payment enum rule: payments[].type must use deposit/final/extra/product/supplement/refund/adjust; do not output translated or free-text enum values. payments[].baseType must use shoot/extra/all.',
			'create_orders.data字段：orders数组，数组内每项字段同create_order.data；可加attachmentIndexes数组标明来自第几张图，从1开始。识别到2条及以上订单/档期时必须使用create_orders。',
			'如果你误把多个订单放进create_order.data.orders，系统也会按批量处理，但你应优先直接使用create_orders。',
			'当用户说“只记录未登记/没有登记的订单”时，仍要先把截图里能识别的所有订单逐条输出为create_orders；系统会自动跳过已存在订单，你不要凭感觉只挑其中一条。',
			'join_order.data字段：orderId(可选，当前页面上下文有orderId时可省略)、roleName(可选)。用户说“把我加入这个订单/我参与这个订单/给我加摄影师身份”且当前页面有订单ID时，用join_order。',
			'create_item.data字段：date(YYYY-MM-DD，必填)、time、endTime、title(必填)、content。',
			'create_rest.data字段：date(YYYY-MM-DD，必填)、type(休息/请假/调休/外出，默认休息)、reason。',
			'add_note.data字段：noteType(team或personal，默认team)、title(必填)、content、date(YYYY-MM-DD)。',
			'如果新增订单缺少日期或客户名称，新增事项缺少日期/标题，或休息申请缺少日期，请用none并在reply里追问缺失信息。',
			'凡是执行写入动作，系统会自动追加一条全体可见团队小记作为AI操作审查流水。',
		].join('\n');
		messages.unshift({ role: 'system', content: toolSystem });
		if (attachments.length) {
			let last = messages[messages.length - 1];
			let content = [{ type: 'text', text: last.content + '\n\n请结合我上传的截图识别档期/订单信息；请逐张检查所有图片，同一张图片里有多个订单/档期也要逐条提取。只有1条时生成 create_order；2条及以上必须生成 create_orders，不要只生成第一条。' }];
			for (let item of attachments) {
				content.push({ type: 'image_url', image_url: { url: item.url } });
			}
			last.content = content;
		}
		return messages;
	}

	_normalizeHistory(history) {
		if (!Array.isArray(history)) return [];
		let list = [];
		for (let item of history.slice(-10)) {
			if (!item || (item.role != 'user' && item.role != 'assistant')) continue;
			let raw = item.content;
			if (Array.isArray(raw)) {
				let textParts = raw.filter(p => p && p.type == 'text' && p.text).map(p => p.text).join('');
				let imgCount = raw.filter(p => p && p.type == 'image_url').length;
				raw = imgCount > 0 ? textParts + ` [附带${imgCount}张图片]` : textParts;
			}
			let limit = item.role == 'assistant' ? 4000 : 800;
			let content = asText(raw, limit);
			if (!content) continue;
			list.push({ role: item.role, content });
		}
		return list;
	}

	_pickReply(result) {
		if (!result) return '';
		if (result.choices && result.choices[0] && result.choices[0].message) {
			let content = result.choices[0].message.content;
			if (Array.isArray(content)) {
				return asText(content.filter(item => item && item.type == 'text' && item.text).map(item => item.text).join(''), 4000);
			}
			return asText(content, 4000);
		}
		if (result.output_text) return asText(result.output_text, 4000);
		return '';
	}

	_pickJsonObject(text) {
		text = asText(text, 6000);
		if (!text) return null;
		text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
		try {
			let obj = JSON.parse(text);
			if (obj && typeof obj == 'object' && !Array.isArray(obj)) return obj;
		} catch (err) {}

		let start = text.indexOf('{');
		let end = text.lastIndexOf('}');
		if (start < 0 || end <= start) return null;
		try {
			let obj = JSON.parse(text.substring(start, end + 1));
			if (obj && typeof obj == 'object' && !Array.isArray(obj)) return obj;
		} catch (err) {}
		return null;
	}

	async _handleAgentReply(openId, staff, reply, config, llmResult, attachments = [], pageContext = {}) {
		let action = this._pickJsonObject(reply);
		let VALID_ACTIONS = ['query_schedule', 'create_order', 'create_orders', 'join_order', 'create_item', 'create_rest', 'add_note', 'create_note', 'none'];
		if (!action || !action.action || action.action == 'none' || !VALID_ACTIONS.includes(action.action)) {
			return {
				reply: action && action.reply ? asText(action.reply, 4000) : reply,
				model: config.model,
				providerName: config.providerName,
				contextLimit: estimateContextLimit(config.model),
				usage: llmResult && llmResult.usage ? llmResult.usage : {},
			};
		}

		let ret;
		let batchOrders = this._extractBatchOrders(action.data);
		if (!batchOrders.length) batchOrders = this._extractBatchOrders(action);
		let batchPayload = batchOrders.length ? { orders: batchOrders } : (action.data || action);
		if (action.action == 'create_note') action.action = 'add_note';
		if (action.action == 'query_schedule') ret = await this._agentQuerySchedule(openId, staff, action.data || {});
		else if (action.action == 'create_orders' && batchOrders.length) ret = await this._agentCreateOrders(openId, staff, batchPayload, attachments, pageContext);
		else if (action.action == 'create_orders') ret = await this._agentCreateOrder(openId, staff, action.data || {}, attachments, pageContext);
		else if (action.action == 'create_order' && batchOrders.length) ret = await this._agentCreateOrders(openId, staff, batchPayload, attachments, pageContext);
		else if (action.action == 'create_order') ret = await this._agentCreateOrder(openId, staff, action.data || {}, attachments, pageContext);
		else if (action.action == 'join_order') ret = await this._agentJoinOrder(openId, staff, action.data || {}, pageContext);
		else if (action.action == 'create_item') ret = await this._agentCreateItem(openId, staff, action.data || {});
		else if (action.action == 'create_rest') ret = await this._agentCreateRest(openId, staff, action.data || {});
		else if (action.action == 'add_note') ret = await this._agentAddNote(openId, staff, action.data || {});
		else {
			return {
				reply: action.reply || '这个操作我暂时不能直接执行。',
				model: config.model,
				providerName: config.providerName,
				contextLimit: estimateContextLimit(config.model),
				usage: llmResult && llmResult.usage ? llmResult.usage : {},
			};
		}

		return {
			reply: ret.reply || action.reply || '已处理完成。',
			action: ret.action,
			id: ret.id,
			data: ret.data || null,
			auditNoteId: ret.auditNoteId || '',
			model: config.model,
			providerName: config.providerName,
			contextLimit: estimateContextLimit(config.model),
			usage: llmResult && llmResult.usage ? llmResult.usage : {},
		};
	}

	_addDays(date, days) {
		let d = new Date(date + 'T00:00:00+08:00');
		if (Number.isNaN(d.getTime())) return date;
		d.setDate(d.getDate() + Number(days || 0));
		return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
	}

	_extractSingleTextDate(text) {
		text = asText(text, 800);
		if (!text) return '';
		let found = {};
		let pushDate = raw => {
			try {
				let day = this._cleanDate(raw, false);
				if (day) found[day] = true;
			} catch (err) {}
		};

		let full = /(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})(?:日|号)?(?!\d)/g;
		let m;
		while ((m = full.exec(text))) {
			let yr = Number(m[1]);
			if (yr < 1990 || yr > 2099) continue;
			pushDate(`${m[1]}-${m[2]}-${m[3]}`);
		}

		let monthDay = /(^|[^\d.])(\d{1,2})[月./-](\d{1,2})(?:日|号)?(?!\d)(?![张条位个名组批次套件])/g;
		let year = Number(timeUtil.time('Y'));
		let nowTs = Date.now();
		while ((m = monthDay.exec(text))) {
			let month = Number(m[2]), dayNum = Number(m[3]);
			if (month < 1 || month > 12 || dayNum < 1 || dayNum > 31) continue;
			let candidate = new Date(year, month - 1, dayNum);
			if (candidate.getFullYear() != year || candidate.getMonth() + 1 != month || candidate.getDate() != dayNum) continue;
			let useYear = year;
		if (candidate.getTime() < nowTs - 30 * 86400000) useYear = year + 1;
		else if (candidate.getTime() > nowTs + 183 * 86400000) {
			let prev = new Date(year - 1, month - 1, dayNum);
			if (prev.getTime() >= nowTs - 60 * 86400000) useYear = year - 1;
		}
			pushDate(`${useYear}-${m[2]}-${m[3]}`);
		}

		let list = Object.keys(found);
		return list.length == 1 ? list[0] : '';
	}

	_hasRelativeDateContext(text, keyword) {
		let idx = text.indexOf(keyword);
		if (idx < 0) return false;
		let around = text.slice(Math.max(0, idx - 12), idx + keyword.length + 24);
		if (/(上午|中午|下午|晚上|早上|凌晨|点|半|全天|拍摄|拍|视频|写真|跟拍|记录|新增|登记|安排|档期|事项|订单|休息|请假|跟进|客户|提醒)/.test(around)) return true;
		return /(记录|新增|登记|安排|档期|事项|订单|休息|请假|跟进|拍摄)/.test(text);
	}

	_extractRelativeTextDate(text) {
		text = asText(text, 800);
		if (!text) return '';
		let explicit = this._extractSingleTextDate(text);
		if (explicit) return explicit;
		let week = this._extractWeekdayTextDate(text);
		if (week) return week;

		let rules = [
			{ key: '大后天', days: 3 },
			{ key: '后天', days: 2 },
			{ key: '明天', days: 1 },
			{ key: '今天', days: 0 },
			{ key: '大前天', days: -3 },
			{ key: '前天', days: -2 },
			{ key: '昨天', days: -1 },
		];
		for (let item of rules) {
			if (text.includes(item.key) && this._hasRelativeDateContext(text, item.key)) {
				return this._addDays(timeUtil.time('Y-M-D'), item.days);
			}
		}
		return '';
	}

	_computeWeekdayOffset(text, maxLen, requireContext) {
		text = asText(text, maxLen);
		if (!text) return '';
		let weekMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
		let m = text.match(/(上上周|上上星期|上上礼拜|上周|上星期|上礼拜|下下周|下下星期|下下礼拜|下周|下星期|下礼拜|本周|这周|本星期|这星期|本礼拜|这礼拜|周|星期|礼拜)([一二三四五六日天])/);
		if (!m) return '';
		if (requireContext && !this._hasRelativeDateContext(text, m[0])) return '';
		let target = weekMap[m[2]];
		if (target === undefined) return '';
		let today = new Date(timeUtil.time('Y-M-D') + 'T00:00:00+08:00');
		if (Number.isNaN(today.getTime())) return '';
		let current = today.getDay();
		let currentIso = current === 0 ? 7 : current;
		let targetIso = target === 0 ? 7 : target;
		let prefix = m[1];
		let offset = targetIso - currentIso;
		if (prefix == '下下周' || prefix == '下下星期' || prefix == '下下礼拜') offset += 14;
		else if (prefix == '下周' || prefix == '下星期' || prefix == '下礼拜') offset += 7;
		else if (prefix == '上上周' || prefix == '上上星期' || prefix == '上上礼拜') offset -= 14;
		else if (prefix == '上周' || prefix == '上星期' || prefix == '上礼拜') offset -= 7;
		else if (prefix == '本周' || prefix == '这周' || prefix == '本星期' || prefix == '这星期' || prefix == '本礼拜' || prefix == '这礼拜') {
			// 本周/这周: stay in current week, no offset adjustment
		} else if (offset < 0) offset += 7;
		// bare weekday (no prefix): offset == 0 means today, offset < 0 means next occurrence
		return this._addDays(timeUtil.time('Y-M-D'), offset);
	}

	_extractWeekdayTextDate(text) {
		return this._computeWeekdayOffset(text, 800, true);
	}

	_resolveWeekdayFromText(text) {
		return this._computeWeekdayOffset(text, 30, false);
	}

	_extractSpecificTextDate(text) {
		text = asText(text, 800);
		if (!text) return '';
		let m = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
		if (m) {
			let year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
			if (year < 1990 || year > 2099) return '';
			let d = new Date(year, month - 1, day);
			if (d.getFullYear() == year && d.getMonth() + 1 == month && d.getDate() == day) {
				return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			}
		}
		m = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号](?![张条位个名组批次套件])/);
		if (m) {
			let year = Number(timeUtil.time('Y')), month = Number(m[1]), day = Number(m[2]);
			if (month < 1 || month > 12 || day < 1 || day > 31) return '';
			let d = new Date(year, month - 1, day);
			if (d.getFullYear() == year && d.getMonth() + 1 == month && d.getDate() == day) {
				if (d.getTime() < Date.now() - 30 * 86400000) year += 1;
				return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			}
		}
		return '';
	}

	_cleanActionDate(date, required = true, options = {}) {
		if (options.allowUserDateHint !== false) {
			let hint = this._extractRelativeTextDate(this._agentUserMessage || '');
			if (hint) return hint;
		}
		date = asText(date, 30);
		if (date) {
			let relRules = [
				{ key: '大后天', days: 3 },
				{ key: '后天', days: 2 },
				{ key: '明天', days: 1 },
				{ key: '今天', days: 0 },
				{ key: '大前天', days: -3 },
				{ key: '前天', days: -2 },
				{ key: '昨天', days: -1 },
			];
			for (let r of relRules) {
				if (date.includes(r.key)) return this._addDays(timeUtil.time('Y-M-D'), r.days);
			}
			let weekdayDate = this._resolveWeekdayFromText(date);
			if (weekdayDate) return weekdayDate;
		}
		if (this._isDatePlaceholder(date)) date = '';
		if (!asText(date, 20)) {
			let specific = this._extractSpecificTextDate(this._agentUserMessage || '');
			if (specific) return specific;
			let numeric = this._extractSingleTextDate(this._agentUserMessage || '');
			if (numeric) return numeric;
			if (options.defaultDate) return this._cleanDate(options.defaultDate, required);
			return this._addDays(timeUtil.time('Y-M-D'), 0);
		}
		return this._cleanDate(date, required);
	}

	_isDatePlaceholder(date) {
		date = asText(date, 30).trim();
		if (!date) return false;
		let normalized = date.replace(/\s+/g, '').toUpperCase();
		if (normalized == 'YYYY-MM-DD' || normalized == 'YYYY/MM/DD' || normalized == 'YYYY.MM.DD'
			|| normalized == 'YYYY-MM-DD.' || normalized == 'YYYY年MM月DD日' || normalized == 'YYYY年MM月DD号'
			|| normalized == 'DATE' || normalized == '<DATE>' || normalized == 'YYYYMMDD') return true;
		if (/\b(YYYY|MM|DD)\b/.test(normalized)) return true;
		if (/^\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}[日号]?[(（]/.test(normalized)) return true;
		return false;
	}

	_contextDate(pageContext = {}) {
		try {
			return this._cleanDate(pageContext && pageContext.day ? pageContext.day : '', false);
		} catch (err) {
			return '';
		}
	}

	async _normalizeImageAttachments(attachments = []) {
		if (!Array.isArray(attachments) || !attachments.length) return [];
		let list = [];
		for (let item of attachments.slice(0, 4)) {
			if (!item || typeof item != 'object') continue;
			let fileID = asText(item.fileID || item.cloudId || item.url || '', 500);
			if (!fileID) continue;
			let name = asText(item.name || '', 120);
			let type = asText(item.type || '', 40);
			let lower = (name || fileID).toLowerCase();
			let isImage = type == 'image' || /\.(png|jpe?g|webp|gif|bmp)$/i.test(lower);
			if (!isImage) continue;
			let url = fileID.startsWith('http://') || fileID.startsWith('https://') ? fileID : await cloudUtil.getTempFileURLOne(fileID);
			if (!url) continue;
			list.push({ fileID, url, name, type: 'image' });
		}
		return list;
	}

	_countDays(startDate, endDate) {
		let start = new Date(startDate + 'T00:00:00+08:00');
		let end = new Date(endDate + 'T00:00:00+08:00');
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
		return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
	}

	_cleanDate(date, required = true) {
		date = asText(date, 30)
			.replace(/T\d.*/, '')
			.replace(/\s+\d{1,2}[:：]\d{2}.*/, '')
			.replace(/(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2})\d+[:：].*$/, '$1')
			.replace(/([日号])\s*[\d一-龥][\s\S]*$/, '$1')
			.replace(/[./]/g, '-')
			.replace(/年|月/g, '-')
			.replace(/日|号/g, '')
			.replace(/\s+/g, '');
		date = date.replace(/-+/g, '-').replace(/^-|-$/g, '');
		if (!date && !required) return '';
		let m = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
		if (!m) {
			let year = Number(timeUtil.time('Y'));
			m = date.match(/^(\d{1,2})-(\d{1,2})$/);
			if (m) {
				let month = Number(m[1]), dayNum = Number(m[2]);
				let candidate = new Date(year, month - 1, dayNum);
				if (candidate.getTime() < Date.now() - 30 * 86400000) year += 1;
				date = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
			}
		} else {
			date = `${m[1]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) this.AppError('AI操作缺少合法日期，无法识别具体日期。请用"6月20日""下周五"等明确日期重新说明，或在档期详情页中直接录单。');
		let parts = date.split('-').map(num => Number(num));
		let d = new Date(parts[0], parts[1] - 1, parts[2]);
		if (d.getFullYear() != parts[0] || d.getMonth() + 1 != parts[1] || d.getDate() != parts[2]) {
			this.AppError('AI操作识别的日期不存在（如2月30日），请用正确的日期重新说明');
		}
		return date;
	}

	_cleanTime(text) {
		text = asText(text, 30);
		if (!text) return '';
		let m = text.match(/^(\d{1,2})[:：](\d{1,2})$/);
		if (m) {
			let h = Number(m[1]), min = Number(m[2]);
			if (h > 23 || min > 59) return '';
			return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
		}
		m = text.match(/^(上午|早上|中午|下午|晚上|凌晨)?\s*(\d{1,2})\s*点\s*(半|\d{1,2}分?)?\s*$/);
		if (m) {
			let hour = Number(m[2]);
			let period = m[1] || '';
			if ((period == '下午' || period == '晚上' || period == '中午') && hour < 12) hour += 12;
			if (hour > 23) return '';
			let minute = '00';
			if (m[3]) {
				if (m[3] === '半') { minute = '30'; }
				else { minute = String(Number(m[3].replace('分', ''))).padStart(2, '0'); }
			}
			return String(hour).padStart(2, '0') + ':' + minute;
		}
		return '';
	}

	_amount(value) {
		if (value === undefined || value === null || String(value).trim() === '') return 0;
		let num = Number(String(value).replace(/,/g, ''));
		if (!Number.isFinite(num) || num < 0) return 0;
		return Math.round(num * 100) / 100;
	}

	_amountFromKeys(data = {}, keys = []) {
		for (let key of keys) {
			if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== '') return this._amount(data[key]);
		}
		return 0;
	}

	_normalizeAgentPaymentType(type) {
		type = asText(type, 40).trim().toLowerCase();
		if (!type) return 'deposit';
		let aliases = {
			'\u5b9a\u91d1': 'deposit',
			'\u8ba2\u91d1': 'deposit',
			'\u9884\u4ed8': 'deposit',
			'\u9884\u4ed8\u6b3e': 'deposit',
			'\u5c3e\u6b3e': 'final',
			'\u8865\u5c3e\u6b3e': 'final',
			'\u5168\u6b3e': 'final',
			'\u4f59\u6b3e': 'final',
			'\u52a0\u7247': 'extra',
			'\u52a0\u7247\u6b3e': 'extra',
			'\u52a0\u9009': 'extra',
			'\u52a0\u9009\u6b3e': 'extra',
			'\u4ea7\u54c1': 'product',
			'\u4ea7\u54c1\u6b3e': 'product',
			'\u8865\u6b3e': 'supplement',
			'\u8ffd\u52a0\u6536\u6b3e': 'supplement',
			'\u9000\u6b3e': 'refund',
			'\u51b2\u51cf': 'adjust',
			'\u8c03\u6574': 'adjust',
		};
		let compact = type.replace(/[\s_\-]/g, '');
		let direct = ['deposit', 'final', 'extra', 'product', 'supplement', 'refund', 'adjust'];
		if (direct.includes(type)) return type;
		return aliases[compact] || 'deposit';
	}

	_normalizeAgentBaseType(baseType, paymentType) {
		baseType = asText(baseType, 40).trim().toLowerCase();
		let compact = baseType.replace(/[\s_\-]/g, '');
		let aliases = {
			'\u62cd\u6444': 'shoot',
			'\u62cd\u6444\u57fa\u6570': 'shoot',
			'\u6863\u671f': 'shoot',
			'\u8ba2\u5355': 'shoot',
			'\u52a0\u7247': 'extra',
			'\u52a0\u9009': 'extra',
			'\u4ea7\u54c1': 'extra',
			'\u5168\u90e8': 'all',
			'\u5168\u5355': 'all',
		};
		if (['shoot', 'extra', 'all'].includes(baseType)) return baseType;
		if (aliases[compact]) return aliases[compact];
		if (paymentType == 'extra' || paymentType == 'product') return 'extra';
		if (paymentType == 'supplement') return 'all';
		return 'shoot';
	}

	_cleanPaymentDate(date, fallbackDate = '') {
		if (this._isDatePlaceholder(date)) date = '';
		try {
			let day = this._cleanDate(date, false);
			if (day) return day;
		} catch (err) {}
		return fallbackDate || timeUtil.time('Y-M-D');
	}

	_makePaymentDto(type, amount, date, baseType = 'shoot', note = '') {
		amount = this._amount(amount);
		if (!amount) return null;
		type = this._normalizeAgentPaymentType(type);
		baseType = this._normalizeAgentBaseType(baseType, type);
		let clientKey = 'ai:' + Date.now() + ':' + Math.floor(Math.random() * 1000000);
		return {
			PAYMENT_CLIENT_KEY: clientKey,
			clientKey,
			PAYMENT_TYPE: type || 'deposit',
			type: type || 'deposit',
			PAYMENT_DIRECTION: 'income',
			direction: 'income',
			PAYMENT_BASE_TYPE: baseType || 'shoot',
			baseType: baseType || 'shoot',
			PAYMENT_AMOUNT: amount,
			amount,
			PAYMENT_DATE: date,
			date,
			PAYMENT_NOTE: note || 'AI识别实收',
			note: note || 'AI识别实收',
		};
	}

	_buildAgentPayments(data = {}, order = {}) {
		let list = [];
		let rawPayments = data.payments || data.ORDER_PAYMENTS || [];
		if (!Array.isArray(rawPayments)) rawPayments = rawPayments ? [rawPayments] : [];
		for (let item of rawPayments) {
			if (!item || typeof item != 'object') continue;
			let type = this._normalizeAgentPaymentType(item.type || item.PAYMENT_TYPE || 'deposit');
			let dto = this._makePaymentDto(
				type,
				item.amount || item.PAYMENT_AMOUNT || item.paymentAmount,
				this._cleanPaymentDate(item.date || item.PAYMENT_DATE, order.ORDER_DATE),
				this._normalizeAgentBaseType(item.baseType || item.PAYMENT_BASE_TYPE || 'shoot', type),
				asText(item.note || item.PAYMENT_NOTE || 'AI识别实收', 120)
			);
			if (dto) list.push(dto);
		}
		if (list.length) return list;

		let paidDeposit = this._amountFromKeys(data, ['paidDeposit', 'depositPaid', 'depositPaidAmount', 'ORDER_PAID_DEPOSIT']);
		let paidFinal = this._amountFromKeys(data, ['paidFinal', 'finalPaid', 'finalPaidAmount', 'ORDER_PAID_FINAL']);
		let paidExtra = this._amountFromKeys(data, ['paidExtra', 'extraPaid', 'extraPaidAmount', 'ORDER_PAID_EXTRA']);
		let paidAmount = this._amountFromKeys(data, ['paidAmount', 'actualAmount', 'receivedAmount', 'paid', 'ORDER_ACTUAL_AMOUNT', 'ORDER_PAID_AMOUNT']);

		// Do NOT auto-assume ORDER_DEPOSIT as paidDeposit: deposit is an expected/contracted amount,
		// not a confirmed receipt. Only create payment records from explicit "paid/received" fields.

		if (paidDeposit) list.push(this._makePaymentDto('deposit', paidDeposit, order.ORDER_DATE, 'shoot', 'AI识别已收定金'));
		if (paidFinal) list.push(this._makePaymentDto('final', paidFinal, order.ORDER_DATE, 'shoot', 'AI识别已收尾款'));
		if (paidExtra) list.push(this._makePaymentDto('extra', paidExtra, order.ORDER_DATE, 'extra', 'AI识别已收加选/产品'));
		if (!list.length && paidAmount) list.push(this._makePaymentDto('deposit', paidAmount, order.ORDER_DATE, 'shoot', 'AI识别实收'));

		return list.filter(item => item);
	}

	async _resolveType(data = {}) {
		let typeId = asText(data.typeId || data.ORDER_TYPE_ID, 80);
		let typeName = asText(data.typeName || data.ORDER_TYPE_NAME || data.type || '', 60);
		let type = null;
		if (typeId) type = await WorkTypeModel.getOne(typeId);
		if (!type && typeName) {
			let list = await WorkTypeModel.getAll({ TYPE_STATUS: 1 }, '*', {}, 200);
			type = (list || []).find(item => item.TYPE_NAME == typeName)
				|| (list || []).find(item => typeName.includes(item.TYPE_NAME) || item.TYPE_NAME.includes(typeName));
		}
		return {
			id: type ? type._id : '',
			name: type ? type.TYPE_NAME : (typeName || '其他'),
			color: type ? type.TYPE_COLOR : '#49cdbf',
		};
	}

	async _resolveParticipants(raw = []) {
		if (!Array.isArray(raw)) return [];
		let staffList = await WorkStaffModel.getAll({
			STAFF_STATUS: WorkStaffModel.STATUS.COMM,
		}, '_id,STAFF_NAME,STAFF_ROLES', {}, 1000);
		let list = [];
		for (let item of raw.slice(0, 12)) {
			if (!item || typeof item != 'object') continue;
			let staffId = asText(item.staffId || item.id || '', 80);
			let staffName = asText(item.staffName || item.name || '', 60);
			let staff = staffId ? (staffList || []).find(x => x._id == staffId) : null;
			if (!staff && staffName) {
				staff = (staffList || []).find(x => x.STAFF_NAME == staffName)
					|| (staffList || []).find(x => x.STAFF_NAME && (staffName.includes(x.STAFF_NAME) || x.STAFF_NAME.includes(staffName)));
			}
			if (!staff) continue;
			let roles = Array.isArray(staff.STAFF_ROLES) ? staff.STAFF_ROLES : [];
			let roleName = asText(item.roleName || item.role || '', 40) || roles[0] || '摄影';
			list.push({
				staffId: staff._id,
				staffName: staff.STAFF_NAME,
				roleName,
				calcMode: 'percent',
			});
		}
		return list;
	}

	async _addAuditNote(openId, title, content) {
		let work = new WorkService();
		let ret = await work.saveNote(openId, {
			NOTE_TYPE: 'team',
			NOTE_TITLE: title,
			NOTE_CONTENT: content,
			NOTE_DATE: timeUtil.time('Y-M-D'),
		});
		return ret && ret.id ? ret.id : '';
	}

	async _agentQuerySchedule(openId, staff, data = {}) {
		let startDate = this._cleanActionDate(data.startDate || data.date || data.ORDER_DATE);
		let endDate = this._cleanDate(data.endDate || data.end || startDate);
		if (endDate < startDate) endDate = startDate;
		let dayCount = this._countDays(startDate, endDate);
		if (dayCount > 14) this.AppError('AI一次最多查询14天档期，请缩小日期范围');
		let scope = asText(data.scope || 'all', 20);
		if (!['all', 'mine', 'joined', 'created'].includes(scope)) scope = 'all';

		let work = new WorkService();
		let rows = [];
		let noteList = await work.getNoteList(openId, 'all');
		for (let i = 0; i < dayCount; i++) {
			let day = this._addDays(startDate, i);
			let dayData = await work.getDayList(openId, day, scope);
			rows.push({
				day,
				orders: (dayData.orders || []).map(order => ({
					id: order._id,
					time: order.ORDER_TIME || '',
					typeName: order.ORDER_TYPE_NAME || '',
					customer: order.canFull ? (order.ORDER_CUSTOMER_NAME || '') : ((order.ORDER_CUSTOMER_SURNAME || '') + '姓客户'),
					place: order.canFull ? (order.ORDER_PLACE || '') : '',
					progress: order.ORDER_PROGRESS_DESC || '',
				})),
				items: (dayData.items || []).map(item => ({
					id: item._id,
					time: item.ITEM_TIME || '',
					title: item.ITEM_TITLE || '',
					content: item.ITEM_CONTENT || '',
				})),
				rests: (dayData.rests || []).map(rest => ({
					id: rest._id,
					staffName: rest.REST_STAFF_NAME || '',
					type: rest.REST_TYPE || '休息',
				})),
				notes: (noteList || []).filter(note => note.NOTE_DATE == day).slice(0, 8).map(note => ({
					id: note._id,
					type: note.NOTE_TYPE || '',
					title: note.NOTE_TITLE || '',
					content: note.NOTE_CONTENT || '',
					creatorName: note.NOTE_CREATOR_NAME || '',
				})),
			});
		}

		let total = rows.reduce((sum, row) => sum + row.orders.length + row.items.length + row.rests.length + row.notes.length, 0);
		let lines = [];
		for (let row of rows) {
			let parts = [];
			for (let order of row.orders) parts.push(`${order.time || '全天'} ${order.typeName}${order.customer ? '｜' + order.customer : ''}${order.place ? '｜' + order.place : ''}`);
			for (let item of row.items) parts.push(`${item.time || ''} 事项｜${item.title}`.trim());
			for (let rest of row.rests) parts.push(`休息｜${rest.staffName}${rest.type ? '｜' + rest.type : ''}`);
			for (let note of row.notes) parts.push(`小记｜${note.title}${note.content ? '：' + note.content.slice(0, 50) : ''}`);
			if (parts.length) lines.push(`${row.day}：${parts.join('；')}`);
		}

		let rangeText = startDate == endDate ? startDate : `${startDate} 至 ${endDate}`;
		let reply = total
			? `${rangeText} 共整理到 ${total} 条安排/小记：\n${lines.join('\n')}`
			: `${rangeText} 暂无档期、小记或休息记录。`;
		return {
			action: 'query_schedule',
			data: { startDate, endDate, scope, rows },
			reply,
		};
	}

	_extractBatchOrders(data = {}) {
		if (Array.isArray(data)) return data;
		if (!data || typeof data != 'object') return [];
		if (Array.isArray(data.orders)) return data.orders;
		if (Array.isArray(data.orderList)) return data.orderList;
		if (Array.isArray(data.ORDER_LIST)) return data.ORDER_LIST;
		return [];
	}

	_pickOrderAttachments(attachments = [], data = {}, index = 0, total = 1) {
		if (!Array.isArray(attachments) || !attachments.length) return [];
		let refs = data.attachmentIndexes || data.imageIndexes || data.attachmentIndex || data.imageIndex || [];
		if (!Array.isArray(refs)) refs = refs ? [refs] : [];
		refs = refs.map(item => Number(item)).filter(num => Number.isFinite(num) && num > 0);
		if (refs.length) return refs.map(num => attachments[num - 1]).filter(item => item);
		if (total == attachments.length && attachments[index]) return [attachments[index]];
		return attachments;
	}

	_errorText(err) {
		return asText((err && (err.msg || err.message || err.errMsg)) || '信息不足', 120);
	}

	async _buildAgentOrder(data = {}, attachments = [], options = {}) {
		let date = this._cleanActionDate(data.date || data.ORDER_DATE, true, options);
		let customerName = asText(data.customerName || data.ORDER_CUSTOMER_NAME, 80);
		if (!customerName) this.AppError('AI新增订单缺少客户名称');
		let type = await this._resolveType(data);
		let participants = await this._resolveParticipants(data.participants || data.ORDER_PARTICIPANTS || []);
		let order = {
			ORDER_DATE: date,
			ORDER_TIME: this._cleanTime(data.time || data.ORDER_TIME),
			ORDER_END_TIME: this._cleanTime(data.endTime || data.ORDER_END_TIME),
			ORDER_TYPE_ID: type.id,
			ORDER_TYPE_NAME: type.name,
			ORDER_TYPE_COLOR: type.color,
			ORDER_CUSTOMER_NAME: customerName,
			ORDER_CUSTOMER_MOBILE: asText(data.customerMobile || data.ORDER_CUSTOMER_MOBILE, 30),
			ORDER_SOURCE: asText(data.source || data.ORDER_SOURCE, 60),
			ORDER_CONTENT: asText(data.content || data.ORDER_CONTENT || '', 800),
			ORDER_PLACE: asText(data.place || data.ORDER_PLACE, 120),
			ORDER_AMOUNT: this._amount(data.amount || data.ORDER_AMOUNT),
			ORDER_DEPOSIT: this._amount(data.deposit || data.ORDER_DEPOSIT),
			ORDER_FINAL: this._amount(data.final || data.ORDER_FINAL),
			ORDER_EXTRA: this._amount(data.extra || data.ORDER_EXTRA),
			ORDER_PARTICIPANTS: participants,
			ORDER_ATTACHMENTS: attachments.map(item => item.fileID).filter(id => id),
		};
		order.ORDER_PAYMENTS = this._buildAgentPayments(data, order);
		return { date, customerName, type, participants, order };
	}

	_orderLine(order = {}) {
		return `${order.ORDER_DATE || ''} ${order.ORDER_TIME || ''} ${order.ORDER_TYPE_NAME || '其他'}，客户${order.ORDER_CUSTOMER_NAME || ''}`.replace(/\s+/g, ' ').trim();
	}

	_isSameOrderForDuplicate(order = {}, old = {}) {
		let work = new WorkService();
		return work.isSameOrderForDuplicate(order, old);
	}

	async _findDuplicateOrder(order = {}) {
		let work = new WorkService();
		return await work.findDuplicateOrder(order);
	}

	async _saveBuiltAgentOrder(openId, staff, built) {
		let { date, customerName, type, participants, order } = built;
		let work = new WorkService();
		let ret = await work.saveOrder(openId, order);
		let saved = await WorkOrderModel.getOne(ret.id);
		if (!saved || saved.ORDER_DATE != order.ORDER_DATE || saved.ORDER_CUSTOMER_NAME != order.ORDER_CUSTOMER_NAME) {
			this.AppError('订单保存后校验失败，请重试');
		}
		let participantText = participants.map(p => `${p.staffName || p.staffId}(${p.roleName})`).join('、');
		let summary = `${staff.STAFF_NAME || '员工'}通过AI新增订单档期：${date} ${order.ORDER_TIME || ''}，${type.name}，客户${customerName}${order.ORDER_PLACE ? '，地点' + order.ORDER_PLACE : ''}${participantText ? '，参与人：' + participantText : ''}。记录ID：${ret.id}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI操作记录：新增订单档期', summary);
		return {
			action: 'create_order',
			id: ret.id,
			data: { date, order },
			auditNoteId,
			reply: `已新增订单档期：${date} ${order.ORDER_TIME || ''}，${type.name}，客户${customerName}。已同步写入全体小记审查流水。`,
		};
	}

	async _agentCreateOrder(openId, staff, data = {}, attachments = [], pageContext = {}) {
		let built = await this._buildAgentOrder(data, attachments, { allowUserDateHint: true, defaultDate: this._contextDate(pageContext) });
		let duplicate = await this._findDuplicateOrder(built.order);
		if (duplicate) {
			return {
				action: 'create_order',
				id: duplicate._id,
				data: { date: built.date, order: built.order, skipped: [{ index: 1, reason: '系统已存在同日同客户且同类型的订单', duplicateId: duplicate._id }] },
				reply: `没有新增订单：\n1. ${this._orderLine(built.order)} 已存在，已跳过。\n如果这是另一个不同订单，请补充不同客户信息或不同拍摄类型后再让我记录。`,
			};
		}
		return await this._saveBuiltAgentOrder(openId, staff, built);
	}

	async _agentCreateOrders(openId, staff, data = {}, attachments = [], pageContext = {}) {
		let rawOrders = this._extractBatchOrders(data);
		if (!rawOrders.length) this.AppError('AI批量新增订单缺少订单列表');
		if (rawOrders.length > 8) this.AppError('AI一次最多新增8条订单档期，请分批发送');

		let prepared = [];
		let skipped = [];
		for (let i = 0; i < rawOrders.length; i++) {
			let raw = rawOrders[i] || {};
			let pickedAttachments = this._pickOrderAttachments(attachments, raw, i, rawOrders.length);
			try {
				let built = await this._buildAgentOrder(raw, pickedAttachments, { allowUserDateHint: false, defaultDate: this._contextDate(pageContext) });
				built.sourceIndex = i + 1;
				prepared.push(built);
			} catch (err) {
				skipped.push({ index: i + 1, reason: this._errorText(err) });
			}
		}
		if (!prepared.length) {
			let reason = skipped.length ? ('：' + skipped.map(item => `第${item.index}条${item.reason}`).join('；')) : '';
			this.AppError('截图中识别到多条信息，但都缺少合法日期或客户名称，无法录入。建议在消息中注明日期（如"6月20日的订单"），或直接在档期详情页中录单。' + reason);
		}

		let created = [];
		let accepted = [];
		for (let built of prepared) {
			let batchDuplicate = accepted.find(item => this._isSameOrderForDuplicate(built.order, item.order));
			if (batchDuplicate) {
				skipped.push({
					index: built.sourceIndex || 0,
					reason: '本批次已识别到同日同客户且同类型的订单',
					line: this._orderLine(built.order),
				});
				continue;
			}

			let duplicate = await this._findDuplicateOrder(built.order);
			if (duplicate) {
				skipped.push({
					index: built.sourceIndex || 0,
					reason: '系统已存在同日同客户且同类型的订单',
					duplicateId: duplicate._id,
					line: this._orderLine(built.order),
				});
				continue;
			}
			created.push(await this._saveBuiltAgentOrder(openId, staff, built));
			accepted.push(built);
		}

		let lines = created.map((ret, idx) => {
			let order = ret.data && ret.data.order ? ret.data.order : {};
			return `${idx + 1}. ${ret.data.date} ${order.ORDER_TIME || ''} ${order.ORDER_TYPE_NAME || '其他'}，客户${order.ORDER_CUSTOMER_NAME || ''}`.replace(/\s+/g, ' ').trim();
		});
		let reply = created.length
			? `已新增 ${created.length} 条订单档期：\n${lines.join('\n')}\n已同步写入全体小记审查流水。`
			: '本次没有新增订单档期。';
		if (skipped.length) {
			reply += `\n已跳过/未记录 ${skipped.length} 条：\n${skipped.map((item, idx) => `${idx + 1}. ${item.line || ('第' + item.index + '条')}：${item.reason}`).join('\n')}`;
		}
		reply += '\n如果截图里还有我漏掉的订单，请告诉我是第几张图第几条，我会继续补录。';
		return {
			action: 'create_orders',
			id: created[0] ? created[0].id : '',
			data: {
				date: created[0] && created[0].data ? created[0].data.date : '',
				dates: created.map(item => item.data && item.data.date).filter(day => day),
				orders: created.map(item => item.data && item.data.order).filter(order => order),
				skipped,
			},
			auditNoteId: created.map(item => item.auditNoteId).filter(id => id).join(','),
			reply,
		};
	}

	async _agentJoinOrder(openId, staff, data = {}, pageContext = {}) {
		let orderId = asText(data.orderId || data.id || data.ORDER_ID || pageContext.orderId || '', 120);
		if (!orderId) this.AppError('当前没有可加入的订单，请先打开订单详情页，或告诉我订单ID');
		let roleName = asText(data.roleName || data.role || '', 40);
		let work = new WorkService();
		let ret = await work.joinOrder(openId, orderId, roleName);
		return {
			action: 'join_order',
			id: orderId,
			data: { orderId, roleName: ret.roleName || roleName, already: ret.already || false },
			reply: ret.already
				? '你已经是这个订单的参与人了，不需要重复添加。'
				: `已把你加入这个订单的参与人，岗位：${ret.roleName || roleName || '按你的员工默认岗位'}。如果提成金额有问题，可以向管理员申诉调整。`,
		};
	}

	async _agentCreateItem(openId, staff, data = {}) {
		let date = this._cleanActionDate(data.date || data.ITEM_DATE);
		let title = asText(data.title || data.ITEM_TITLE, 80);
		if (!title) this.AppError('AI新增事项缺少标题');
		let item = {
			ITEM_DATE: date,
			ITEM_TIME: this._cleanTime(data.time || data.ITEM_TIME),
			ITEM_END_TIME: this._cleanTime(data.endTime || data.ITEM_END_TIME),
			ITEM_TITLE: title,
			ITEM_CONTENT: asText(data.content || data.ITEM_CONTENT || '', 800),
		};
		let work = new WorkService();
		let ret = await work.saveItem(openId, item, { forceActive: true });
		let saved = await WorkItemModel.getOne(ret.id);
		if (!saved || saved.ITEM_DATE != item.ITEM_DATE || saved.ITEM_TITLE != item.ITEM_TITLE || saved.ITEM_STATUS != 1) {
			this.AppError('事项保存后校验失败，请重试');
		}
		let summary = `${staff.STAFF_NAME || '员工'}通过AI新增事项档期：${date} ${item.ITEM_TIME || ''}，${title}${item.ITEM_CONTENT ? '，备注：' + item.ITEM_CONTENT : ''}。记录ID：${ret.id}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI操作记录：新增事项档期', summary);
		return {
			action: 'create_item',
			id: ret.id,
			data: { date, item },
			auditNoteId,
			reply: `已新增事项档期：${date} ${item.ITEM_TIME || ''}，${title}。已同步写入全体小记审查流水。`,
		};
	}

	async _agentCreateRest(openId, staff, data = {}) {
		let date = this._cleanActionDate(data.date || data.REST_DATE);
		let rest = {
			REST_DATE: date,
			REST_TYPE: asText(data.type || data.restType || data.REST_TYPE || '休息', 40) || '休息',
			REST_REASON: asText(data.reason || data.REST_REASON || '', 300),
		};
		let work = new WorkService();
		let ret = await work.saveRest(openId, rest);
		let summary = `${staff.STAFF_NAME || '员工'}通过AI新增休息/请假申请：${date}，${rest.REST_TYPE}${rest.REST_REASON ? '，原因：' + rest.REST_REASON : ''}。记录ID：${ret.id}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI操作记录：新增休息申请', summary);
		return {
			action: 'create_rest',
			id: ret.id,
			data: { date, rest },
			auditNoteId,
			reply: `已新增${rest.REST_TYPE}申请：${date}${rest.REST_REASON ? '，' + rest.REST_REASON : ''}。已同步写入全体小记审查流水。`,
		};
	}

	async _agentAddNote(openId, staff, data = {}) {
		let title = asText(data.title || data.NOTE_TITLE, 80);
		if (!title) this.AppError('AI新增小记缺少标题');
		let note = {
			NOTE_TYPE: (data.noteType || data.NOTE_TYPE) == 'personal' ? 'personal' : 'team',
			NOTE_TITLE: title,
			NOTE_CONTENT: asText(data.content || data.NOTE_CONTENT || '', 1000),
			NOTE_DATE: this._cleanActionDate(data.date || data.NOTE_DATE || timeUtil.time('Y-M-D'), false) || timeUtil.time('Y-M-D'),
		};
		let work = new WorkService();
		let ret = await work.saveNote(openId, note);
		let auditNoteId = '';
		if (note.NOTE_TYPE != 'team' || !title.startsWith('AI操作记录')) {
			let summary = `${staff.STAFF_NAME || '员工'}通过AI新增${note.NOTE_TYPE == 'team' ? '团队' : '个人'}小记：${title}。记录ID：${ret.id}`;
			auditNoteId = await this._addAuditNote(openId, 'AI操作记录：新增小记', summary);
		}
		return {
			action: 'add_note',
			id: ret.id,
			data: { date: note.NOTE_DATE, note },
			auditNoteId,
			reply: `已新增${note.NOTE_TYPE == 'team' ? '团队' : '个人'}小记：${title}。已同步写入全体小记审查流水。`,
		};
	}

	_parseModelList(result) {
		let raw = [];
		if (Array.isArray(result)) raw = result;
		else if (result && Array.isArray(result.data)) raw = result.data;
		else if (result && Array.isArray(result.models)) raw = result.models;
		else if (result && result.data && Array.isArray(result.data.data)) raw = result.data.data;
		else if (result && result.result && Array.isArray(result.result.models)) raw = result.result.models;
		else if (result && result.result && Array.isArray(result.result.data)) raw = result.result.data;

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
			id = asText(id, 120);
			if (!id || seen[id]) continue;
			seen[id] = true;
			models.push(id);
		}
		return models;
	}

	_getJson(url, extraHeaders = {}) {
		return this._requestJson(url, 'GET', null, extraHeaders);
	}

	_postJson(url, data, extraHeaders = {}) {
		return this._requestJson(url, 'POST', data, extraHeaders);
	}

	_requestJson(url, method, data, extraHeaders = {}) {
		return new Promise((resolve, reject) => {
			let hasBody = data !== null && data !== undefined;
			let body = hasBody ? JSON.stringify(data) : '';
			let req = https.request(url, {
				method,
				headers: Object.assign({ 'Accept': 'application/json' }, hasBody ? {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(body),
				} : {}, extraHeaders || {}),
				timeout: 45000,
			}, res => {
				let chunks = '';
				res.setEncoding('utf8');
				res.on('data', chunk => chunks += chunk);
				res.on('end', () => {
					let parsed = {};
					try {
						parsed = JSON.parse(chunks || '{}');
					} catch (err) {
						parsed = { raw: chunks };
					}
					if (res.statusCode >= 200 && res.statusCode < 300) {
						resolve(parsed);
						return;
					}
					let err = new Error('AI HTTP ' + res.statusCode);
					err.statusCode = res.statusCode;
					err.safeMessage = this._httpSafeMessage(res.statusCode, parsed);
					reject(err);
				});
			});
			req.on('timeout', () => req.destroy(new Error('AI request timeout')));
			req.on('error', err => {
				if (err && err.message == 'AI request timeout') err.safeMessage = 'AI 接口超时，请稍后重试';
				else if (err && !err.safeMessage) err.safeMessage = 'AI 接口连接失败，请检查网络或后台配置';
				reject(err);
			});
			if (hasBody) req.write(body);
			req.end();
		});
	}

	_httpSafeMessage(statusCode, parsed) {
		let msg = parsed && parsed.error && parsed.error.message ? String(parsed.error.message) : '';
		if (statusCode == 401 || statusCode == 403) return 'AI 接口鉴权失败，请检查 API Key';
		if (statusCode == 404) return 'AI 接口地址或模型不存在，请检查后台配置';
		if (statusCode == 429) return 'AI 接口额度或频率受限，请稍后重试';
		if (statusCode >= 500) return 'AI 服务暂时不可用，请稍后重试';
		return msg ? ('AI 接口返回错误：' + msg.slice(0, 120)) : 'AI 接口返回错误，请检查后台配置';
	}
}

module.exports = WorkAiService;

