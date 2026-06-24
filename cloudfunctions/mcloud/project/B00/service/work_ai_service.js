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
const WorkPaymentService = require('./work_payment_service.js');
const WorkCommissionService = require('./work_commission_service.js');
const WorkPayrollService = require('./work_payroll_service.js');
const WorkPerformanceService = require('./work_performance_service.js');
const AdminWorkService = require('./admin/admin_work_service.js');
const WorkStaffModel = require('../model/work_staff_model.js');
const WorkTypeModel = require('../model/work_type_model.js');
const WorkOrderModel = require('../model/work_order_model.js');
const WorkItemModel = require('../model/work_item_model.js');
const knowledgeService = require('./work_ai_knowledge.js');
const agentRegistry = require('./work_ai_agent_registry.js');
const agentMemory = require('./work_ai_agent_memory.js');
const WorkAgentAuditModel = require('../model/work_agent_audit_model.js');

const SETUP_KEY = 'WORK_AI_CHAT_CONFIG';
const LEGACY_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const DEFAULT_CONFIG = {
	enabled: false,
	providerName: 'Agnes APIHub',
	apiUrl: 'https://apihub.agnes-ai.com/v1',
	model: 'gpt-4o-mini',
	visionApiUrl: '',
	visionModel: '',
	visionApiKey: '',
	apiKey: '',
	personality: 'ops_cat',
	systemPrompt: '你是云屿摄影小程序里的小猫 AI 助手，语气简洁、友好、务实。你主要帮助摄影工作室员工记录订单、梳理档期、整理客户跟进事项、处理收款/提成/工资/审核等管理动作、解释小程序功能。不要编造系统里真实存在的数据；能通过工具查询的数据要主动查询，能通过当前登录账号权限执行的动作要交给工具和后台校验。',
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
		prompt: '性格：谨慎、专业、偏审核。对收款、提成、工资、取消、作废、审核等高风险事项要先核对对象、金额、日期、原因和唯一性；不要因敏感就自称不能操作，当前登录账号有权限时交给工具执行，后台会做最终权限和数据校验。',
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
	'AI权限边界：小猫能力跟随当前登录员工账号；普通员工按个人权限操作，管理员可执行管理端收款、退款/冲减、作废收款、查询提成/工资、发放工资、订单审核等动作；所有写入仍由后台服务做最终权限和数据校验。',
	'AI写入规则：凡是AI执行写入动作，都要在团队小记自动追加一条全体可见的操作审查流水。',
];

// === Phase 1: Dynamic Prompt Layering ===

// === Phase 2: Smart Model Routing ===

function getModelForTask(queryType, configModel) {
	// Respect the admin-configured model for all task types.
	// Some API hubs do not expose every OpenAI model alias; forcing a default
	// model here can cause repeated "AI service unavailable" even when the
	// configured model is healthy.
	if (queryType === 'complex') return configModel || 'gpt-4o-mini';
	if (queryType === 'write') return configModel || 'gpt-4o-mini';
	if (queryType === 'chat' || queryType === 'explain') return configModel || 'gpt-4o-mini';
	return configModel || 'gpt-4o-mini';
}

function getModelForRequest(queryType, config = {}, hasImages = false) {
	if (hasImages) return asText(config.visionModel, 120) || asText(config.model, 120) || DEFAULT_CONFIG.model;
	return getModelForTask(queryType, config.model);
}

function getApiUrlForRequest(config = {}, hasImages = false) {
	if (hasImages && config.visionApiUrl) return normalizeChatApiUrl(config.visionApiUrl);
	return normalizeChatApiUrl(config.apiUrl);
}

function getApiKeyForRequest(config = {}, hasImages = false) {
	if (hasImages && config.visionApiKey) return config.visionApiKey;
	return config.apiKey;
}

function getProviderNameForRequest(config = {}, hasImages = false) {
	let provider = config.providerName || DEFAULT_CONFIG.providerName;
	if (hasImages && (config.visionApiUrl || config.visionModel || config.visionApiKey)) return provider + ' · 视觉';
	return provider;
}

function getMaxTokensForTask(queryType, configMaxTokens) {
	switch (queryType) {
		case 'chat': return Math.max(400, Math.min(configMaxTokens || 600, 500));
		case 'explain': return Math.max(400, Math.min(configMaxTokens || 600, 500));
		case 'query': return Math.max(500, Math.min(configMaxTokens || 600, 800));
		case 'write': return Math.max(800, configMaxTokens || 600);
		case 'complex': return Math.max(1000, configMaxTokens || 800);
		default: return configMaxTokens || 600;
	}
}

function classifyQueryType(message, pageContext = {}) {
	let text = asText(message, 400);
	if (!text) return 'chat';
	// Screenshot recognition
	if (/截图|图片|识别|录单|拍摄/.test(text)) return 'complex';
	if (/收款|退款|冲减|作废|工资|提成|审核|财务|发工资|到账|已收|实收|付款|支付|转账|红包|定金|尾款/.test(text)) {
		if (/查询|查一下|看看|看下|多少|列表|明细|记录|流水|详情|有没有|统计|预览|概览|汇总|排行|排名|情况/.test(text)) return 'query';
		return 'write';
	}
	// Write actions: create/record/arrange/update orders, items, rests, notes
	if (/新增|记录|安排|登记|录入|创建|添加|请假|休息|修改|更改|更正|调整|改期|改到|调到|换到|移到|挪到/.test(text)) return 'write';
	// Query actions: schedule, orders, notes
	if (/查询|档期|小记|什么时候|安排|有什么|干什么|明天|今天|昨天|下周|这周/.test(text)) return 'query';
	// Function inquiry
	if (/功能|怎么用|能做什么|小程序|帮助/.test(text)) return 'explain';
	return 'chat';
}

function compressStaffList(staffOptions = []) {
	if (!staffOptions.length) return '';
	return staffOptions.slice(0, 40).map(item => {
		let roles = Array.isArray(item.STAFF_ROLES) ? item.STAFF_ROLES.filter(r => r).slice(0, 2).join('/') : '';
		return item.STAFF_NAME + (roles ? '(' + roles + ')' : '');
	}).join('、');
}

function compressTypeList(typeOptions = []) {
	if (!typeOptions.length) return '';
	return typeOptions.slice(0, 20).map(item => item.TYPE_NAME).join('、');
}

function buildCorePrompt(staff, pageContext = {}) {
	return [
		'你是云屿摄影小程序里的小猫 AI 助手，语气简洁、友好、务实。',
		'当前日期：' + timeUtil.time('Y-M-D') + '。',
		'当前员工：' + (staff.STAFF_NAME || '员工') + '，管理员：' + (staff.STAFF_IS_ADMIN == 1 ? '是' : '否') + '。',
		'你的业务权限基于当前登录员工账号：普通员工只能操作自己有权操作的数据；管理员可使用管理端能力；最终以后台服务校验为准，不要自称没有权限，除非系统返回无权限。',
		'回答请控制在 200 字以内。',
	].join('\n');
}

function buildToolPrompt() {
	return [
		'你也是云屿摄影小程序内的受控执行型业务智能体。',
		'用户说“今天/明天/后天”时必须严格按当前日期换算。',
		'只允许这些动作：query_schedule、create_order、create_orders、join_order、cancel_order、update_order、create_item、create_rest、add_note、query_payments、save_payment、void_payment、query_commissions、query_payroll、pay_payroll、audit_order、none。',
		'权限原则：不要因为动作敏感就直接拒绝；先按当前登录账号生成最准确的动作参数，后台会按员工/管理员权限拦截。',
		'当用户要求取消/删除订单时用cancel_order；当用户要求修改/更正订单信息（如日期、时间、类型等）时用update_order。',
		'用户说“这个是昨天的截图，修改一下”“记错了，应该是20号”等纠错场景：如果能找到原订单，优先用update_order修改日期；如果找不到明确订单，用cancel_order取消错误记录后重新create_order。',
		'深度判断约束：先辨别“应收/报价/套餐金额”和“实收/已付/到账/红包/转账”；只有明确已收才生成收款；日期优先取截图/客户原话里的具体日期；遇到多个候选订单必须追问。',
		'常见误导约束：红包/转账截图必须看清是对方付款且已领取/到账；“定金200”可视为实收定金，“399写真”通常是套餐/应收不是已收；“明天/今天”不能覆盖截图里的6月20日这类明确日期；同一天多单、同名客户、金额不清、收款方向不清时必须none追问。',
		'破坏性动作约束：取消订单、作废收款、发工资、审核不通过必须有明确对象ID或唯一可定位对象，并有原因/说明；不能用模糊描述批量执行。',
		'禁止编造订单ID、客户名、金额、收款状态、员工身份；缺少关键字段用none追问。',
		'严禁幻觉：如果你返回none动作，reply里绝不能说"已修改/已帮你/已完成/已处理/已执行"等成功表述，否则用户会误以为操作成功了。none时只能说"需要补充XX信息"或"请提供XX"。',
		'动作JSON格式：{"action":"...","reply":"...","data":{...}}。',
	].join('\n');
}

function buildWriteActionPrompt() {
	return [
		'query_schedule.data: startDate(YYYY-MM-DD)、endDate、scope(all/mine/joined/created)。',
		'create_order.data: date(必填)、customerName(必填)、time、endTime、typeName、typeId、customerMobile、source、place、content、amount、deposit、final、extra、participants[]。',
		'金额识别：amount/订单总应收，deposit/final/extra是应收结构，paidAmount/paidDeposit/paidFinal/payments才是实际已收。',
		'create_orders.data: orders[]（2条及以上必须用create_orders）。',
		'create_item.data: date(必填)、title(必填)、time、content。',
		'create_rest.data: date(必填)、type(休息/请假/调休/外出)、reason。',
		'add_note.data: noteType(team/personal)、title(必填)、content、date。',
		'join_order.data: orderId、roleName。',
		'cancel_order.data: orderId(或customerName+date)、reason。',
		'update_order.data: orderId(或customerName+date作为查找条件)、newDate(新日期)、newTime、newType、newCustomerName、newPlace、newAmount、newContent。只传要修改的字段。',
		'query_payments.data: month、keyword、orderId、type、direction、status、size。',
		'query_payments权限：普通员工只能查自己的收款/业绩相关记录；管理员可查全店或指定员工。',
		'save_payment.data: orderId(必填)、type(deposit/final/extra/product/supplement/refund/adjust或中文)、amount(必填)、date、baseType、note、refPaymentId。退款/冲减必须写原因note。',
		'void_payment.data: paymentId(必填)、reason(必填)。',
		'query_commissions.data: month、staffId/staffName、orderId、paymentId、kind、status、keyword、size。',
		'query_commissions权限：普通员工只能查自己的提成；管理员可查全店或指定员工。',
		'query_payroll.data: month、staffId/staffName；普通员工默认查自己，管理员可查指定员工。',
		'pay_payroll.data: month(必填)、staffId/staffName(必填)、note；只有管理员可发工资，系统会按当前预览哈希校验后发放。',
		'audit_order.data: orderId(必填)、pass(true/false)、reason、participants、orderEditTime。',
		'缺少日期或客户名称时用none追问。',
		'写入动作系统自动追加审查小记。',
	].join('\n');
}

function buildImagePrompt() {
	return [
		'图片识别规则：先判断截图类型，是聊天约档、订单信息、收款/红包/转账凭证、工资/提成/审核信息，还是无关图片；不要默认所有图片都是新增订单。',
		'订单截图：逐张识别日期、时间、客户、电话、地点、拍摄类型、备注；一张图可能有多个订单，逐条提取；1条用create_order，2条及以上用create_orders。',
		'本小程序“订单档期/每日详情”截图：顶部大标题形如2026.09.11/2026-09-11通常是页面日期，卡片灰底文字可能是备注、原拍摄日期或客户原话。',
		'若顶部页面日期和卡片灰底备注里的日期冲突，例如顶部是2026.09.11但备注写“9.16摄影”，不要直接新增/修改订单；必须返回none追问用户：“这个订单档期按页面日期9.11，还是按备注里的9.16？”',
		'只有当用户文字明确说“以页面日期为准”“这个是9.11”“爱公馆是9.11”“把9.16改成9.11”等纠错指令时，才可按用户明确指定日期执行。',
		'多张相似截图必须逐张独立读取顶部日期，不要把第二张图的日期套到第一张图。',
		'收款截图：必须确认付款方向、金额、是否已领取/到账、对应订单；只有在有orderId或当前页面唯一订单时才save_payment，否则用none追问订单对象。',
		'财务/工资/审核截图：只提取系统能确认的字段；对象、月份、金额、员工、原因不唯一时用none追问，不要猜。',
		'日期优先级：截图/图片中出现的具体日期（如6月20日、6/20）是订单日期的首要来源。',
		'当用户文字中包含“今天/明天/后天/昨天”等相对日期时，如果截图中能找到明确日期，必须以截图日期为准，不要用文字中的相对日期换算。',
		'示例：用户说“明天拍摄”但截图显示6/20，则date应为6/20对应的日期，而不是明天的日期。截图是客户或系统发出的真实档期凭证。',
	].join('\n');
}

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
	if (model.includes('qwen') || model.includes('kimi') || model.includes('mimo')) return 128000;
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
			visionApiUrl: asText(input.visionApiUrl, 400),
			visionModel: asText(input.visionModel, 120),
			visionApiKey: options.clearVisionKey ? '' : (asText(input.visionApiKey, 400) || current.visionApiKey || ''),
			apiKey: options.clearKey ? '' : (apiKey || current.apiKey || ''),
			personality: PERSONALITY_MAP[input.personality] ? input.personality : DEFAULT_CONFIG.personality,
			systemPrompt: asText(input.systemPrompt, 3000) || DEFAULT_CONFIG.systemPrompt,
			temperature: asNumber(input.temperature, DEFAULT_CONFIG.temperature, 0, 2),
			maxTokens: Math.round(asNumber(input.maxTokens, DEFAULT_CONFIG.maxTokens, 128, 4000)),
		};

		this._assertApiUrl(normalizeChatApiUrl(next.apiUrl));
		if (next.visionApiUrl) this._assertApiUrl(normalizeChatApiUrl(next.visionApiUrl));
		if (next.enabled && !next.apiKey && !getEnvApiKey()) this.AppError('启用 AI 前请先填写 API Key');

		await setupUtil.set(SETUP_KEY, next);
		return this._publicConfig(await this._getConfig());
	}

	async chat(openId, message, history = [], attachments = [], pageContext = {}) {
		let staff = await this.assertStaff(openId);
		let config = await this._getConfig();

		if (!config.enabled) this.AppError('AI 小助手暂未启用，请管理员先配置');
		if (!config.apiKey && !config.visionApiKey) this.AppError('AI API Key 未配置，请管理员先配置');

		message = asText(message, 800);
		if (!message) this.AppError('请输入要发送的内容');
		this._agentUserMessage = message;

		let localRet = await this._tryHandleLocalIntent(openId, staff, message, history, pageContext, config);
		if (localRet) return localRet;

		let missedImageIndex = this._parseMissedImageIndex(message);
		if (missedImageIndex && (!attachments || !attachments.length)) {
			return this._localAgentResult(config, {
				action: 'none',
				reply: '\u6211\u77e5\u9053\u4f60\u8bf4\u7b2c ' + missedImageIndex + ' \u5f20\u6f0f\u4e86\uff0c\u4f46\u5f53\u524d\u6d88\u606f\u6ca1\u6709\u5e26\u5230\u90a3\u5f20\u56fe\u3002\u8bf7\u91cd\u65b0\u4e0a\u4f20\u7b2c ' + missedImageIndex + ' \u5f20\u56fe\uff0c\u6216\u66f4\u65b0\u540e\u76f4\u63a5\u8bf4\u201c\u7b2c' + missedImageIndex + '\u5f20\u6f0f\u4e86\u201d\uff0c\u6211\u4f1a\u53ea\u8bc6\u522b\u8fd9\u4e00\u5f20\u3002',
			});
		}

		let imageAttachments = await this._normalizeImageAttachments(attachments);
		let messages = await this._buildAgentMessages(config, staff, message, history, imageAttachments, pageContext);
		let hasImages = imageAttachments.length > 0;

		// Phase 2: Smart model routing
		let queryType = classifyQueryType(message, pageContext);
		let selectedModel = getModelForRequest(queryType, config, hasImages);
		let selectedMaxTokens = getMaxTokensForTask(queryType, config.maxTokens);
		let selectedApiUrl = getApiUrlForRequest(config, hasImages);
		let selectedApiKey = getApiKeyForRequest(config, hasImages);
		this._assertApiUrl(selectedApiUrl);
		if (!selectedApiKey) this.AppError(hasImages ? '图片识别 API Key 未配置，请管理员先配置视觉 Key 或主 Key' : 'AI API Key 未配置，请管理员先配置');

		let body = {
			model: selectedModel,
			messages,
			temperature: (queryType === 'write' || queryType === 'complex') ? Math.min(config.temperature, 0.3) : config.temperature,
			max_tokens: selectedMaxTokens,
			stream: false,
		};

		try {
			let result = await this._postJson(selectedApiUrl, body, {
				Authorization: 'Bearer ' + selectedApiKey,
			});
			let reply = this._pickReply(result);
			if (!reply) this.AppError('AI 接口返回格式不支持，请检查接口是否兼容 Chat Completions');
			let responseConfig = Object.assign({}, config, {
				model: selectedModel,
				providerName: getProviderNameForRequest(config, hasImages),
			});
			return await this._handleAgentReply(openId, staff, reply, responseConfig, result, imageAttachments, pageContext);
		} catch (err) {
			if (err && err.name == 'AppError') throw err;
			if (this._shouldRetryWithMinimalBody(err, body)) {
				try {
					let minimalBody = this._minimalChatBody(body);
					let minimalResult = await this._postJson(selectedApiUrl, minimalBody, {
						Authorization: 'Bearer ' + selectedApiKey,
					});
					let minimalReply = this._pickReply(minimalResult);
					if (minimalReply) {
						let minimalConfig = Object.assign({}, config, {
							model: selectedModel,
							providerName: getProviderNameForRequest(config, hasImages),
						});
						return await this._handleAgentReply(openId, staff, minimalReply, minimalConfig, minimalResult, imageAttachments, pageContext);
					}
				} catch (minimalErr) {
					console.error('AI minimal retry failed:', minimalErr && minimalErr.message ? minimalErr.message : minimalErr);
					err = minimalErr;
				}
			}
			// If a separate vision model is unstable, try the text model once on
			// the same request. Do not force a hard-coded model on custom APIs.
			let fallbackModel = hasImages ? asText(config.model, 120) : '';
			if (err && (err.statusCode === 429 || err.statusCode >= 500) && fallbackModel && fallbackModel !== selectedModel) {
				try {
					body.model = fallbackModel;
					let fallbackResult = await this._postJson(selectedApiUrl, body, {
						Authorization: 'Bearer ' + selectedApiKey,
					});
					let fallbackReply = this._pickReply(fallbackResult);
					if (fallbackReply) {
						let fallbackConfig = Object.assign({}, config, {
							model: fallbackModel,
							providerName: getProviderNameForRequest(config, hasImages),
						});
						return await this._handleAgentReply(openId, staff, fallbackReply, fallbackConfig, fallbackResult, imageAttachments, pageContext);
					}
				} catch (fallbackErr) {
					console.error('AI fallback failed:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
				}
			}
			console.error('AI chat failed:', err && err.message ? err.message : err);
			this.AppError(err && err.safeMessage ? err.safeMessage : 'AI 接口调用失败，请检查后台配置');
		}
	}

	async listModels(input = {}) {
		let config = await this._getConfig();
		let target = input.target == 'vision' ? 'vision' : 'text';
		let apiUrl = asText(input.apiUrl, 400) || (target == 'vision' ? (config.visionApiUrl || config.apiUrl) : config.apiUrl) || DEFAULT_CONFIG.apiUrl;
		let apiKey = asText(input.apiKey, 400) || (target == 'vision' ? (config.visionApiKey || config.apiKey) : config.apiKey) || getEnvApiKey();
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
			visionApiUrl: config.visionApiUrl || '',
			visionModel: config.visionModel || '',
			personality: PERSONALITY_MAP[config.personality] ? config.personality : DEFAULT_CONFIG.personality,
			personalityName: (PERSONALITY_MAP[config.personality] || PERSONALITY_MAP[DEFAULT_CONFIG.personality]).name,
			personalities: Object.keys(PERSONALITY_MAP).map(key => ({ key, name: PERSONALITY_MAP[key].name })),
			systemPrompt: config.systemPrompt || DEFAULT_CONFIG.systemPrompt,
			temperature: asNumber(config.temperature, DEFAULT_CONFIG.temperature, 0, 2),
			maxTokens: Math.round(asNumber(config.maxTokens, DEFAULT_CONFIG.maxTokens, 128, 4000)),
			hasApiKey: !!config.apiKey,
			apiKeyMasked: this._maskKey(config.apiKey || ''),
			hasVisionApiKey: !!config.visionApiKey,
			visionApiKeyMasked: this._maskKey(config.visionApiKey || ''),
			contextLimit: estimateContextLimit(config.model),
			visionContextLimit: estimateContextLimit(config.visionModel || config.model),
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

		// Phase 1: Dynamic prompt layering based on query type
		let queryType = classifyQueryType(message, pageContext);
		let hasImages = attachments && attachments.length > 0;
		let needsTools = queryType === 'write' || queryType === 'query' || queryType === 'complex' || hasImages;
		let selectedSkills = agentRegistry.selectSkills(message, queryType, hasImages);
		this._agentSelectedSkills = selectedSkills;
		this._agentAllowedActions = agentRegistry.allowedActionsForSkills(selectedSkills, queryType);

		// Layer 0: Core prompt (always included, ~150 tokens)
		let corePrompt = buildCorePrompt(staff, pageContext);

		// Layer 1: Business context based on query type
		let parts = [corePrompt];
		let skillPrompt = agentRegistry.buildSkillPrompt(selectedSkills);
		if (skillPrompt) parts.push(skillPrompt);

		// Add page context for non-chat queries
		if (queryType !== 'chat') {
			parts.push('当前页面：' + JSON.stringify({ route: pageContext.route || '', orderId: pageContext.orderId || '', day: pageContext.day || '' }));
			if (pageContext.day) parts.push('Date fallback: pageContext.day可作为默认写入日期。');
		}

		// Add tool instructions for action-capable queries
		if (needsTools) {
			parts.push(agentRegistry.buildToolPrompt(selectedSkills, queryType));
			parts.push(agentRegistry.buildWriteActionPrompt(selectedSkills, queryType));
		} else if (queryType === 'explain') {
			parts.push('如果用户问小程序能做什么，按实际功能回答：档期、订单、事项、休息、小记、消息、反馈、业绩、工资、管理中心、收款、提成、审核、AI配置。');
		} else if (queryType === 'chat') {
			parts.push('你是有性格、会主动补漏的工作台agent。回答业务问题要贴合摄影工作室场景。');
		}

		// Layer 2: Staff/type data (only for write/query/image queries)
		if (needsTools) {
			try {
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
				parts.push('可用员工：' + compressStaffList(staffOptions));
				parts.push('可用拍摄类型：' + compressTypeList(typeOptions));
			} catch (dbErr) {
				console.error('AI build messages DB query failed:', dbErr && dbErr.message ? dbErr.message : dbErr);
			}
		}

		// Add image-specific instructions
		if (hasImages) {
			parts.push(buildImagePrompt());
		}

		let memoryPrompt = agentMemory.buildMemoryPrompt({
			staff,
			message,
			history,
			pageContext,
			skills: selectedSkills,
		});
		if (memoryPrompt) parts.push(memoryPrompt);

		// Add knowledge base for non-trivial queries
		if (queryType !== 'chat') {
			parts.push('功能摘要：' + LOCAL_APP_KNOWLEDGE.join('；'));
		}

		// Phase 4: Keyword-based knowledge retrieval
		if (queryType !== 'chat') {
			try {
				let knowledgeEntries = knowledgeService.retrieveKnowledge(message, 3);
				let knowledgeText = knowledgeService.formatKnowledgeForSystem(knowledgeEntries);
				if (knowledgeText) parts.push(knowledgeText);
			} catch (knowledgeErr) {
				console.error('AI knowledge retrieval failed:', knowledgeErr && knowledgeErr.message ? knowledgeErr.message : knowledgeErr);
			}
		}

		messages.unshift({ role: 'system', content: parts.join('\n') });

		if (hasImages) {
			let last = messages[messages.length - 1];
			let content = [{ type: 'text', text: last.content + '\n\n请结合截图先判断信息类型，再识别档期/订单/收款/提成/工资/审核信息；逐张检查所有图片，不确定对象或金额时先追问。' }];
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

	_localAgentResult(config, ret) {
		ret = ret || {};
		return Object.assign({
			model: config.model,
			providerName: config.providerName,
			contextLimit: estimateContextLimit(config.model),
			usage: {},
		}, ret);
	}

	async _tryHandleLocalIntent(openId, staff, message, history = [], pageContext = {}, config = {}) {
		if (this._shouldAckNoSupplement(message, history)) {
			return this._localAgentResult(config, {
				action: 'none',
				reply: '收到，不补充。本次对话不再继续调用 AI。',
			});
		}

		let intent = this._parseLocalOrderDateUpdateIntent(message, history, pageContext);
		if (!intent) return null;

		let orders = [];
		if (intent.date) {
			orders = intent.keyword
				? await this._findOrdersByDateAndKeyword(intent.date, intent.keyword)
				: await this._findOrdersByDate(intent.date);
		} else if (intent.keyword) {
			orders = await this._findOrdersByKeyword(intent.keyword);
		}
		if (intent.pickIndex) {
			if (orders.length >= intent.pickIndex) {
				orders = [orders[intent.pickIndex - 1]];
			} else {
				return this._localAgentResult(config, {
					action: 'none',
					reply: `只找到 ${orders.length} 个可选订单，没有第 ${intent.pickIndex} 条，请重新告诉我要改哪一条。`,
				});
			}
		}
		if (!orders.length) {
			let target = intent.keyword ? `「${intent.keyword}」` : intent.date;
			return this._localAgentResult(config, {
				action: 'none',
				reply: `${target} 没有找到可修改的订单档期，请确认客户名或原日期是否正确。`,
			});
		}
		if (orders.length > 1) {
			let lines = orders.slice(0, 8).map((order, idx) => {
				let name = order.ORDER_CUSTOMER_NAME || order.ORDER_CUSTOMER_SURNAME || '未填客户';
				return `${idx + 1}. ${order.ORDER_DATE || ''} ${order.ORDER_TIME || '未填时间'} ${order.ORDER_TYPE_NAME || '其他'}，客户${name}`;
			}).join('\n');
			return this._localAgentResult(config, {
				action: 'none',
				reply: `找到 ${orders.length} 个可能要修改的订单档期，请告诉我要改第几条：\n${lines}`,
			});
		}

		let order = orders[0];
		let ret = await this._agentUpdateOrder(openId, staff, { orderId: order._id, newDate: intent.newDate }, pageContext);
		ret.reply = `已把 ${order.ORDER_DATE || intent.date || '该'} 订单档期改到 ${intent.newDate}：${order.ORDER_TIME || ''} ${order.ORDER_TYPE_NAME || '其他'}，客户${order.ORDER_CUSTOMER_NAME || ''}。已同步写入全体小记审查流水。`.replace(/\s+/g, ' ').trim();
		return this._localAgentResult(config, ret);
	}

	_parseMissedImageIndex(text) {
		text = asText(text, 80).replace(/\s+/g, '');
		if (!/(\u6f0f|\u9057\u6f0f|\u8865|\u8865\u5f55|\u6ca1\u8bc6\u522b|\u5c11\u4e86|\u8fd8\u6709|\u91cd\u65b0\u8bc6\u522b|\u7ee7\u7eed\u8bc6\u522b)/.test(text)) return 0;
		let m = text.match(/\u7b2c([\u4e00\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\d]+)\u5f20/);
		if (!m) return 0;
		let raw = m[1];
		if (/^\d+$/.test(raw)) return Number(raw);
		let map = { '\u4e00': 1, '\u4e8c': 2, '\u4e24': 2, '\u4e09': 3, '\u56db': 4, '\u4e94': 5, '\u516d': 6, '\u4e03': 7, '\u516b': 8, '\u4e5d': 9, '\u5341': 10 };
		if (raw == '\u5341') return 10;
		if (raw.length == 1) return map[raw] || 0;
		if (raw.startsWith('\u5341')) return 10 + (map[raw.slice(1)] || 0);
		if (raw.endsWith('\u5341')) return (map[raw[0]] || 0) * 10;
		let complex = raw.match(/^([\u4e00\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d])\u5341([\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d])$/);
		if (complex) return (map[complex[1]] || 0) * 10 + (map[complex[2]] || 0);
		return 0;
	}

	_shouldAckNoSupplement(message, history = []) {
		let text = asText(message, 40).replace(/\s+/g, '');
		if (!/^(无补充|不用补充|不补充|没有补充|没了|不用|否)$/.test(text)) return false;
		let normalized = this._normalizeHistory(history).reverse();
		let lastAssistant = normalized.find(item => item.role == 'assistant' && item.content);
		return !!(lastAssistant && /(补充|备注|确认|还需要)/.test(asText(lastAssistant.content, 1000)));
	}

	_parseLocalOrderDateUpdateIntent(message, history = [], pageContext = {}) {
		let direct = this._parseOrderDateUpdateText(message, pageContext);
		if (direct) return direct;
		let pending = this._parsePendingOrderDateSelection(message, history, pageContext);
		if (pending) return pending;

		let text = asText(message, 800);
		if (!/(只有|就一|唯一|一个|1个)/.test(text)) return null;
		let currentDate = this._extractSingleTextDate(text) || this._extractSpecificTextDate(text);
		let normalizedHistory = this._normalizeHistory(history).filter(item => item.role == 'user').reverse();
		for (let item of normalizedHistory) {
			let intent = this._parseOrderDateUpdateText(item.content, pageContext);
			if (!intent) continue;
			if (!currentDate || currentDate == intent.date) return intent;
		}
		return null;
	}

	_parsePendingOrderDateSelection(message, history = [], pageContext = {}) {
		let text = asText(message, 40).replace(/\s+/g, '');
		let m = text.match(/^(?:第)?([1-9])(?:条|个|项|号)?$/);
		if (!m) return null;
		let pickIndex = Number(m[1]);
		let normalized = this._normalizeHistory(history).reverse();
		let sawPendingQuestion = false;
		for (let item of normalized) {
			let content = asText(item.content, 1200);
			if (!content) continue;
			if (item.role == 'assistant' && /找到\s*\d+\s*个.*订单档期/.test(content) && /(第几条|哪一条|哪一个客户|第几项)/.test(content)) {
				sawPendingQuestion = true;
				continue;
			}
			if (!sawPendingQuestion || item.role != 'user') continue;
			let intent = this._parseOrderDateUpdateText(content, pageContext);
			if (intent) return Object.assign({}, intent, { pickIndex });
		}
		return null;
	}

	_parseOrderDateUpdateText(text, pageContext = {}) {
		text = asText(text, 800);
		if (!text) return null;
		let hasBusinessWord = /(档期|订单|拍摄|日期)/.test(text);
		let hasDate = !!(this._extractSingleTextDate(text) || this._extractSpecificTextDate(text) || this._extractOrderedTextDates(text).length);
		if (!hasBusinessWord && !hasDate) return null;
		let correction = this._parseOrderDateCorrectionText(text, pageContext);
		if (correction) return correction;
		if (!/(改|修改|更改|更正|调整|调|换|移|挪)/.test(text)) return null;

		let patterns = [
			/(?:把|将)?([\s\S]{0,60}?)(?:的)?(?:档期|订单|拍摄|日期)?\s*(?:改|修改|更改|更正|调整|调|换|移|挪)(?:到|为|成|至)\s*([\s\S]{1,60})/,
			/(?:从)\s*([\s\S]{1,40}?)(?:改|修改|更改|更正|调整|调|换|移|挪)?(?:到|为|成|至)\s*([\s\S]{1,60})/,
		];
		for (let pattern of patterns) {
			let m = text.match(pattern);
			if (!m) continue;
			let sourceDate = this._extractDateFromText(m[1]) || this._contextDate(pageContext);
			let targetDate = this._extractDateFromText(m[2], sourceDate);
			if (sourceDate && targetDate && sourceDate != targetDate) {
				return { date: sourceDate, newDate: targetDate, keyword: this._extractOrderKeyword(m[1]) };
			}
		}

		let dates = this._extractOrderedTextDates(text);
		if (dates.length >= 2) return { date: dates[0], newDate: dates[1], keyword: this._extractOrderKeyword(text) };
		return null;
	}

	_parseOrderDateCorrectionText(text, pageContext = {}) {
		let m = text.match(/^([\s\S]{1,80}?)(?:的)?(?:档期|订单|拍摄|日期)?\s*(?:应该是|应为|正确是|实际是|是|为)\s*([\s\S]{1,40})$/);
		if (!m) return null;
		let targetDate = this._extractDateFromText(m[2], this._contextDate(pageContext));
		if (!targetDate) return null;
		let sourceDate = this._extractDateFromText(m[1]) || '';
		let keyword = this._extractOrderKeyword(m[1]);
		if (!sourceDate && this._isWeakOrderKeyword(keyword)) return null;
		if (!keyword && !sourceDate) return null;
		if (sourceDate && sourceDate == targetDate) return null;
		return { date: sourceDate, newDate: targetDate, keyword };
	}

	_isWeakOrderKeyword(keyword) {
		keyword = asText(keyword, 40).replace(/\s+/g, '');
		if (!keyword) return true;
		if (/^(今天|明天|后天|昨天|前天|大后天|大前天|日期|时间|上午|下午|晚上|中午)$/.test(keyword)) return true;
		return keyword.length < 2;
	}

	_extractOrderKeyword(text) {
		text = asText(text, 120);
		if (!text) return '';
		text = text.replace(/(\d{4}\s*[年./-]\s*\d{1,2}\s*[月./-]\s*\d{1,2}\s*(?:日|号)?|\d{1,2}\s*[月./-]\s*\d{1,2}\s*(?:日|号)?|\d{1,2}\s*(?:日|号))/g, ' ');
		text = text.replace(/(把|将|从|的|这个|那个|这条|那条|唯一|只有|一个|1个|第\d+条|订单|档期|拍摄|日期|客户|改|修改|更改|更正|调整|调到|调|换|移|挪|到|为|成|至|应该是|应为|正确是|实际是|是)/g, ' ');
		text = text.replace(/[：:，,。.、；;（）()[\]【】"'“”‘’\s]+/g, ' ').trim();
		if (text.length > 40) text = text.slice(0, 40).trim();
		return text;
	}

	_extractDateFromText(text, baseDate = '') {
		text = asText(text, 120);
		if (!text) return '';
		let full = this._extractSingleTextDate(text) || this._extractSpecificTextDate(text);
		if (full) return full;
		if (!baseDate) return '';
		let base = String(baseDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!base) return '';
		let m = text.replace(/\s+/g, '').match(/^(\d{1,2})(?:日|号)?$/) || text.match(/(^|[^\d])(\d{1,2})\s*(?:日|号)(?![张条位个名组批次套件])/);
		let day = m ? Number(m[m.length - 1]) : 0;
		if (!day || day < 1 || day > 31) return '';
		return this._cleanDate(`${base[1]}-${base[2]}-${day}`, false);
	}

	_extractOrderedTextDates(text) {
		text = asText(text, 800);
		let list = [];
		let pushDate = raw => {
			let day = this._extractDateFromText(raw);
			if (day && !list.includes(day)) list.push(day);
		};
		let re = /(\d{4}\s*[年./-]\s*\d{1,2}\s*[月./-]\s*\d{1,2}\s*(?:日|号)?|\d{1,2}\s*[月./-]\s*\d{1,2}\s*(?:日|号)?)/g;
		let m;
		while ((m = re.exec(text))) pushDate(m[1]);
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

	_minimalChatBody(body = {}) {
		return {
			model: body.model,
			messages: body.messages,
			stream: false,
		};
	}

	_shouldRetryWithMinimalBody(err, body = {}) {
		if (!err || !body.model || !body.messages) return false;
		let msg = String(err.safeMessage || err.message || '').toLowerCase();
		return err.statusCode == 400
			|| err.statusCode == 422
			|| msg.indexOf('param') >= 0
			|| msg.indexOf('参数') >= 0;
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
		if (start < 0) return null;
		let depth = 0, end = -1, inStr = false;
		for (let i = start; i < text.length; i++) {
			if (inStr) {
				if (text[i] === '\\') { i++; continue; }
				if (text[i] === '"') inStr = false;
				continue;
			}
			if (text[i] === '"') { inStr = true; continue; }
			if (text[i] === '{') depth++;
			else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
		}
		if (end < 0) return null;
		try {
			let obj = JSON.parse(text.substring(start, end + 1));
			if (obj && typeof obj == 'object' && !Array.isArray(obj)) return obj;
		} catch (err) {}
		return null;
	}

	async _handleAgentReply(openId, staff, reply, config, llmResult, attachments = [], pageContext = {}) {
		let action = this._pickJsonObject(reply);
		let validActions = agentRegistry.normalizeActionList(this._agentAllowedActions || []);
		if (!validActions.length) validActions = agentRegistry.ALL_ACTIONS.slice();
		if (validActions.includes('add_note') && !validActions.includes('create_note')) validActions.push('create_note');
		if (!validActions.includes('none')) validActions.push('none');
		let actionNotAllowed = action && action.action && action.action != 'none' && !validActions.includes(action.action);
		if (!action || !action.action || action.action == 'none' || actionNotAllowed) {
			let replyText = action && action.reply ? asText(action.reply, 4000) : reply;
			// Guard: detect model hallucination — reply claims success but action is none
			if (action && replyText && /已(修改|改|更新|删除|取消|新增|创建|帮你|处理|完成|执行|设置|安排|录入|记录|搞定)/.test(replyText)) {
				replyText = actionNotAllowed
					? 'AI 识别到了一个当前场景不允许直接执行的动作，没有实际写入。请换成更明确的业务指令，或先进入对应订单/财务页面后再试。'
					: 'AI 没有实际执行这个操作，请用更明确的指令重试，例如："把客户XXX的9.16档期改成9.11"。如果还是不行，请手动在订单里修改。';
			}
			return {
				reply: replyText,
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
		else if (action.action == 'create_orders') ret = { reply: 'AI返回了批量新增动作但没有包含订单列表，请重新描述或上传截图。' };
		else if (action.action == 'create_order' && batchOrders.length) ret = await this._agentCreateOrders(openId, staff, batchPayload, attachments, pageContext);
		else if (action.action == 'create_order') ret = await this._agentCreateOrder(openId, staff, action.data || {}, attachments, pageContext);
		else if (action.action == 'join_order') ret = await this._agentJoinOrder(openId, staff, action.data || {}, pageContext);
		else if (action.action == 'cancel_order') ret = await this._agentCancelOrder(openId, staff, action.data || {});
		else if (action.action == 'update_order') ret = await this._agentUpdateOrder(openId, staff, action.data || {}, pageContext);
		else if (action.action == 'create_item') ret = await this._agentCreateItem(openId, staff, action.data || {});
		else if (action.action == 'create_rest') ret = await this._agentCreateRest(openId, staff, action.data || {});
		else if (action.action == 'add_note') ret = await this._agentAddNote(openId, staff, action.data || {});
		else if (action.action == 'query_payments') ret = await this._agentQueryPayments(openId, staff, action.data || {});
		else if (action.action == 'save_payment') ret = await this._agentSavePayment(openId, staff, action.data || {});
		else if (action.action == 'void_payment') ret = await this._agentVoidPayment(openId, staff, action.data || {});
		else if (action.action == 'query_commissions') ret = await this._agentQueryCommissions(openId, staff, action.data || {});
		else if (action.action == 'query_payroll') ret = await this._agentQueryPayroll(staff, action.data || {});
		else if (action.action == 'pay_payroll') ret = await this._agentPayPayroll(openId, staff, action.data || {});
		else if (action.action == 'audit_order') ret = await this._agentAuditOrder(openId, staff, action.data || {});
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
		// Strip all whitespace so regexes match dates the AI outputs with
		// spaces (e.g. "2026年 6月 20日" or "6 月 20 日").
		text = text.replace(/[\s　]+/g, '');
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

		let monthDay = /(^|[^\d.])(\d{1,2})[月./-](\d{1,2})(?:日|号)?(?!\d{4}(?![:：]))(?![张条位个名组批次套件])/g;
		let year = Number(timeUtil.time('Y'));
		let nowTs = Date.now();
		let nowMonth = new Date().getMonth() + 1;
		while ((m = monthDay.exec(text))) {
			let month = Number(m[2]), dayNum = Number(m[3]);
			if (month < 1 || month > 12 || dayNum < 1 || dayNum > 31) continue;
			let candidate = new Date(year, month - 1, dayNum);
			if (candidate.getFullYear() != year || candidate.getMonth() + 1 != month || candidate.getDate() != dayNum) continue;
			let useYear = year;
		if (candidate.getTime() < nowTs - 30 * 86400000) useYear = year + 1;
		else if (candidate.getTime() > nowTs + 183 * 86400000) {
			let prev = new Date(year - 1, month - 1, dayNum);
			if (prev.getTime() >= nowTs - 45 * 86400000) useYear = year - 1;
		}
		// Cross-year boundary: Dec→Jan or Jan→Dec within ~60 days
		// Only apply when the day-range heuristics above did NOT already adjust the year.
		else if (Math.abs(nowMonth - month) >= 11) {
			let diff = candidate.getTime() - nowTs;
			if (diff > 0 && diff <= 60 * 86400000 && month < nowMonth) useYear = year + 1;
			else if (diff < 0 && -diff <= 60 * 86400000 && month > nowMonth) useYear = year - 1;
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
		// Fallback: only match clear scheduling ACTION verbs, not nouns that appear in casual queries
		// (e.g. "昨天的订单怎么样了" contains "订单" but is a query, not a scheduling action)
		return /(记录|新增|登记|安排|录入|创建|添加|请假|休息)/.test(text);
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
				else if (d.getTime() > Date.now() + 183 * 86400000) {
					let prev = new Date(year - 1, month - 1, day);
					if (prev.getTime() >= Date.now() - 45 * 86400000) year -= 1;
				}
				return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			}
		}
		return '';
	}

	_warnImageDateMismatch(resolvedDate, attachments) {
		if (!attachments || !attachments.length) return;
		let userMsg = this._agentUserMessage || '';
		let hasRelativeKeyword = /[今天明天后天昨天前天大前天大后天]/.test(userMsg);
		if (!hasRelativeKeyword) return;
		// User message contains relative date keyword + image attachments.
		// Check if user message also contains a specific date (e.g. "6月20日") that differs.
		let specificInMsg = this._extractSingleTextDate(userMsg) || this._extractSpecificTextDate(userMsg);
		if (specificInMsg && specificInMsg !== resolvedDate) {
			console.warn('AI date mismatch: user text has specific date', specificInMsg, 'but resolved to', resolvedDate, 'with', attachments.length, 'image(s)');
		}
	}

	_cleanActionDate(date, required = true, options = {}) {
		date = asText(date, 30);
		// Only use user-message hint when AI didn't provide a usable explicit date.
		// This prevents user keywords like "明天" from overriding a screenshot date
		// that the AI correctly extracted (e.g. "2026-06-25").
		if (options.allowUserDateHint !== false && (!date || this._isDatePlaceholder(date))) {
			let hint = this._extractRelativeTextDate(this._agentUserMessage || '');
			if (hint) return hint;
		}
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
			let url;
			try {
				url = fileID.startsWith('http://') || fileID.startsWith('https://') ? fileID : await cloudUtil.getTempFileURLOne(fileID);
			} catch (fileErr) {
				console.error('AI image attachment resolve failed:', fileID, fileErr && fileErr.message ? fileErr.message : fileErr);
				continue;
			}
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
			.replace(/([日号])\s*[\d一-龥][\s\S]*$/, '$1')
			.replace(/(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2})\s*[上下]午.*$/, '$1')
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
				let nowMonth = new Date().getMonth() + 1;
				if (candidate.getTime() < Date.now() - 30 * 86400000) year += 1;
				else if (candidate.getTime() > Date.now() + 183 * 86400000) {
					let prev = new Date(year - 1, month - 1, dayNum);
					if (prev.getTime() >= Date.now() - 45 * 86400000) year -= 1;
				}
				// Cross-year boundary: Dec→Jan or Jan→Dec within ~60 days
				// Only apply when the day-range heuristics above did NOT already adjust the year.
				else if (Math.abs(nowMonth - month) >= 11) {
					let diff = candidate.getTime() - Date.now();
					if (diff > 0 && diff <= 60 * 86400000 && month < nowMonth) year += 1;
					else if (diff < 0 && -diff <= 60 * 86400000 && month > nowMonth) year -= 1;
				}
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
			if (hour > 23) return '';
			if (hour === 12 && (period == '凌晨' || period == '晚上')) hour = 0;
			else if ((period == '下午' || period == '晚上' || period == '中午') && hour < 12) hour += 12;
			if (hour > 23) return '';
			let minute = '00';
			if (m[3]) {
				if (m[3] === '半') { minute = '30'; }
				else {
					let minNum = Number(m[3].replace('分', ''));
					if (minNum > 59) return '';
					minute = String(minNum).padStart(2, '0');
				}
			}
			return String(hour).padStart(2, '0') + ':' + minute;
		}
		return '';
	}

	_amount(value) {
		if (value === undefined || value === null || String(value).trim() === '') return 0;
		if (typeof value === 'number') {
			if (!Number.isFinite(value) || value < 0) return 0;
			return Math.round(value * 100) / 100;
		}
		let s = String(value).replace(/,/g, '').replace(/[¥￥元\s]/g, '');
		let num = Number(s);
		if (!Number.isFinite(num)) {
			let m = s.match(/(\d+(?:\.\d+)?)/);
			num = m ? Number(m[1]) : NaN;
		}
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
			'\u9996\u6b3e': 'deposit',
			'\u9884\u4ed8': 'deposit',
			'\u9884\u4ed8\u6b3e': 'deposit',
			'\u6536\u6b3e': 'deposit',
			'\u5b9e\u6536': 'deposit',
			'\u5df2\u6536': 'deposit',
			'\u5df2\u6536\u6b3e': 'deposit',
			'\u5230\u8d26': 'deposit',
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
		let noteId = '';
		try {
			let work = new WorkService();
			let ret = await work.saveNote(openId, {
				NOTE_TYPE: 'team',
				NOTE_TITLE: title,
				NOTE_CONTENT: content,
				NOTE_DATE: timeUtil.time('Y-M-D'),
			});
			noteId = ret && ret.id ? ret.id : '';
		} catch (err) {
			console.error('AI audit note failed:', err && err.message ? err.message : err);
		}
		await this._addAgentAuditLog(openId, title, content, {
			refType: noteId ? 'work_note' : '',
			refId: noteId,
		});
		return noteId;
	}

	async _addAgentAuditLog(openId, title, content, meta = {}) {
		try {
			let staff = await WorkStaffModel.getOne({ STAFF_OPENID: openId }, '_id,STAFF_NAME');
			let action = this._inferAgentAuditAction(title);
			await WorkAgentAuditModel.insert({
				AGENTAUDIT_ACTION: action,
				AGENTAUDIT_TITLE: asText(title, 120) || 'AI操作记录',
				AGENTAUDIT_CONTENT: asText(content, 2000),
				AGENTAUDIT_OPENID: asText(openId, 120),
				AGENTAUDIT_STAFF_ID: staff && staff._id ? staff._id : '',
				AGENTAUDIT_STAFF_NAME: staff && staff.STAFF_NAME ? staff.STAFF_NAME : '',
				AGENTAUDIT_REF_TYPE: asText(meta.refType, 40),
				AGENTAUDIT_REF_ID: asText(meta.refId, 120),
				AGENTAUDIT_RISK_LEVEL: this._inferAgentAuditRisk(title, content),
				AGENTAUDIT_STATUS: 1,
			});
		} catch (err) {
			console.error('AI agent audit log failed:', err && err.message ? err.message : err);
		}
	}

	_inferAgentAuditAction(title) {
		title = asText(title, 120);
		if (/新增订单|订单档期/.test(title)) return 'create_order';
		if (/取消订单/.test(title)) return 'cancel_order';
		if (/修改订单/.test(title)) return 'update_order';
		if (/录入收款/.test(title)) return 'save_payment';
		if (/作废收款/.test(title)) return 'void_payment';
		if (/发放工资/.test(title)) return 'pay_payroll';
		if (/审核订单/.test(title)) return 'audit_order';
		if (/新增事项/.test(title)) return 'create_item';
		if (/新增休息/.test(title)) return 'create_rest';
		if (/新增小记/.test(title)) return 'add_note';
		return 'agent_action';
	}

	_inferAgentAuditRisk(title, content) {
		let text = asText(title + ' ' + content, 500);
		if (/发放工资|作废收款|审核订单|取消订单|退款|冲减|不通过/.test(text)) return 'high';
		if (/收款|提成|工资|金额|付款|转账|红包/.test(text)) return 'finance';
		return 'normal';
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
		this._warnImageDateMismatch(date, attachments);
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
		try {
			let saved = await WorkOrderModel.getOne(ret.id);
			if (!saved || saved.ORDER_DATE != order.ORDER_DATE || saved.ORDER_CUSTOMER_NAME != order.ORDER_CUSTOMER_NAME) {
				console.error('AI order post-save verification mismatch:', ret.id);
			}
		} catch (verifyErr) {
			console.error('AI order post-save verify failed:', verifyErr && verifyErr.message ? verifyErr.message : verifyErr);
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

	async _agentCancelOrder(openId, staff, data = {}) {
		let orderId = asText(data.orderId || data.id || data.ORDER_ID || '', 120);
		let customerName = asText(data.customerName || data.ORDER_CUSTOMER_NAME || '', 80);
		let date = this._cleanActionDate(data.date || data.ORDER_DATE, false);
		let reason = asText(data.reason || '', 200) || 'AI助手取消';

		if (!orderId && customerName && date) {
			let found = await this._findOrderByCustomerAndDate(customerName, date);
			if (found) orderId = found._id;
		}
		if (!orderId) this.AppError('没有找到要取消的订单，请提供订单ID、或客户名称+日期。');

		let work = new WorkService();
		let existing = await WorkOrderModel.getOne(orderId);
		if (!existing) this.AppError('订单不存在或已取消');

		await work.cancelOrder(openId, orderId, reason);
		let line = `${existing.ORDER_DATE || ''} ${existing.ORDER_TIME || ''} ${existing.ORDER_TYPE_NAME || '其他'}，客户${existing.ORDER_CUSTOMER_NAME || ''}`.replace(/\s+/g, ' ').trim();
		let summary = `${staff.STAFF_NAME || '员工'}通过AI取消订单：${line}。原因：${reason}。记录ID：${orderId}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI操作记录：取消订单', summary);
		return {
			action: 'cancel_order',
			id: orderId,
			data: { orderId, reason },
			auditNoteId,
			reply: `已取消订单档期：${line}。原因：${reason}。`,
		};
	}

	async _agentUpdateOrder(openId, staff, data = {}, pageContext = {}) {
		let orderId = asText(data.orderId || data.id || data.ORDER_ID || '', 120);
		let customerName = asText(data.customerName || data.ORDER_CUSTOMER_NAME || '', 80);
		let date = this._cleanActionDate(data.date || data.ORDER_DATE, false);

		if (!orderId && customerName && date) {
			let found = await this._findOrderByCustomerAndDate(customerName, date);
			if (found) orderId = found._id;
		}
		if (!orderId) this.AppError('没有找到要修改的订单，请提供订单ID、或客户名称+日期。');

		let work = new WorkService();
		let existing = await WorkOrderModel.getOne(orderId);
		if (!existing) this.AppError('订单不存在');

		let newDate = this._cleanActionDate(data.newDate || data.updateDate, false);
		let updates = {};
		if (newDate) updates.ORDER_DATE = newDate;
		let newTime = asText(data.newTime || data.updateTime, 30);
		if (newTime) updates.ORDER_TIME = this._cleanTime(newTime);
		let newType = await this._resolveType(data.newType || data.updateType || {});
		if (newType && newType.id) {
			updates.ORDER_TYPE_ID = newType.id;
			updates.ORDER_TYPE_NAME = newType.name;
			updates.ORDER_TYPE_COLOR = newType.color;
		}
		let newCustomer = asText(data.newCustomerName || data.updateCustomerName, 80);
		if (newCustomer) updates.ORDER_CUSTOMER_NAME = newCustomer;
		let newPlace = asText(data.newPlace || data.updatePlace, 120);
		if (newPlace) updates.ORDER_PLACE = newPlace;
		let newAmount = data.newAmount || data.updateAmount;
		if (newAmount !== undefined) updates.ORDER_AMOUNT = this._amount(newAmount);
		let newContent = asText(data.newContent || data.updateContent, 800);
		if (newContent) updates.ORDER_CONTENT = newContent;

		if (!Object.keys(updates).length) this.AppError('请提供要修改的字段（日期、时间、类型、客户、地点、金额、备注）。');

		let merged = Object.assign({}, existing, updates);
		let saved = await work.saveOrder(openId, merged);
		let changed = Object.keys(updates).map(k => `${k}→${updates[k]}`).join('，');
		let line = `${merged.ORDER_DATE || ''} ${merged.ORDER_TIME || ''} ${merged.ORDER_TYPE_NAME || '其他'}，客户${merged.ORDER_CUSTOMER_NAME || ''}`.replace(/\s+/g, ' ').trim();
		let summary = `${staff.STAFF_NAME || '员工'}通过AI修改订单（ID：${orderId}）：${changed}。修改后：${line}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI操作记录：修改订单', summary);
		return {
			action: 'update_order',
			id: orderId,
			data: { orderId, updates, order: merged },
			auditNoteId,
			reply: `已修改订单档期：${line}。修改内容：${changed}。`,
		};
	}

	_assertAgentAdmin(staff, actionName = '该操作') {
		if (!this.isAdminStaff(staff)) this.AppError(`${actionName}需要管理员权限，请切换管理员账号或让管理员处理。`);
	}

	_adminLikeFromStaff(staff = {}) {
		return {
			_id: staff._id || '',
			ADMIN_ID: staff.STAFF_ID || staff._id || '',
			ADMIN_NAME: staff.STAFF_NAME || '',
			STAFF_NAME: staff.STAFF_NAME || '',
			ADMIN_DESC: '小程序管理员',
			ADMIN_PHONE: staff.STAFF_MOBILE || '',
			ADMIN_TYPE: 1,
			ADMIN_STATUS: 1,
		};
	}

	_currentMonth() {
		return timeUtil.time('Y-M-D').slice(0, 7);
	}

	_centText(value) {
		value = Number(value || 0);
		if (!Number.isFinite(value)) value = 0;
		return '¥' + (value / 100).toFixed(2);
	}

	_boolInput(value, fieldName = '结果') {
		if (value === true || value === 1 || value === '1') return true;
		if (value === false || value === 0 || value === '0') return false;
		let text = asText(value, 20);
		if (/^(true|yes|pass|通过|同意|批准|审核通过)$/i.test(text)) return true;
		if (/^(false|no|fail|驳回|拒绝|不通过|审核不通过)$/i.test(text)) return false;
		this.AppError(`请明确${fieldName}是通过还是不通过`);
	}

	async _resolveStaffForAgent(staff, data = {}, allowSelf = true) {
		let staffId = asText(data.staffId || data.STAFF_ID || data.id || '', 120);
		let staffName = asText(data.staffName || data.name || data.STAFF_NAME || '', 80);
		if (!staffId && !staffName && allowSelf) return staff;
		if (!this.isAdminStaff(staff)) {
			if (staffId && staffId != staff._id && staffId != staff.STAFF_ID) this.AppError('普通员工只能查询自己的数据');
			if (staffName && staffName != staff.STAFF_NAME) this.AppError('普通员工只能查询自己的数据');
			return staff;
		}
		let target = null;
		if (staffId) {
			target = await WorkStaffModel.getOne(staffId);
			if (!target) target = await WorkStaffModel.getOne({ STAFF_ID: staffId });
		}
		if (!target && staffName) {
			let list = await WorkStaffModel.getAll({ STAFF_STATUS: WorkStaffModel.STATUS.COMM }, '*', { STAFF_ADD_TIME: 'asc' }, 1000);
			target = (list || []).find(item => item.STAFF_NAME == staffName)
				|| (list || []).find(item => item.STAFF_NAME && (staffName.includes(item.STAFF_NAME) || item.STAFF_NAME.includes(staffName)));
		}
		if (!target) this.AppError('没有找到指定员工，请提供准确员工姓名或员工ID');
		return target;
	}

	async _agentQueryPayments(openId, staff, data = {}) {
		let params = Object.assign({}, data || {});
		params.month = asText(params.month || params.PAYMENT_MONTH || this._currentMonth(), 20);
		params.size = Number(params.size || 8);
		if (!Number.isFinite(params.size) || params.size < 1) params.size = 8;
		params.size = Math.min(params.size, 20);
		let ret;
		if (this.isAdminStaff(staff)) {
			let service = new WorkPaymentService();
			ret = await service.listPayments(params, staff);
		} else {
			if (params.staffId && params.staffId != staff._id && params.staffId != staff.STAFF_ID) this.AppError('普通员工只能查询自己的收款记录');
			if (params.staffName && params.staffName != staff.STAFF_NAME) this.AppError('普通员工只能查询自己的收款记录');
			delete params.staffId;
			delete params.staffName;
			let service = new WorkPerformanceService();
			ret = await service.getMyPaymentList(openId, params);
		}
		let list = (ret && ret.list) || [];
		let lines = list.slice(0, params.size).map((item, idx) => {
			return `${idx + 1}. ${item.PAYMENT_DATE || ''} ${item.PAYMENT_CUSTOMER_NAME || item.PAYMENT_CUSTOMER_SURNAME || ''} ${item.PAYMENT_TYPE || ''} ${item.PAYMENT_DIRECTION || ''} ${this._centText(item.PAYMENT_AMOUNT_CENT)}`;
		});
		return {
			action: 'query_payments',
			data: { params, count: list.length, list },
			reply: lines.length ? `收款记录如下：\n${lines.join('\n')}` : '没有查到符合条件的收款记录。',
		};
	}

	async _agentSavePayment(openId, staff, data = {}) {
		this._assertAgentAdmin(staff, '录入收款/退款/冲减');
		let orderId = asText(data.orderId || data.ORDER_ID || data.PAYMENT_ORDER_ID || '', 120);
		if (!orderId) this.AppError('录入收款缺少订单ID或订单号');
		let amount = data.amount || data.PAYMENT_AMOUNT || data.paymentAmount;
		if (amount === undefined || amount === null || String(amount).trim() === '') this.AppError('录入收款缺少金额');
		let type = asText(data.type || data.PAYMENT_TYPE || 'deposit', 40);
		let note = asText(data.note || data.remark || data.PAYMENT_NOTE || '', 200);
		if (/(refund|adjust|退款|冲减|调整)/i.test(type) && !note) this.AppError('退款/冲减必须填写原因或备注');

		let payment = {
			PAYMENT_TYPE: type,
			PAYMENT_AMOUNT: amount,
			PAYMENT_DATE: this._cleanActionDate(data.date || data.PAYMENT_DATE || data.payDate, false),
			PAYMENT_BASE_TYPE: asText(data.baseType || data.PAYMENT_BASE_TYPE || '', 40),
			PAYMENT_NOTE: note,
			PAYMENT_REF_PAYMENT_ID: asText(data.refPaymentId || data.PAYMENT_REF_PAYMENT_ID || '', 120),
		};
		let service = new WorkService();
		let ret = await service.saveAdminOrderPayment(orderId, payment, staff);
		let saved = ret.payment || (ret.payments && ret.payments[0]) || {};
		let auditNoteId = await this._addAuditNote(openId, 'AI操作记录：录入收款', `${staff.STAFF_NAME || '管理员'}通过AI录入收款/退款/冲减：订单${orderId}，类型${saved.PAYMENT_TYPE || type}，金额${saved.PAYMENT_AMOUNT || amount}，日期${saved.PAYMENT_DATE || payment.PAYMENT_DATE}。备注：${note || '无'}`);
		return {
			action: 'save_payment',
			id: saved._id || saved.PAYMENT_ID || '',
			data: ret,
			auditNoteId,
			reply: `已按管理员权限录入收款：订单${orderId}，类型${saved.PAYMENT_TYPE || type}，金额${saved.PAYMENT_AMOUNT || amount}。`,
		};
	}

	async _agentVoidPayment(openId, staff, data = {}) {
		this._assertAgentAdmin(staff, '作废收款');
		let paymentId = asText(data.paymentId || data.id || data.PAYMENT_ID || '', 120);
		let reason = asText(data.reason || data.note || '', 200);
		if (!paymentId) this.AppError('作废收款缺少收款ID');
		if (!reason) this.AppError('作废收款必须填写原因');
		let service = new WorkService();
		let ret = await service.voidAdminOrderPayment(paymentId, reason, staff);
		let auditNoteId = await this._addAuditNote(openId, 'AI操作记录：作废收款', `${staff.STAFF_NAME || '管理员'}通过AI作废收款：${paymentId}。原因：${reason}`);
		return {
			action: 'void_payment',
			id: paymentId,
			data: ret,
			auditNoteId,
			reply: `已按管理员权限作废收款：${paymentId}。原因：${reason}`,
		};
	}

	async _agentQueryCommissions(openId, staff, data = {}) {
		let params = Object.assign({}, data || {});
		if (this.isAdminStaff(staff) && !params.staffId && params.staffName) {
			let target = await this._resolveStaffForAgent(staff, { staffName: params.staffName }, false);
			params.staffId = target._id;
		}
		params.month = asText(params.month || this._currentMonth(), 20);
		params.size = Math.min(Number(params.size || 8) || 8, 20);
		let ret;
		if (this.isAdminStaff(staff)) {
			let service = new WorkCommissionService();
			ret = await service.listCommissions(params, staff);
		} else {
			if (params.staffId && params.staffId != staff._id && params.staffId != staff.STAFF_ID) this.AppError('普通员工只能查询自己的提成');
			if (params.staffName && params.staffName != staff.STAFF_NAME) this.AppError('普通员工只能查询自己的提成');
			delete params.staffId;
			delete params.staffName;
			let service = new WorkPerformanceService();
			ret = await service.getMyCommissionList(openId, params);
		}
		let list = (ret && ret.list) || [];
		let lines = list.slice(0, params.size).map((item, idx) => {
			return `${idx + 1}. ${item.COMMISSION_MONTH || ''} ${item.COMMISSION_STAFF_NAME || ''} ${item.COMMISSION_KIND || ''} ${this._centText(item.COMMISSION_AMOUNT_CENT)}`;
		});
		return {
			action: 'query_commissions',
			data: { params, count: list.length, list },
			reply: lines.length ? `提成记录如下：\n${lines.join('\n')}` : '没有查到符合条件的提成记录。',
		};
	}

	async _agentQueryPayroll(staff, data = {}) {
		let target = await this._resolveStaffForAgent(staff, data, true);
		let month = asText(data.month || this._currentMonth(), 20);
		let service = new WorkPayrollService();
		let ret = await service.getPayrollForStaff(target._id, month);
		let paid = ret.payrollList || ret.paidPayrolls || [];
		let reply = `${ret.staffName || target.STAFF_NAME || '员工'} ${ret.month || month} 工资预览：待发${this._centText(ret.totalCent)}，当前提成${this._centText(ret.currentCent)}，释放${this._centText(ret.releaseCent)}，调整${this._centText(ret.adjustCent)}，扣回${this._centText(ret.deductCent)}，已发工资单${paid.length}条。`;
		if (ret.legacyNeeded) reply = `${target.STAFF_NAME || '员工'} ${month} 属于旧工资入口月份，需要到旧入口查看/发放。`;
		return {
			action: 'query_payroll',
			data: ret,
			reply,
		};
	}

	async _agentPayPayroll(openId, staff, data = {}) {
		this._assertAgentAdmin(staff, '发放工资');
		let month = asText(data.month || '', 20);
		if (!month) this.AppError('发工资必须提供月份');
		if (!data.staffId && !data.STAFF_ID && !data.id && !data.staffName && !data.name && !data.STAFF_NAME) this.AppError('发工资必须提供员工姓名或员工ID');
		let target = await this._resolveStaffForAgent(staff, data, false);
		let service = new WorkPayrollService();
		let preview = await service.previewStaffMonth(target._id, month);
		if (preview.legacyNeeded) this.AppError('切换月前工资需走旧发放入口');
		let operator = {
			_id: staff._id,
			STAFF_ID: staff.STAFF_ID || staff._id,
			STAFF_NAME: staff.STAFF_NAME || '',
			source: 'ai_agent',
		};
		let ret = await service.payStaffMonth(target._id, month, preview.previewHash || '', operator, { note: asText(data.note || '', 200) });
		let auditNoteId = await this._addAuditNote(openId, 'AI操作记录：发放工资', `${staff.STAFF_NAME || '管理员'}通过AI发放工资：${target.STAFF_NAME || target._id}，月份${month}，金额${this._centText(preview.totalCent)}。`);
		return {
			action: 'pay_payroll',
			id: ret && (ret.payrollId || ret.id || ''),
			data: ret,
			auditNoteId,
			reply: `已按管理员权限发放工资：${target.STAFF_NAME || ''} ${month}，金额${this._centText(preview.totalCent)}。`,
		};
	}

	async _agentAuditOrder(openId, staff, data = {}) {
		this._assertAgentAdmin(staff, '审核订单');
		let orderId = asText(data.orderId || data.id || data.ORDER_ID || '', 120);
		if (!orderId) this.AppError('审核订单缺少订单ID');
		let pass = this._boolInput(data.pass !== undefined ? data.pass : data.result, '审核结果');
		let reason = asText(data.reason || data.note || '', 200);
		let service = new AdminWorkService();
		let ret = await service.auditOrder(this._adminLikeFromStaff(staff), orderId, pass, reason, data.participants || null, Number(data.orderEditTime || 0));
		let auditNoteId = await this._addAuditNote(openId, 'AI操作记录：审核订单', `${staff.STAFF_NAME || '管理员'}通过AI审核订单：${orderId}，结果：${pass ? '通过' : '不通过'}。说明：${reason || '无'}`);
		return {
			action: 'audit_order',
			id: orderId,
			data: ret,
			auditNoteId,
			reply: `已按管理员权限审核订单：${pass ? '通过' : '不通过'}。${reason ? '说明：' + reason : ''}`,
		};
	}

	async _findOrdersByDate(date) {
		if (!date) return [];
		return await WorkOrderModel.getAll({
			ORDER_DATE: date,
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
		}, '_id,ORDER_DATE,ORDER_TIME,ORDER_TYPE_NAME,ORDER_CUSTOMER_NAME,ORDER_CUSTOMER_SURNAME', { ORDER_TIME: 'asc', ORDER_ADD_TIME: 'desc' }, 50);
	}

	_orderMatchesKeyword(order = {}, keyword = '') {
		keyword = asText(keyword, 80).replace(/\s+/g, '').toLowerCase();
		if (!keyword) return true;
		let fields = [
			order.ORDER_CUSTOMER_NAME,
			order.ORDER_CUSTOMER_SURNAME,
			order.ORDER_TYPE_NAME,
			order.ORDER_PLACE,
			order.ORDER_CONTENT,
		];
		return fields.some(value => {
			let text = String(value || '').replace(/\s+/g, '').toLowerCase();
			return text && (text.includes(keyword) || keyword.includes(text));
		});
	}

	async _findOrdersByDateAndKeyword(date, keyword) {
		let list = await this._findOrdersByDate(date);
		return list.filter(order => this._orderMatchesKeyword(order, keyword));
	}

	async _findOrdersByKeyword(keyword) {
		keyword = asText(keyword, 80);
		if (!keyword) return [];
		let list = await WorkOrderModel.getAll({
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
		}, '_id,ORDER_DATE,ORDER_TIME,ORDER_TYPE_NAME,ORDER_CUSTOMER_NAME,ORDER_CUSTOMER_SURNAME,ORDER_PLACE,ORDER_CONTENT', { ORDER_DATE: 'desc', ORDER_ADD_TIME: 'desc' }, 300);
		return (list || []).filter(order => this._orderMatchesKeyword(order, keyword));
	}

	async _findOrderByCustomerAndDate(customerName, date) {
		if (!customerName || !date) return null;
		let list = await WorkOrderModel.getAll({
			ORDER_DATE: date,
			ORDER_STATUS: WorkOrderModel.STATUS.COMM,
		}, '_id,ORDER_DATE,ORDER_TIME,ORDER_TYPE_NAME,ORDER_CUSTOMER_NAME,ORDER_CUSTOMER_SURNAME', { ORDER_ADD_TIME: 'desc' }, 50);
		let normalizedName = customerName.replace(/\s+/g, '').toLowerCase();
		for (let item of list) {
			let itemName = String(item.ORDER_CUSTOMER_NAME || '').replace(/\s+/g, '').toLowerCase();
			if (itemName === normalizedName || itemName.includes(normalizedName) || normalizedName.includes(itemName)) return item;
		}
		return null;
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
		if (statusCode >= 500) return 'AI 服务或当前模型暂时不可用，请稍后重试；如果连续出现，请在AI配置里换一个可用模型。';
		if (/param|parameter|参数/i.test(msg)) return 'AI 接口参数不兼容，请确认 Base URL 是 OpenAI 兼容的 /v1 地址、模型 ID 填写正确；如果是纯文本模型，图片识别模型请单独填写支持读图的模型。';
		return msg ? ('AI 接口返回错误：' + msg.slice(0, 120)) : 'AI 接口返回错误，请检查后台配置';
	}
}

module.exports = WorkAiService;
