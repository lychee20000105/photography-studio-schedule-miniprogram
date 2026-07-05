/**
 * Notes: ������Ӱ AI С���ַ���
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
const WorkAgentConfirmService = require('./work_agent_confirm_service.js');

const SETUP_KEY = 'WORK_AI_CHAT_CONFIG';
const PROVIDERS_STORE_KEY = 'WORK_AI_PROVIDERS_CONFIG';
const LEGACY_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const DEFAULT_CONFIG = {
	enabled: true,
	providerName: 'Agnes',
	apiUrl: 'https://api.agnes-ai.com/v1',
	model: 'agnes-2.0-flash',
	visionApiUrl: 'https://api.agnes-ai.com/v1',
	visionModel: 'agnes-2.0-flash',
	visionApiKey: '',
	apiKey: '',
	personality: 'ops_cat',
	memoryEnabled: false,
	memoryText: '',
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
	'����Ŀ��λ����Ӱ�����ҿɶ��ο����ĵ��ڡ�������Ա��ҵ������빤�ʽ���С����������Ӱ�ǰ������ú���ʵҵ��������',
	'���Ĺ���̨ģ�飺����������ÿ�����顢��������/�༭/ȡ��������ڡ�С�ǡ���Ϣ���롢��Ϣ�����ⷴ�����ҵ�ҵ�����ҵĹ��ʡ�',
	'��������ģ�飺ҵ�����塢�����������տ��¼����ɼ�¼��������ɡ�Ա������������Ԥ��/���š�������ˡ�AI���á�������顣',
	'����ṹ�����տ��˱���ʵ���տ��·�ͳ��ҵ��������˱�֧�ֶ���/�ͷ�/�ۻأ����ʵ����ܲ��е��ײ���ɲ�֡�',
	'AIȨ�ޱ߽磺Сè�������浱ǰ��¼Ա���˺ţ���ͨԱ��������Ȩ�޲���������Ա��ִ�й������տ�˿�/����������տ��ѯ���/���ʡ����Ź��ʡ�������˵ȶ���������д�����ɺ�̨����������Ȩ�޺�����У�顣',
	'AIд����򣺷���AIִ��д�붯������Ҫ���Ŷ�С���Զ�׷��һ��ȫ��ɼ��Ĳ��������ˮ��',
];

const AGENT_CONFIRM_ACTIONS = {
	cancel_order: true,
	save_payment: true,
	void_payment: true,
	pay_payroll: true,
	audit_order: true,
};

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
	let apiUrl = getApiUrlForRequest(config, hasImages);
	let model = hasImages
		? (asText(config.visionModel, 120) || asText(config.model, 120) || DEFAULT_CONFIG.model)
		: getModelForTask(queryType, config.model);
	return normalizeModelForApi(model, apiUrl, getProviderNameForRequest(config, hasImages));
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
	if (hasImages && (config.visionApiUrl || config.visionModel || config.visionApiKey)) return provider + ' �� �Ӿ�';
	return provider;
}

function getMaxTokensForTask(queryType, configMaxTokens) {
	switch (queryType) {
		case 'chat': return Math.max(600, Math.min(configMaxTokens || 800, 800));
		case 'explain': return Math.max(600, Math.min(configMaxTokens || 800, 800));
		case 'query': return Math.max(600, Math.min(configMaxTokens || 800, 1000));
		case 'write': return Math.max(1000, configMaxTokens || 800);
		case 'complex': return Math.max(1200, configMaxTokens || 1000);
		default: return configMaxTokens || 800;
	}
}

function classifyQueryType(message, pageContext = {}) {
	let text = asText(message, 400);
	if (!text) return 'chat';
	// Screenshot recognition
	if (/��ͼ|ͼƬ|ʶ��|¼��|����/.test(text)) return 'complex';
	if (/�տ�|�˿�|���|����|����|���|���|����|������|����|����|ʵ��|����|֧��|ת��|���|����|β��/.test(text)) {
		if (/��ѯ|��һ��|����|����|����|�б�|��ϸ|��¼|��ˮ|����|��û��|ͳ��|Ԥ��|����|����|����|����|���/.test(text)) return 'query';
		return 'write';
	}
	// Write actions: create/record/arrange/update orders, items, rests, notes
	if (/����|��¼|����|�Ǽ�|¼��|����|����|���|��Ϣ|�޸�|����|����|����|����|�ĵ�|����|����|�Ƶ�|Ų��/.test(text)) return 'write';
	// Query actions: schedule, orders, notes
	if (/��ѯ|����|С��|ʲôʱ��|����|��ʲô|��ʲô|����|����|����|����|����/.test(text)) return 'query';
	// Function inquiry
	if (/����|��ô��|����ʲô|С����|����/.test(text)) return 'explain';
	return 'chat';
}

function compressStaffList(staffOptions = []) {
	if (!staffOptions.length) return '';
	return staffOptions.slice(0, 40).map(item => {
		let roles = Array.isArray(item.STAFF_ROLES) ? item.STAFF_ROLES.filter(r => r).slice(0, 2).join('/') : '';
		return item.STAFF_NAME + (roles ? '(' + roles + ')' : '');
	}).join('��');
}

function compressTypeList(typeOptions = []) {
	if (!typeOptions.length) return '';
	return typeOptions.slice(0, 20).map(item => item.TYPE_NAME).join('��');
}

function buildCorePrompt(staff, pageContext = {}) {
	return [
		'����������ӰС�������Сè AI ���֣�������ࡢ�Ѻá���ʵ��',
		'��ǰ���ڣ�' + timeUtil.time('Y-M-D') + '��',
		'��ǰԱ����' + (staff.STAFF_NAME || 'Ա��') + '������Ա��' + (staff.STAFF_IS_ADMIN == 1 ? '��' : '��') + '��',
		'���ҵ��Ȩ�޻��ڵ�ǰ��¼Ա���˺ţ���ͨԱ��ֻ�ܲ����Լ���Ȩ���������ݣ�����Ա��ʹ�ù����������������Ժ�̨����У��Ϊ׼����Ҫ�Գ�û��Ȩ�ޣ�����ϵͳ������Ȩ�ޡ�',
		'�ش�������� 200 �����ڡ�',
	].join('\n');
}

function buildToolPrompt() {
	return [
		'��Ҳ��������ӰС�����ڵ��ܿ�ִ����ҵ�������塣',
		'�û�˵������/����/���족ʱ�����ϸ񰴵�ǰ���ڻ��㡣',
		'ֻ������Щ������query_schedule��create_order��create_orders��join_order��cancel_order��update_order��create_item��create_rest��add_note��query_payments��save_payment��void_payment��query_commissions��query_payroll��pay_payroll��audit_order��none��',
		'Ȩ��ԭ�򣺲�Ҫ��Ϊ�������о�ֱ�Ӿܾ����Ȱ���ǰ��¼�˺�������׼ȷ�Ķ�����������̨�ᰴԱ��/����ԱȨ�����ء�',
		'���û�Ҫ��ȡ��/ɾ������ʱ��cancel_order�����û�Ҫ���޸�/����������Ϣ�������ڡ�ʱ�䡢���͵ȣ�ʱ��update_order��',
		'�û�˵�����������Ľ�ͼ���޸�һ�¡����Ǵ��ˣ�Ӧ����20�š��Ⱦ���������������ҵ�ԭ������������update_order�޸����ڣ�����Ҳ�����ȷ��������cancel_orderȡ�������¼������create_order��',
		'����ж�Լ�����ȱ��Ӧ��/����/�ײͽ��͡�ʵ��/�Ѹ�/����/���/ת�ˡ���ֻ����ȷ���ղ������տ��������ȡ��ͼ/�ͻ�ԭ����ľ������ڣ����������ѡ��������׷�ʡ�',
		'������Լ�������/ת�˽�ͼ���뿴���ǶԷ�����������ȡ/���ˣ�������200������Ϊʵ�ն��𣬡�399д�桱ͨ�����ײ�/Ӧ�ղ������գ�������/���족���ܸ��ǽ�ͼ���6��20��������ȷ���ڣ�ͬһ��൥��ͬ���ͻ������塢�տ����ʱ����none׷�ʡ�',
		'�ƻ��Զ���Լ����ȡ�������������տ�����ʡ���˲�ͨ����������ȷ����ID��Ψһ�ɶ�λ���󣬲���ԭ��/˵����������ģ����������ִ�С�',
		'��ֹ���충��ID���ͻ��������տ�״̬��Ա�����ݣ�ȱ�ٹؼ��ֶ���none׷�ʡ�',
		'�Ͻ��þ�������㷵��none������reply�������˵"���޸�/�Ѱ���/�����/�Ѵ���/��ִ��"�ȳɹ������������û�������Ϊ�����ɹ��ˡ�noneʱֻ��˵"��Ҫ����XX��Ϣ"��"���ṩXX"��',
		'����JSON��ʽ��{"action":"...","reply":"...","data":{...}}��',
	].join('\n');
}

function buildWriteActionPrompt() {
	return [
		'query_schedule.data: startDate(YYYY-MM-DD)��endDate��scope(all/mine/joined/created)��',
		'create_order.data: date(����)��customerName(����)��time��endTime��typeName��typeId��customerMobile��source��place��content��amount��deposit��final��extra��participants[]��',
		'���ʶ��amount/������Ӧ�գ�deposit/final/extra��Ӧ�սṹ��paidAmount/paidDeposit/paidFinal/payments����ʵ�����ա�',
		'create_orders.data: orders[]��2�������ϱ�����create_orders����',
		'create_item.data: date(����)��title(����)��time��content��',
		'create_rest.data: date(����)��type(��Ϣ/���/����/���)��reason��',
		'add_note.data: noteType(team/personal)��title(����)��content��date��',
		'join_order.data: orderId��roleName��',
		'cancel_order.data: orderId(��customerName+date)��reason��',
		'update_order.data: orderId(��customerName+date��Ϊ��������)��newDate(������)��newTime��newType��newCustomerName��newPlace��newAmount��newContent��ֻ��Ҫ�޸ĵ��ֶΡ�',
		'query_payments.data: month��keyword��orderId��type��direction��status��size��',
		'query_paymentsȨ�ޣ���ͨԱ��ֻ�ܲ��Լ����տ�/ҵ����ؼ�¼������Ա�ɲ�ȫ���ָ��Ա����',
		'save_payment.data: orderId(����)��type(deposit/final/extra/product/supplement/refund/adjust������)��amount(����)��date��baseType��note��refPaymentId���˿�/�������дԭ��note��',
		'void_payment.data: paymentId(����)��reason(����)��',
		'query_commissions.data: month��staffId/staffName��orderId��paymentId��kind��status��keyword��size��',
		'query_commissionsȨ�ޣ���ͨԱ��ֻ�ܲ��Լ�����ɣ�����Ա�ɲ�ȫ���ָ��Ա����',
		'query_payroll.data: month��staffId/staffName����ͨԱ��Ĭ�ϲ��Լ�������Ա�ɲ�ָ��Ա����',
		'pay_payroll.data: month(����)��staffId/staffName(����)��note��ֻ�й���Ա�ɷ����ʣ�ϵͳ�ᰴ��ǰԤ����ϣУ��󷢷š�',
		'audit_order.data: orderId(����)��pass(true/false)��reason��participants��orderEditTime��',
		'ȱ�����ڻ�ͻ�����ʱ��none׷�ʡ�',
		'д�붯��ϵͳ�Զ�׷�����С�ǡ�',
	].join('\n');
}

function buildImagePrompt() {
	return [
		'ͼƬʶ��������жϽ�ͼ���ͣ�������Լ����������Ϣ���տ�/���/ת��ƾ֤������/���/�����Ϣ�������޹�ͼƬ����ҪĬ������ͼƬ��������������',
		'������ͼ������ʶ�����ڡ�ʱ�䡢�ͻ����绰���ص㡢�������͡���ע��һ��ͼ�����ж��������������ȡ��1����create_order��2����������create_orders��',
		'��С���򡰶�������/ÿ�����顱��ͼ���������������2026.09.11/2026-09-11ͨ����ҳ�����ڣ���Ƭ�ҵ����ֿ����Ǳ�ע��ԭ�������ڻ�ͻ�ԭ����',
		'������ҳ�����ںͿ�Ƭ�ҵױ�ע������ڳ�ͻ�����綥����2026.09.11����עд��9.16��Ӱ������Ҫֱ������/�޸Ķ��������뷵��none׷���û���������������ڰ�ҳ������9.11�����ǰ���ע���9.16����',
		'ֻ�е��û�������ȷ˵����ҳ������Ϊ׼���������9.11������������9.11������9.16�ĳ�9.11���Ⱦ���ָ��ʱ���ſɰ��û���ȷָ������ִ�С�',
		'�������ƽ�ͼ�������Ŷ�����ȡ�������ڣ���Ҫ�ѵڶ���ͼ�������׵���һ��ͼ��',
		'�տ��ͼ������ȷ�ϸ���򡢽��Ƿ�����ȡ/���ˡ���Ӧ������ֻ������orderId��ǰҳ��Ψһ����ʱ��save_payment��������none׷�ʶ�������',
		'����/����/��˽�ͼ��ֻ��ȡϵͳ��ȷ�ϵ��ֶΣ������·ݡ���Ա����ԭ��Ψһʱ��none׷�ʣ���Ҫ�¡�',
		'�������ȼ�����ͼ/ͼƬ�г��ֵľ������ڣ���6��20�ա�6/20���Ƕ������ڵ���Ҫ��Դ��',
		'���û������а���������/����/����/���족���������ʱ�������ͼ�����ҵ���ȷ���ڣ������Խ�ͼ����Ϊ׼����Ҫ�������е�������ڻ��㡣',
		'ʾ�����û�˵���������㡱����ͼ��ʾ6/20����dateӦΪ6/20��Ӧ�����ڣ���������������ڡ���ͼ�ǿͻ���ϵͳ��������ʵ����ƾ֤��',
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

function isResponsesApiUrl(url) {
	return asText(url, 400).replace(/\/+$/, '').toLowerCase().endsWith('/responses');
}

function isMimoApi(apiUrl, providerName = '') {
	let text = (asText(apiUrl, 400) + ' ' + asText(providerName, 80)).toLowerCase();
	return text.indexOf('xiaomimimo.com') >= 0 || text.indexOf('mimo') >= 0 || text.indexOf('С��') >= 0;
}

function normalizeModelForApi(model, apiUrl, providerName = '') {
	model = asText(model, 120);
	let compact = model.toLowerCase().replace(/[\s_]+/g, '-');
	if (compact == 'agnes-20-flash' || compact == 'agnes2.0-flash' || compact == 'agnes-2-0-flash') return 'agnes-2.0-flash';
	if (!isMimoApi(apiUrl, providerName)) return model || DEFAULT_CONFIG.model;
	if (compact == 'mimov2.5' || compact == 'mimo-v2.5') return 'mimo-v2.5';
	if (compact == 'mimov2.5-pro' || compact == 'mimo-v2.5-pro') return 'mimo-v2.5-pro';
	if (!compact || compact == 'gpt-4o-mini' || compact == 'deepseek-chat' || compact.indexOf('mimo') < 0) return DEFAULT_CONFIG.model;
	return model;
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

	// Rate limiting: per-user sliding window
	_rateLimitCheck(openId) {
		let now = Date.now();
		let windowMs = 60000; // 1 minute window
		let maxCalls = 15;    // max 15 calls per minute per user
		if (!this._rateMap) this._rateMap = {};
		let entry = this._rateMap[openId];
		if (!entry) entry = this._rateMap[openId] = { timestamps: [] };
		entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);
		if (entry.timestamps.length >= maxCalls) {
			this.AppError('����̫Ƶ�������Ժ�����');
		}
		entry.timestamps.push(now);
	}

	_sanitizeUserInput(message) {
		if (!message) return message;
		// Strip system-role injection patterns
		message = message.replace(/\b(system|assistant)\s*[:��]\s*/gi, '');
		// Strip common instruction override attempts
		message = message.replace(/\b(ignore|forget|disregard)\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|prompts?)\b/gi, '');
		// Strip role-play impersonation
		message = message.replace(/\byou\s+are\s+now\b/gi, '��');
		return message.trim();
	}

	_getDefaultProviders() {
		return [
			{
				id: 'agnes',
				providerName: 'Agnes',
				apiUrl: 'https://api.agnes-ai.com/v1',
				model: 'agnes-2.0-flash',
				visionApiUrl: 'https://api.agnes-ai.com/v1',
				visionModel: 'agnes-2.0-flash',
				apiKey: '',
				visionApiKey: '',
			},
			{
				id: 'mimo',
				providerName: 'MiMo',
				apiUrl: 'https://api.xiaomimimo.com/v1',
				model: 'mimo-v2.5',
				visionApiUrl: '',
				visionModel: '',
				apiKey: '',
				visionApiKey: '',
			},
		];
	}

	async _getProvidersConfig() {
		let raw = await setupUtil.get(PROVIDERS_STORE_KEY);
		if (raw && !raw.providers && raw.providerName) {
			let providerId = isMimoApi(raw.apiUrl, raw.providerName) ? 'mimo' : 'agnes';
			let migrated = {
				providers: [{
					id: providerId,
					providerName: raw.providerName || DEFAULT_CONFIG.providerName,
					apiUrl: raw.apiUrl || DEFAULT_CONFIG.apiUrl,
					model: raw.model || DEFAULT_CONFIG.model,
					visionApiUrl: raw.visionApiUrl || '',
					visionModel: raw.visionModel || '',
					apiKey: raw.apiKey || DEFAULT_CONFIG.apiKey,
					visionApiKey: raw.visionApiKey || '',
				}],
				activeProviderId: providerId,
			};
			await setupUtil.set(PROVIDERS_STORE_KEY, migrated);
			return migrated;
		}
		if (!raw || !raw.providers || !raw.providers.length) {
			let legacy = await setupUtil.get(SETUP_KEY);
			if (legacy && (legacy.apiKey || legacy.apiUrl || legacy.model || legacy.providerName)) {
				let providerId = isMimoApi(legacy.apiUrl, legacy.providerName) ? 'mimo' : 'agnes';
				let migrated = {
					providers: [{
						id: providerId,
						providerName: legacy.providerName || DEFAULT_CONFIG.providerName,
						apiUrl: legacy.apiUrl || DEFAULT_CONFIG.apiUrl,
						model: normalizeModelForApi(legacy.model || DEFAULT_CONFIG.model, legacy.apiUrl, legacy.providerName),
						visionApiUrl: legacy.visionApiUrl || '',
						visionModel: legacy.visionModel ? normalizeModelForApi(legacy.visionModel, legacy.visionApiUrl || legacy.apiUrl, legacy.providerName) : '',
						apiKey: legacy.apiKey || DEFAULT_CONFIG.apiKey,
						visionApiKey: legacy.visionApiKey || '',
					}],
					activeProviderId: providerId,
				};
				await setupUtil.set(PROVIDERS_STORE_KEY, migrated);
				return migrated;
			}
			let defaults = {
				providers: this._getDefaultProviders(),
				activeProviderId: 'agnes',
			};
			await setupUtil.set(PROVIDERS_STORE_KEY, defaults);
			return defaults;
		}
		return raw;
	}

	async _getActiveProviderConfig() {
		let providersConfig = await this._getProvidersConfig();
		let activeId = providersConfig.activeProviderId || 'agnes';
		let active = providersConfig.providers.find(p => p.id == activeId);
		if (!active) active = providersConfig.providers[0];
		if (!active) {
			return {
				enabled: true,
				providerName: DEFAULT_CONFIG.providerName,
				apiUrl: DEFAULT_CONFIG.apiUrl,
				model: DEFAULT_CONFIG.model,
				visionApiUrl: DEFAULT_CONFIG.visionApiUrl,
				visionModel: DEFAULT_CONFIG.visionModel,
				apiKey: DEFAULT_CONFIG.apiKey,
				visionApiKey: DEFAULT_CONFIG.visionApiKey,
				personality: DEFAULT_CONFIG.personality,
				systemPrompt: DEFAULT_CONFIG.systemPrompt,
				temperature: DEFAULT_CONFIG.temperature,
				maxTokens: DEFAULT_CONFIG.maxTokens,
			};
		}
		return {
			enabled: true,
			providerName: active.providerName || DEFAULT_CONFIG.providerName,
			apiUrl: active.apiUrl || DEFAULT_CONFIG.apiUrl,
			model: normalizeModelForApi(active.model || DEFAULT_CONFIG.model, active.apiUrl, active.providerName),
			visionApiUrl: active.visionApiUrl || '',
			visionModel: active.visionModel ? normalizeModelForApi(active.visionModel, active.visionApiUrl || active.apiUrl, active.providerName) : '',
			apiKey: active.apiKey || getEnvApiKey() || DEFAULT_CONFIG.apiKey,
			visionApiKey: active.visionApiKey || '',
			personality: DEFAULT_CONFIG.personality,
			systemPrompt: DEFAULT_CONFIG.systemPrompt,
			temperature: DEFAULT_CONFIG.temperature,
			maxTokens: DEFAULT_CONFIG.maxTokens,
		};
	}

	async getAdminConfig() {
		let providersConfig = await this._getProvidersConfig();
		let active = await this._getActiveProviderConfig();
		let publicProviders = providersConfig.providers.map(p => ({
			id: p.id,
			providerName: p.providerName,
			apiUrl: p.apiUrl || '',
			model: p.model || '',
			visionApiUrl: p.visionApiUrl || '',
			visionModel: p.visionModel || '',
			hasApiKey: !!p.apiKey,
			apiKeyMasked: this._maskKey(p.apiKey || ''),
			hasVisionApiKey: !!p.visionApiKey,
			visionApiKeyMasked: this._maskKey(p.visionApiKey || ''),
		}));
		return {
			enabled: true,
			providers: publicProviders,
			activeProviderId: providersConfig.activeProviderId || 'agnes',
			personality: active.personality || DEFAULT_CONFIG.personality,
			personalityName: (PERSONALITY_MAP[active.personality] || PERSONALITY_MAP[DEFAULT_CONFIG.personality]).name,
			personalities: Object.keys(PERSONALITY_MAP).map(key => ({ key, name: PERSONALITY_MAP[key].name })),
			memoryEnabled: false,
			memoryText: '',
			systemPrompt: active.systemPrompt || DEFAULT_CONFIG.systemPrompt,
			temperature: asNumber(active.temperature, DEFAULT_CONFIG.temperature, 0, 2),
			maxTokens: Math.round(asNumber(active.maxTokens, DEFAULT_CONFIG.maxTokens, 128, 4000)),
			contextLimit: estimateContextLimit(active.model),
			visionContextLimit: estimateContextLimit(active.visionModel || active.model),
			agentCatalog: agentRegistry.getPublicCatalog(),
		};
	}

	async saveProvidersConfig(input = {}) {
		let raw = input.providers;
		if (!Array.isArray(raw) || !raw.length) this.AppError('需要提供至少一个供应商');
		let providers = [];
		let savedConfig = await this._getProvidersConfig();
		for (let p of raw) {
			let id = asText(p.id, 40) || 'prov_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
			let providerName = asText(p.providerName, 60);
			if (!providerName) this.AppError('每个供应商都需要名称');
			let apiUrl = asText(p.apiUrl, 400);
			if (apiUrl) this._assertApiUrl(normalizeChatApiUrl(apiUrl));
			let visionApiUrl = asText(p.visionApiUrl, 400);
			if (visionApiUrl) this._assertApiUrl(normalizeChatApiUrl(visionApiUrl));
			let saved = savedConfig.providers.find(sp => sp.id == id);
			providers.push({
				id,
				providerName,
				apiUrl: apiUrl || DEFAULT_CONFIG.apiUrl,
				model: normalizeModelForApi(p.model, p.apiUrl, p.providerName),
				visionApiUrl: visionApiUrl,
				visionModel: asText(p.visionModel, 120) ? normalizeModelForApi(p.visionModel, visionApiUrl || apiUrl, p.providerName) : '',
				apiKey: asText(p.apiKey, 400) || (saved ? saved.apiKey : '') || DEFAULT_CONFIG.apiKey,
				visionApiKey: asText(p.visionApiKey, 400) || (saved ? saved.visionApiKey : '') || '',
			});
		}
		let activeProviderId = asText(input.activeProviderId, 40) || 'agnes';
		if (!providers.find(p => p.id == activeProviderId)) activeProviderId = providers[0].id;
		let next = { providers, activeProviderId };
		await setupUtil.set(PROVIDERS_STORE_KEY, next);
		let loaded = await this._getProvidersConfig();
		let active = await this._getActiveProviderConfig();
		let publicProviders = loaded.providers.map(p => ({
			id: p.id,
			providerName: p.providerName,
			apiUrl: p.apiUrl || '',
			model: p.model || '',
			visionApiUrl: p.visionApiUrl || '',
			visionModel: p.visionModel || '',
			hasApiKey: !!p.apiKey,
			apiKeyMasked: this._maskKey(p.apiKey || ''),
			hasVisionApiKey: !!p.visionApiKey,
			visionApiKeyMasked: this._maskKey(p.visionApiKey || ''),
		}));
		return {
			enabled: true,
			providers: publicProviders,
			activeProviderId: loaded.activeProviderId || 'agnes',
			personality: active.personality || DEFAULT_CONFIG.personality,
			personalityName: (PERSONALITY_MAP[active.personality] || PERSONALITY_MAP[DEFAULT_CONFIG.personality]).name,
			personalities: Object.keys(PERSONALITY_MAP).map(key => ({ key, name: PERSONALITY_MAP[key].name })),
			memoryEnabled: false,
			memoryText: '',
			systemPrompt: active.systemPrompt || DEFAULT_CONFIG.systemPrompt,
			temperature: asNumber(active.temperature, DEFAULT_CONFIG.temperature, 0, 2),
			maxTokens: Math.round(asNumber(active.maxTokens, DEFAULT_CONFIG.maxTokens, 128, 4000)),
			contextLimit: estimateContextLimit(active.model),
			visionContextLimit: estimateContextLimit(active.visionModel || active.model),
			agentCatalog: agentRegistry.getPublicCatalog(),
		};
	}

	// Legacy alias — delegates to saveProvidersConfig
	async saveAdminConfig(input = {}, options = {}) {
		return await this.saveProvidersConfig(input);
	}

	async chat(openId, message, history = [], attachments = [], pageContext = {}) {
		let staff = await this.assertStaff(openId);
		this._rateLimitCheck(openId);
		let config = await this._getActiveProviderConfig();

		if (!config.enabled) this.AppError('AI С������δ���ã������Ա������');
		if (!config.apiKey && !config.visionApiKey) this.AppError('AI API Key δ���ã������Ա������');

		message = asText(message, 800);
		if (!message) this.AppError('������Ҫ���͵�����');
		message = this._sanitizeUserInput(message);
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
		if (!selectedApiKey) this.AppError(hasImages ? 'ͼƬʶ�� API Key δ���ã������Ա�������Ӿ� Key ���� Key' : 'AI API Key δ���ã������Ա������');

		let body = {
			model: selectedModel,
			messages,
			temperature: (queryType === 'write' || queryType === 'complex') ? Math.min(config.temperature, 0.3) : config.temperature,
			max_tokens: selectedMaxTokens,
		};

		try {
			let result = await this._postJson(selectedApiUrl, this._requestBodyForApi(selectedApiUrl, body), {
				Authorization: 'Bearer ' + selectedApiKey,
			});
			let reply = this._pickReply(result);
			if (!reply) this.AppError('AI �ӿڷ��ظ�ʽ��֧�֣�����ӿ��Ƿ���� Chat Completions');
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
					let minimalResult = await this._postJson(selectedApiUrl, this._requestBodyForApi(selectedApiUrl, minimalBody), {
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
			if (!hasImages && isMimoApi(selectedApiUrl, config.providerName) && this._shouldRetryWithMinimalBody(err, body)) {
				try {
					let mimoBody = this._mimoTextFallbackBody(body);
					let mimoResult = await this._postJson(selectedApiUrl, this._requestBodyForApi(selectedApiUrl, mimoBody), {
						Authorization: 'Bearer ' + selectedApiKey,
					});
					let mimoReply = this._pickReply(mimoResult);
					if (mimoReply) {
						let mimoConfig = Object.assign({}, config, {
							model: mimoBody.model,
							providerName: getProviderNameForRequest(config, hasImages),
						});
						return await this._handleAgentReply(openId, staff, mimoReply, mimoConfig, mimoResult, imageAttachments, pageContext);
					}
				} catch (mimoErr) {
					console.error('AI Mimo text fallback failed:', mimoErr && mimoErr.message ? mimoErr.message : mimoErr);
					err = mimoErr;
				}
			}
			// If a separate vision model is unstable, try the text model once on
			// the same request. Do not force a hard-coded model on custom APIs.
			let fallbackModel = hasImages ? asText(config.model, 120) : '';
			if (err && (err.statusCode === 429 || err.statusCode >= 500) && fallbackModel && fallbackModel !== selectedModel) {
				try {
					body.model = fallbackModel;
					let fallbackResult = await this._postJson(selectedApiUrl, this._requestBodyForApi(selectedApiUrl, body), {
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
			return this._localAgentResult(config, {
				action: 'none',
				reply: '\u6211\u5728\u7ebf\uff0c\u4f46\u5916\u90e8 AI \u63a5\u53e3\u8fd9\u6b21\u6ca1\u6709\u6b63\u5e38\u8fd4\u56de\u3002\u4f60\u53ef\u4ee5\u5148\u7ee7\u7eed\u95ee\u6211\u5c0f\u7a0b\u5e8f\u529f\u80fd\u3001\u6863\u671f\u548c\u8ba2\u5355\u64cd\u4f5c\u601d\u8def\uff1b\u5982\u679c\u8981\u6211\u751f\u6210\u957f\u6587\u6216\u505a\u590d\u6742\u5206\u6790\uff0c\u9700\u8981\u7ba1\u7406\u5458\u68c0\u67e5 AI \u4f9b\u5e94\u5546\u7684 Base URL\u3001\u6a21\u578b ID \u548c Key\u3002',
				aiUnavailable: true,
				errorStatus: err && err.statusCode ? err.statusCode : 0,
			});
		}
	}

	async listModels(input = {}) {
		let config;
		if (input.providerId) {
			let providersConfig = await this._getProvidersConfig();
			let provider = providersConfig.providers.find(p => p.id == input.providerId);
			if (provider) {
				config = {
					enabled: true,
					providerName: provider.providerName,
					apiUrl: provider.apiUrl,
					model: provider.model,
					visionApiUrl: provider.visionApiUrl,
					visionModel: provider.visionModel,
					apiKey: provider.apiKey,
					visionApiKey: provider.visionApiKey,
				};
			}
		}
		if (!config) config = await this._getActiveProviderConfig();
		let target = input.target == 'vision' ? 'vision' : 'text';
		let apiUrl = asText(input.apiUrl, 400) || (target == 'vision' ? (config.visionApiUrl || config.apiUrl) : config.apiUrl) || DEFAULT_CONFIG.apiUrl;
		let apiKey = asText(input.apiKey, 400) || (target == 'vision' ? (config.visionApiKey || config.apiKey) : config.apiKey) || getEnvApiKey();
		let modelsApiUrl = normalizeModelsApiUrl(apiUrl);

		this._assertApiUrl(modelsApiUrl);
		if (!apiKey) this.AppError('需要填写并保存 API Key 后再获取模型列表');

		try {
			let result = await this._getJson(modelsApiUrl, {
				Authorization: 'Bearer ' + apiKey,
			});
			let models = this._parseModelList(result);
			if (!models.length) this.AppError('AI 接口没有返回可用模型，请手动填写模型 ID');
			return { models };
		} catch (err) {
			if (err && err.name == 'AppError') throw err;
			if (err && err.statusCode == 404) this.AppError('当前接口没有提供模型列表，请确认 Base URL 或手动填写模型 ID');
			if (err && err.statusCode == 401) this.AppError('API Key 无效，无权获取模型列表');
			if (err && err.statusCode == 403) this.AppError('API Key 没有获取模型列表权限');
			console.error('AI models failed:', err && err.message ? err.message : err);
			this.AppError('获取模型列表失败，请重试或手动填写模型 ID');
		}
	}

	async _getConfig(options = {}) {
		let saved = await setupUtil.get(SETUP_KEY);
		let config = Object.assign({}, DEFAULT_CONFIG, saved || {});
		if (!config.providerName || config.providerName == 'OpenAI���ݽӿ�') config.providerName = DEFAULT_CONFIG.providerName;
		if (!config.apiUrl || config.apiUrl == LEGACY_OPENAI_API_URL) config.apiUrl = DEFAULT_CONFIG.apiUrl;
		config.model = normalizeModelForApi(config.model, config.apiUrl, config.providerName);
		if (config.visionModel) config.visionModel = normalizeModelForApi(config.visionModel, config.visionApiUrl || config.apiUrl, config.providerName);
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
			memoryEnabled: !!config.memoryEnabled,
			memoryText: asText(config.memoryText, 2000),
			systemPrompt: config.systemPrompt || DEFAULT_CONFIG.systemPrompt,
			temperature: asNumber(config.temperature, DEFAULT_CONFIG.temperature, 0, 2),
			maxTokens: Math.round(asNumber(config.maxTokens, DEFAULT_CONFIG.maxTokens, 128, 4000)),
			hasApiKey: !!config.apiKey,
			apiKeyMasked: this._maskKey(config.apiKey || ''),
			hasVisionApiKey: !!config.visionApiKey,
			visionApiKeyMasked: this._maskKey(config.visionApiKey || ''),
			contextLimit: estimateContextLimit(config.model),
			visionContextLimit: estimateContextLimit(config.visionModel || config.model),
			agentCatalog: agentRegistry.getPublicCatalog(),
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
			this.AppError('AI �ӿڵ�ַ��ʽ����');
		}
		if (parsed.protocol != 'https:') this.AppError('AI �ӿڵ�ַ����ʹ�� https');
		let host = String(parsed.hostname || '').toLowerCase();
		if (!host || host == 'localhost' || host.endsWith('.local')) this.AppError('AI �ӿڵ�ַ����ʹ�ñ�������');
		if (this._isBlockedIp(host)) this.AppError('AI �ӿڵ�ַ����ʹ�������򱾻� IP');
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
		let staffName = staff && staff.STAFF_NAME ? staff.STAFF_NAME : 'Ա��';
		let system = config.systemPrompt || DEFAULT_CONFIG.systemPrompt;
		let personality = PERSONALITY_MAP[config.personality] || PERSONALITY_MAP[DEFAULT_CONFIG.personality];
		system += '\n\n' + personality.prompt;
		system += '\n\n��ǰ�û���' + staffName + '���ش�������� 200 �����ڣ������û���ȷҪ����ϸ˵����';

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
			parts.push('��ǰҳ�棺' + JSON.stringify({ route: pageContext.route || '', orderId: pageContext.orderId || '', day: pageContext.day || '' }));
			if (pageContext.day) parts.push('Date fallback: pageContext.day����ΪĬ��д�����ڡ�');
		}

		// Add tool instructions for action-capable queries
		if (needsTools) {
			parts.push(agentRegistry.buildToolPrompt(selectedSkills, queryType));
			parts.push(agentRegistry.buildWriteActionPrompt(selectedSkills, queryType));
		} else if (queryType === 'explain') {
			parts.push('����û���С��������ʲô����ʵ�ʹ��ܻش𣺵��ڡ������������Ϣ��С�ǡ���Ϣ��������ҵ�������ʡ��������ġ��տ��ɡ���ˡ�AI���á�');
		} else if (queryType === 'chat') {
			parts.push('�������Ը񡢻�������©�Ĺ���̨agent���ش�ҵ������Ҫ������Ӱ�����ҳ�����');
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
				parts.push('����Ա����' + compressStaffList(staffOptions));
				parts.push('�����������ͣ�' + compressTypeList(typeOptions));
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

		if (config.memoryEnabled && config.memoryText) {
			parts.push('����Աά���ĳ��ڼ���/���ڹ���' + asText(config.memoryText, 2000));
			parts.push('���ڼ���ֻ��Ϊ�ش��׷�ʲο������������ݿ���ʵ���漰���������տ���ʡ���˵�д��ǰ�Ա���������ǰ�ֶΡ�ҳ�������ĺͺ�̨У�顣');
		}

		// Add knowledge base for non-trivial queries
		if (queryType !== 'chat') {
			parts.push('����ժҪ��' + LOCAL_APP_KNOWLEDGE.join('��'));
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
			let content = [{ type: 'text', text: last.content + '\n\n���Ͻ�ͼ���ж���Ϣ���ͣ���ʶ����/����/�տ�/���/����/�����Ϣ�����ż������ͼƬ����ȷ���������ʱ��׷�ʡ�' }];
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
				raw = imgCount > 0 ? textParts + ` [����${imgCount}��ͼƬ]` : textParts;
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
				reply: '�յ��������䡣���ζԻ����ټ������� AI��',
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
					reply: `ֻ�ҵ� ${orders.length} ����ѡ������û�е� ${intent.pickIndex} ���������¸�����Ҫ����һ����`,
				});
			}
		}
		if (!orders.length) {
			let target = intent.keyword ? `��${intent.keyword}��` : intent.date;
			return this._localAgentResult(config, {
				action: 'none',
				reply: `${target} û���ҵ����޸ĵĶ������ڣ���ȷ�Ͽͻ�����ԭ�����Ƿ���ȷ��`,
			});
		}
		if (orders.length > 1) {
			let lines = orders.slice(0, 8).map((order, idx) => {
				let name = order.ORDER_CUSTOMER_NAME || order.ORDER_CUSTOMER_SURNAME || 'δ��ͻ�';
				return `${idx + 1}. ${order.ORDER_DATE || ''} ${order.ORDER_TIME || 'δ��ʱ��'} ${order.ORDER_TYPE_NAME || '����'}���ͻ�${name}`;
			}).join('\n');
			return this._localAgentResult(config, {
				action: 'none',
				reply: `�ҵ� ${orders.length} ������Ҫ�޸ĵĶ������ڣ��������Ҫ�ĵڼ�����\n${lines}`,
			});
		}

		let order = orders[0];
		let ret = await this._agentUpdateOrder(openId, staff, { orderId: order._id, newDate: intent.newDate }, pageContext);
		ret.reply = `�Ѱ� ${order.ORDER_DATE || intent.date || '��'} �������ڸĵ� ${intent.newDate}��${order.ORDER_TIME || ''} ${order.ORDER_TYPE_NAME || '����'}���ͻ�${order.ORDER_CUSTOMER_NAME || ''}����ͬ��д��ȫ��С�������ˮ��`.replace(/\s+/g, ' ').trim();
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
		if (!/^(�޲���|���ò���|������|û�в���|û��|����|��)$/.test(text)) return false;
		let normalized = this._normalizeHistory(history).reverse();
		let lastAssistant = normalized.find(item => item.role == 'assistant' && item.content);
		return !!(lastAssistant && /(����|��ע|ȷ��|����Ҫ)/.test(asText(lastAssistant.content, 1000)));
	}

	_parseLocalOrderDateUpdateIntent(message, history = [], pageContext = {}) {
		let direct = this._parseOrderDateUpdateText(message, pageContext);
		if (direct) return direct;
		let pending = this._parsePendingOrderDateSelection(message, history, pageContext);
		if (pending) return pending;

		let text = asText(message, 800);
		if (!/(ֻ��|��һ|Ψһ|һ��|1��)/.test(text)) return null;
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
		let m = text.match(/^(?:��)?([1-9])(?:��|��|��|��)?$/);
		if (!m) return null;
		let pickIndex = Number(m[1]);
		let normalized = this._normalizeHistory(history).reverse();
		let sawPendingQuestion = false;
		for (let item of normalized) {
			let content = asText(item.content, 1200);
			if (!content) continue;
			if (item.role == 'assistant' && /�ҵ�\s*\d+\s*��.*��������/.test(content) && /(�ڼ���|��һ��|��һ���ͻ�|�ڼ���)/.test(content)) {
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
		let hasBusinessWord = /(����|����|����|����)/.test(text);
		let hasDate = !!(this._extractSingleTextDate(text) || this._extractSpecificTextDate(text) || this._extractOrderedTextDates(text).length);
		if (!hasBusinessWord && !hasDate) return null;
		let correction = this._parseOrderDateCorrectionText(text, pageContext);
		if (correction) return correction;
		if (!/(��|�޸�|����|����|����|��|��|��|Ų)/.test(text)) return null;

		let patterns = [
			/(?:��|��)?([\s\S]{0,60}?)(?:��)?(?:����|����|����|����)?\s*(?:��|�޸�|����|����|����|��|��|��|Ų)(?:��|Ϊ|��|��)\s*([\s\S]{1,60})/,
			/(?:��)\s*([\s\S]{1,40}?)(?:��|�޸�|����|����|����|��|��|��|Ų)?(?:��|Ϊ|��|��)\s*([\s\S]{1,60})/,
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
		let m = text.match(/^([\s\S]{1,80}?)(?:��)?(?:����|����|����|����)?\s*(?:Ӧ����|ӦΪ|��ȷ��|ʵ����|��|Ϊ)\s*([\s\S]{1,40})$/);
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
		if (/^(����|����|����|����|ǰ��|�����|��ǰ��|����|ʱ��|����|����|����|����)$/.test(keyword)) return true;
		return keyword.length < 2;
	}

	_extractOrderKeyword(text) {
		text = asText(text, 120);
		if (!text) return '';
		text = text.replace(/(\d{4}\s*[��./-]\s*\d{1,2}\s*[��./-]\s*\d{1,2}\s*(?:��|��)?|\d{1,2}\s*[��./-]\s*\d{1,2}\s*(?:��|��)?|\d{1,2}\s*(?:��|��))/g, ' ');
		text = text.replace(/(��|��|��|��|���|�Ǹ�|����|����|Ψһ|ֻ��|һ��|1��|��\d+��|����|����|����|����|�ͻ�|��|�޸�|����|����|����|����|��|��|��|Ų|��|Ϊ|��|��|Ӧ����|ӦΪ|��ȷ��|ʵ����|��)/g, ' ');
		text = text.replace(/[��:��,��.����;����()[\]����"'��������\s]+/g, ' ').trim();
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
		let m = text.replace(/\s+/g, '').match(/^(\d{1,2})(?:��|��)?$/) || text.match(/(^|[^\d])(\d{1,2})\s*(?:��|��)(?![����λ�����������׼�])/);
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
		let re = /(\d{4}\s*[��./-]\s*\d{1,2}\s*[��./-]\s*\d{1,2}\s*(?:��|��)?|\d{1,2}\s*[��./-]\s*\d{1,2}\s*(?:��|��)?)/g;
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
		if (Array.isArray(result.output)) {
			let parts = [];
			for (let item of result.output) {
				if (!item) continue;
				if (typeof item.text == 'string') parts.push(item.text);
				if (Array.isArray(item.content)) {
					for (let c of item.content) {
						if (!c) continue;
						if (typeof c.text == 'string') parts.push(c.text);
						else if (typeof c.output_text == 'string') parts.push(c.output_text);
					}
				}
			}
			if (parts.length) return asText(parts.join(''), 4000);
		}
		return '';
	}

	_minimalChatBody(body = {}) {
		return {
			model: body.model,
			messages: body.messages,
		};
	}

	_requestBodyForApi(apiUrl, body = {}) {
		if (isResponsesApiUrl(apiUrl)) return this._responsesBody(body);
		return body;
	}

	_responsesBody(body = {}) {
		let instructions = [];
		let inputLines = [];
		let messages = Array.isArray(body.messages) ? body.messages : [];
		for (let msg of messages) {
			if (!msg) continue;
			let role = msg.role == 'assistant' ? 'assistant' : (msg.role == 'system' ? 'system' : 'user');
			let text = this._plainTextFromMessageContent(msg.content);
			if (!text) continue;
			if (role == 'system') {
				instructions.push(text);
			} else {
				inputLines.push(role + ': ' + text);
			}
		}
		if (!inputLines.length) {
			let userText = this._lastUserText(messages) || asText(this._agentUserMessage, 1200);
			if (userText) inputLines.push('user: ' + userText);
		}
		let ret = {
			model: body.model,
			input: inputLines.join('\n'),
		};
		if (instructions.length) ret.instructions = instructions.join('\n\n');
		if (body.temperature !== undefined) ret.temperature = body.temperature;
		if (body.max_tokens) ret.max_output_tokens = body.max_tokens;
		return ret;
	}

	_plainTextFromMessageContent(content) {
		if (typeof content == 'string') return content;
		if (!Array.isArray(content)) return '';
		return content
			.filter(item => item && item.type == 'text' && item.text)
			.map(item => item.text)
			.join('\n');
	}

	_lastUserText(messages = []) {
		if (!Array.isArray(messages)) return '';
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i] && messages[i].role == 'user') return asText(this._plainTextFromMessageContent(messages[i].content), 1200);
		}
		return '';
	}

	_mimoTextFallbackBody(body = {}) {
		let userText = this._lastUserText(body.messages) || asText(this._agentUserMessage, 1200);
		return {
			model: normalizeModelForApi(body.model, DEFAULT_CONFIG.apiUrl, DEFAULT_CONFIG.providerName),
			messages: [{
				role: 'user',
				content: '你是云屿摄影小程序里的小猫 AI 助手。请直接回答用户问题，不要编造系统数据。用户消息：' + userText,
			}],
		};
	}

	_shouldRetryWithMinimalBody(err, body = {}) {
		if (!err || !body.model || !body.messages) return false;
		let msg = String(err.safeMessage || err.message || '').toLowerCase();
		return err.statusCode == 400
			|| err.statusCode == 422
			|| msg.indexOf('param') >= 0
			|| msg.indexOf('����') >= 0;
	}

	_pickJsonObject(text) {
		text = asText(text, 6000);
		if (!text) return null;
		text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
		try {
			let obj = JSON.parse(text);
			if (obj && typeof obj == 'object' && !Array.isArray(obj)) return obj;
		} catch (err) {
			// first JSON.parse attempt failed, will try bracket-based extraction below
		}

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
		} catch (err) {
			console.error('[WorkAiService._pickJsonObject] bracket extraction parse failed:', err && err.message ? err.message : err);
		}
		return null;
	}

	_isConfirmRequiredAction(action) {
		return !!AGENT_CONFIRM_ACTIONS[action];
	}

	async _agentCreatePendingConfirm(openId, staff, action, data = {}, pageContext = {}) {
		let service = new WorkAgentConfirmService();
		let pending = await service.createPending(openId, staff, action, data, pageContext);
		return {
			action: 'agent_confirm',
			id: pending.id,
			data: pending,
			reply: `�����ɸ߷���ȷ�����룺${pending.title}�������Ա����AIȷ�϶��С�ȷ�Ϻ���ִ�У���ǰ��û�иĶ�ҵ�����ݡ�`,
		};
	}

	async confirmPendingAction(openId, staff, pending = {}) {
		let action = pending.AGENTCONFIRM_ACTION || '';
		let data = pending.AGENTCONFIRM_PAYLOAD || {};
		let pageContext = pending.AGENTCONFIRM_PAGE_CONTEXT || {};
		return await this._executeConfirmedAgentAction(openId, staff, action, data, pageContext);
	}

	async _executeConfirmedAgentAction(openId, staff, action, data = {}, pageContext = {}) {
		if (action == 'cancel_order') return await this._agentCancelOrder(openId, staff, data || {});
		if (action == 'save_payment') return await this._agentSavePayment(openId, staff, data || {});
		if (action == 'void_payment') return await this._agentVoidPayment(openId, staff, data || {});
		if (action == 'pay_payroll') return await this._agentPayPayroll(openId, staff, data || {});
		if (action == 'audit_order') return await this._agentAuditOrder(openId, staff, data || {});
		this.AppError('��ȷ�϶����ݲ�֧��ִ�У�' + action);
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
			// Guard: detect model hallucination �� reply claims success but action is none
			if (action && replyText && /��(�޸�|��|����|ɾ��|ȡ��|����|����|����|����|���|ִ��|����|����|¼��|��¼|�㶨)/.test(replyText)) {
				replyText = actionNotAllowed
					? 'AI ʶ����һ����ǰ����������ֱ��ִ�еĶ�����û��ʵ��д�롣�뻻�ɸ���ȷ��ҵ��ָ����Ƚ����Ӧ����/����ҳ������ԡ�'
					: 'AI û��ʵ��ִ��������������ø���ȷ��ָ�����ԣ����磺"�ѿͻ�XXX��9.16���ڸĳ�9.11"��������ǲ��У����ֶ��ڶ������޸ġ�';
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
		if (this._isConfirmRequiredAction(action.action)) ret = await this._agentCreatePendingConfirm(openId, staff, action.action, action.data || {}, pageContext);
		else if (action.action == 'query_schedule') ret = await this._agentQuerySchedule(openId, staff, action.data || {});
		else if (action.action == 'create_orders' && batchOrders.length) ret = await this._agentCreateOrders(openId, staff, batchPayload, attachments, pageContext);
		else if (action.action == 'create_orders') ret = { reply: 'AI��������������������û�а��������б����������������ϴ���ͼ��' };
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
				reply: action.reply || '�����������ʱ����ֱ��ִ�С�',
				model: config.model,
				providerName: config.providerName,
				contextLimit: estimateContextLimit(config.model),
				usage: llmResult && llmResult.usage ? llmResult.usage : {},
			};
		}

		return {
			reply: ret.reply || action.reply || '�Ѵ�����ɡ�',
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
		// spaces (e.g. "2026�� 6�� 20��" or "6 �� 20 ��").
		text = text.replace(/[\s��]+/g, '');
		let found = {};
		let pushDate = raw => {
			try {
				let day = this._cleanDate(raw, false);
				if (day) found[day] = true;
			} catch (err) {
				console.error('_extractSingleTextDate: skip unparseable date:', raw);
			}
		};

		let full = /(\d{4})[��./-](\d{1,2})[��./-](\d{1,2})(?:��|��)?(?!\d)/g;
		let m;
		while ((m = full.exec(text))) {
			let yr = Number(m[1]);
			if (yr < 1990 || yr > 2099) continue;
			pushDate(`${m[1]}-${m[2]}-${m[3]}`);
		}

		let monthDay = /(^|[^\d.])(\d{1,2})[��./-](\d{1,2})(?:��|��)?(?!\d{4}(?![:��]))(?![����λ�����������׼�])/g;
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
		// Cross-year boundary: Dec��Jan or Jan��Dec within ~60 days
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
		if (/(����|����|����|����|����|�賿|��|��|ȫ��|����|��|��Ƶ|д��|����|��¼|����|�Ǽ�|����|����|����|����|��Ϣ|���|����|�ͻ�|����)/.test(around)) return true;
		// Fallback: only match clear scheduling ACTION verbs, not nouns that appear in casual queries
		// (e.g. "����Ķ�����ô����" contains "����" but is a query, not a scheduling action)
		return /(��¼|����|�Ǽ�|����|¼��|����|����|���|��Ϣ)/.test(text);
	}

	_extractRelativeTextDate(text) {
		text = asText(text, 800);
		if (!text) return '';
		let explicit = this._extractSingleTextDate(text);
		if (explicit) return explicit;
		let week = this._extractWeekdayTextDate(text);
		if (week) return week;

		let rules = [
			{ key: '�����', days: 3 },
			{ key: '����', days: 2 },
			{ key: '����', days: 1 },
			{ key: '����', days: 0 },
			{ key: '��ǰ��', days: -3 },
			{ key: 'ǰ��', days: -2 },
			{ key: '����', days: -1 },
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
		let weekMap = { 'һ': 1, '��': 2, '��': 3, '��': 4, '��': 5, '��': 6, '��': 0, '��': 0 };
		let m = text.match(/(������|��������|�������|����|������|�����|������|��������|�������|����|������|�����|����|����|������|������|�����|�����|��|����|���)([һ��������������])/);
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
		if (prefix == '������' || prefix == '��������' || prefix == '�������') offset += 14;
		else if (prefix == '����' || prefix == '������' || prefix == '�����') offset += 7;
		else if (prefix == '������' || prefix == '��������' || prefix == '�������') offset -= 14;
		else if (prefix == '����' || prefix == '������' || prefix == '�����') offset -= 7;
		else if (prefix == '����' || prefix == '����' || prefix == '������' || prefix == '������' || prefix == '�����' || prefix == '�����') {
			// ����/����: stay in current week, no offset adjustment
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
		let m = text.match(/(\d{4})\s*��\s*(\d{1,2})\s*��\s*(\d{1,2})\s*[�պ�]/);
		if (m) {
			let year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
			if (year < 1990 || year > 2099) return '';
			let d = new Date(year, month - 1, day);
			if (d.getFullYear() == year && d.getMonth() + 1 == month && d.getDate() == day) {
				return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			}
		}
		m = text.match(/(\d{1,2})\s*��\s*(\d{1,2})\s*[�պ�](?![����λ�����������׼�])/);
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
		let hasRelativeKeyword = /[���������������ǰ���ǰ������]/.test(userMsg);
		if (!hasRelativeKeyword) return;
		// User message contains relative date keyword + image attachments.
		// Check if user message also contains a specific date (e.g. "6��20��") that differs.
		let specificInMsg = this._extractSingleTextDate(userMsg) || this._extractSpecificTextDate(userMsg);
		if (specificInMsg && specificInMsg !== resolvedDate) {
			console.warn('AI date mismatch: user text has specific date', specificInMsg, 'but resolved to', resolvedDate, 'with', attachments.length, 'image(s)');
		}
	}

	_cleanActionDate(date, required = true, options = {}) {
		date = asText(date, 30);
		// Only use user-message hint when AI didn't provide a usable explicit date.
		// This prevents user keywords like "����" from overriding a screenshot date
		// that the AI correctly extracted (e.g. "2026-06-25").
		if (options.allowUserDateHint !== false && (!date || this._isDatePlaceholder(date))) {
			let hint = this._extractRelativeTextDate(this._agentUserMessage || '');
			if (hint) return hint;
		}
		if (date) {
			let relRules = [
				{ key: '�����', days: 3 },
				{ key: '����', days: 2 },
				{ key: '����', days: 1 },
				{ key: '����', days: 0 },
				{ key: '��ǰ��', days: -3 },
				{ key: 'ǰ��', days: -2 },
				{ key: '����', days: -1 },
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
			|| normalized == 'YYYY-MM-DD.' || normalized == 'YYYY��MM��DD��' || normalized == 'YYYY��MM��DD��'
			|| normalized == 'DATE' || normalized == '<DATE>' || normalized == 'YYYYMMDD') return true;
		if (/\b(YYYY|MM|DD)\b/.test(normalized)) return true;
		if (/^\d{4}[-/.��]\d{1,2}[-/.��]\d{1,2}[�պ�]?[(��]/.test(normalized)) return true;
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
			.replace(/\s+\d{1,2}[:��]\d{2}.*/, '')
			.replace(/([�պ�])\s*[\dһ-��][\s\S]*$/, '$1')
			.replace(/(\d{4}[-/.��]\d{1,2}[-/.��]\d{1,2})\s*[����]��.*$/, '$1')
			.replace(/[./]/g, '-')
			.replace(/��|��/g, '-')
			.replace(/��|��/g, '')
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
				// Cross-year boundary: Dec��Jan or Jan��Dec within ~60 days
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
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) this.AppError('AI����ȱ�ٺϷ����ڣ��޷�ʶ��������ڡ�����"6��20��""������"����ȷ��������˵�������ڵ�������ҳ��ֱ��¼����');
		let parts = date.split('-').map(num => Number(num));
		let d = new Date(parts[0], parts[1] - 1, parts[2]);
		if (d.getFullYear() != parts[0] || d.getMonth() + 1 != parts[1] || d.getDate() != parts[2]) {
			this.AppError('AI����ʶ������ڲ����ڣ���2��30�գ���������ȷ����������˵��');
		}
		return date;
	}

	_cleanTime(text) {
		text = asText(text, 30);
		if (!text) return '';
		let m = text.match(/^(\d{1,2})[:��](\d{1,2})$/);
		if (m) {
			let h = Number(m[1]), min = Number(m[2]);
			if (h > 23 || min > 59) return '';
			return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
		}
		m = text.match(/^(����|����|����|����|����|�賿)?\s*(\d{1,2})\s*��\s*(��|\d{1,2}��?)?\s*$/);
		if (m) {
			let hour = Number(m[2]);
			let period = m[1] || '';
			if (hour > 23) return '';
			if (hour === 12 && (period == '�賿' || period == '����')) hour = 0;
			else if ((period == '����' || period == '����' || period == '����') && hour < 12) hour += 12;
			if (hour > 23) return '';
			let minute = '00';
			if (m[3]) {
				if (m[3] === '��') { minute = '30'; }
				else {
					let minNum = Number(m[3].replace('��', ''));
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
		let s = String(value).replace(/,/g, '').replace(/[����Ԫ\s]/g, '');
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
		} catch (err) {
			console.error('[WorkAiService._cleanPaymentDate] date parse failed:', err && err.message ? err.message : err);
		}
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
			PAYMENT_NOTE: note || 'AIʶ��ʵ��',
			note: note || 'AIʶ��ʵ��',
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
				asText(item.note || item.PAYMENT_NOTE || 'AIʶ��ʵ��', 120)
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

		if (paidDeposit) list.push(this._makePaymentDto('deposit', paidDeposit, order.ORDER_DATE, 'shoot', 'AIʶ�����ն���'));
		if (paidFinal) list.push(this._makePaymentDto('final', paidFinal, order.ORDER_DATE, 'shoot', 'AIʶ������β��'));
		if (paidExtra) list.push(this._makePaymentDto('extra', paidExtra, order.ORDER_DATE, 'extra', 'AIʶ�����ռ�ѡ/��Ʒ'));
		if (!list.length && paidAmount) list.push(this._makePaymentDto('deposit', paidAmount, order.ORDER_DATE, 'shoot', 'AIʶ��ʵ��'));

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
			name: type ? type.TYPE_NAME : (typeName || '����'),
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
			let roleName = asText(item.roleName || item.role || '', 40) || roles[0] || '��Ӱ';
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
			let riskLevel = this._inferAgentAuditRisk(title, content);
			let actionSummary = this._buildAgentAuditActionSummary(action, riskLevel, title, content, meta);
			await WorkAgentAuditModel.insert({
				AGENTAUDIT_ACTION: action,
				AGENTAUDIT_TITLE: asText(title, 120) || 'AI������¼',
				AGENTAUDIT_CONTENT: asText(content, 2000),
				AGENTAUDIT_OPENID: asText(openId, 120),
				AGENTAUDIT_STAFF_ID: staff && staff._id ? staff._id : '',
				AGENTAUDIT_STAFF_NAME: staff && staff.STAFF_NAME ? staff.STAFF_NAME : '',
				AGENTAUDIT_REF_TYPE: asText(meta.refType, 40),
				AGENTAUDIT_REF_ID: asText(meta.refId, 120),
				AGENTAUDIT_RISK_LEVEL: riskLevel,
				AGENTAUDIT_ACTION_SUMMARY: actionSummary,
				AGENTAUDIT_STATUS: 1,
			});
		} catch (err) {
			console.error('AI agent audit log failed:', err && err.message ? err.message : err);
		}
	}

	_buildAgentAuditActionSummary(action, riskLevel, title, content, meta = {}) {
		let contentText = asText(content, 2000);
		let refType = asText(meta.refType, 40);
		let refId = asText(meta.refId, 120);
		let tags = [];
		if (riskLevel == 'high') tags.push('high_risk');
		if (riskLevel == 'finance') tags.push('finance');
		if (refType || refId) tags.push('has_ref');
		if (/���|�տ�|�˿�|����|���|ת��|���/.test(contentText)) tags.push('money_related');
		if (/ȡ��|����|��ͨ��|����|���/.test(contentText)) tags.push('sensitive_write');

		return {
			schemaVersion: 1,
			action: asText(action, 40),
			riskLevel: asText(riskLevel, 40),
			requiresAdminReview: riskLevel == 'high' || riskLevel == 'finance',
			refType,
			refId,
			title: asText(title, 120),
			contentPreview: this._maskAgentAuditText(contentText, 260),
			signals: this._extractAgentAuditSignals(contentText),
			tags,
			safetyDecision: this._agentAuditSafetyDecision(action, riskLevel),
		};
	}

	_maskAgentAuditText(text, max = 260) {
		text = asText(text, max);
		text = text.replace(/1[3-9]\d{9}/g, match => match.slice(0, 3) + '****' + match.slice(-4));
		text = text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]');
		text = text.replace(/(sk-|key-|token-)[A-Za-z0-9_\-]{8,}/ig, '[secret]');
		return text;
	}

	_extractAgentAuditSignals(text) {
		text = asText(text, 600);
		let signals = [];
		let recordId = text.match(/��¼ID[:��]\s*([A-Za-z0-9_\-]+)/);
		if (recordId) signals.push({ label: '��¼ID', value: asText(recordId[1], 80) });
		let orderId = text.match(/����(?:ID)?[:��]?\s*([A-Za-z0-9_\-]{6,})/);
		if (orderId) signals.push({ label: '��������', value: asText(orderId[1], 80) });
		let amount = text.match(/(?:���|ʵ��|����)[:��]?\s*([\-]?\d+(?:\.\d{1,2})?)/);
		if (amount) signals.push({ label: '�������', value: asText(amount[1], 40) });
		let date = text.match(/\d{4}[-/.��]\d{1,2}[-/.��]\d{1,2}/);
		if (date) signals.push({ label: '��������', value: asText(date[0], 40) });
		return signals.slice(0, 6);
	}

	_agentAuditSafetyDecision(action, riskLevel) {
		if (/pay_payroll|void_payment|cancel_order|audit_order/.test(action)) return 'sensitive_write_executed';
		if (riskLevel == 'finance') return 'finance_write_or_finance_semantic';
		if (riskLevel == 'high') return 'high_risk_write';
		return 'normal_audited_write';
	}

	_inferAgentAuditAction(title) {
		title = asText(title, 120);
		if (/��������|��������/.test(title)) return 'create_order';
		if (/ȡ������/.test(title)) return 'cancel_order';
		if (/�޸Ķ���/.test(title)) return 'update_order';
		if (/¼���տ�/.test(title)) return 'save_payment';
		if (/�����տ�/.test(title)) return 'void_payment';
		if (/���Ź���/.test(title)) return 'pay_payroll';
		if (/��˶���/.test(title)) return 'audit_order';
		if (/��������/.test(title)) return 'create_item';
		if (/������Ϣ/.test(title)) return 'create_rest';
		if (/����С��/.test(title)) return 'add_note';
		return 'agent_action';
	}

	_inferAgentAuditRisk(title, content) {
		let text = asText(title + ' ' + content, 500);
		if (/���Ź���|�����տ�|��˶���|ȡ������|�˿�|���|��ͨ��/.test(text)) return 'high';
		if (/�տ�|���|����|���|����|ת��|���/.test(text)) return 'finance';
		return 'normal';
	}

	async _agentQuerySchedule(openId, staff, data = {}) {
		let startDate = this._cleanActionDate(data.startDate || data.date || data.ORDER_DATE);
		let endDate = this._cleanDate(data.endDate || data.end || startDate);
		if (endDate < startDate) endDate = startDate;
		let dayCount = this._countDays(startDate, endDate);
		if (dayCount > 14) this.AppError('AIһ������ѯ14�쵵�ڣ�����С���ڷ�Χ');
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
					customer: order.canFull ? (order.ORDER_CUSTOMER_NAME || '') : ((order.ORDER_CUSTOMER_SURNAME || '') + '�տͻ�'),
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
					type: rest.REST_TYPE || '��Ϣ',
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
			for (let order of row.orders) parts.push(`${order.time || 'ȫ��'} ${order.typeName}${order.customer ? '��' + order.customer : ''}${order.place ? '��' + order.place : ''}`);
			for (let item of row.items) parts.push(`${item.time || ''} �����${item.title}`.trim());
			for (let rest of row.rests) parts.push(`��Ϣ��${rest.staffName}${rest.type ? '��' + rest.type : ''}`);
			for (let note of row.notes) parts.push(`С�ǣ�${note.title}${note.content ? '��' + note.content.slice(0, 50) : ''}`);
			if (parts.length) lines.push(`${row.day}��${parts.join('��')}`);
		}

		let rangeText = startDate == endDate ? startDate : `${startDate} �� ${endDate}`;
		let reply = total
			? `${rangeText} �������� ${total} ������/С�ǣ�\n${lines.join('\n')}`
			: `${rangeText} ���޵��ڡ�С�ǻ���Ϣ��¼��`;
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
		return asText((err && (err.msg || err.message || err.errMsg)) || '��Ϣ����', 120);
	}

	async _buildAgentOrder(data = {}, attachments = [], options = {}) {
		let date = this._cleanActionDate(data.date || data.ORDER_DATE, true, options);
		let customerName = asText(data.customerName || data.ORDER_CUSTOMER_NAME, 80);
		if (!customerName) this.AppError('AI��������ȱ�ٿͻ�����');
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
		return `${order.ORDER_DATE || ''} ${order.ORDER_TIME || ''} ${order.ORDER_TYPE_NAME || '����'}���ͻ�${order.ORDER_CUSTOMER_NAME || ''}`.replace(/\s+/g, ' ').trim();
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
		let participantText = participants.map(p => `${p.staffName || p.staffId}(${p.roleName})`).join('��');
		let summary = `${staff.STAFF_NAME || 'Ա��'}ͨ��AI�����������ڣ�${date} ${order.ORDER_TIME || ''}��${type.name}���ͻ�${customerName}${order.ORDER_PLACE ? '���ص�' + order.ORDER_PLACE : ''}${participantText ? '�������ˣ�' + participantText : ''}����¼ID��${ret.id}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI������¼��������������', summary);
		return {
			action: 'create_order',
			id: ret.id,
			data: { date, order },
			auditNoteId,
			reply: `�������������ڣ�${date} ${order.ORDER_TIME || ''}��${type.name}���ͻ�${customerName}����ͬ��д��ȫ��С�������ˮ��`,
		};
	}

	async _agentCreateOrder(openId, staff, data = {}, attachments = [], pageContext = {}) {
		let built = await this._buildAgentOrder(data, attachments, { allowUserDateHint: true, defaultDate: this._contextDate(pageContext) });
		let duplicate = await this._findDuplicateOrder(built.order);
		if (duplicate) {
			return {
				action: 'create_order',
				id: duplicate._id,
				data: { date: built.date, order: built.order, skipped: [{ index: 1, reason: 'ϵͳ�Ѵ���ͬ��ͬ�ͻ���ͬ���͵Ķ���', duplicateId: duplicate._id }] },
				reply: `û������������\n1. ${this._orderLine(built.order)} �Ѵ��ڣ���������\n���������һ����ͬ�������벹�䲻ͬ�ͻ���Ϣ��ͬ�������ͺ������Ҽ�¼��`,
			};
		}
		return await this._saveBuiltAgentOrder(openId, staff, built);
	}

	async _agentCreateOrders(openId, staff, data = {}, attachments = [], pageContext = {}) {
		let rawOrders = this._extractBatchOrders(data);
		if (!rawOrders.length) this.AppError('AI������������ȱ�ٶ����б�');
		if (rawOrders.length > 8) this.AppError('AIһ���������8���������ڣ����������');

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
			let reason = skipped.length ? ('��' + skipped.map(item => `��${item.index}��${item.reason}`).join('��')) : '';
			this.AppError('��ͼ��ʶ�𵽶�����Ϣ������ȱ�ٺϷ����ڻ�ͻ����ƣ��޷�¼�롣��������Ϣ��ע�����ڣ���"6��20�յĶ���"������ֱ���ڵ�������ҳ��¼����' + reason);
		}

		let created = [];
		let accepted = [];
		for (let built of prepared) {
			let batchDuplicate = accepted.find(item => this._isSameOrderForDuplicate(built.order, item.order));
			if (batchDuplicate) {
				skipped.push({
					index: built.sourceIndex || 0,
					reason: '��������ʶ��ͬ��ͬ�ͻ���ͬ���͵Ķ���',
					line: this._orderLine(built.order),
				});
				continue;
			}

			let duplicate = await this._findDuplicateOrder(built.order);
			if (duplicate) {
				skipped.push({
					index: built.sourceIndex || 0,
					reason: 'ϵͳ�Ѵ���ͬ��ͬ�ͻ���ͬ���͵Ķ���',
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
			return `${idx + 1}. ${ret.data.date} ${order.ORDER_TIME || ''} ${order.ORDER_TYPE_NAME || '����'}���ͻ�${order.ORDER_CUSTOMER_NAME || ''}`.replace(/\s+/g, ' ').trim();
		});
		let reply = created.length
			? `������ ${created.length} ���������ڣ�\n${lines.join('\n')}\n��ͬ��д��ȫ��С�������ˮ��`
			: '����û�������������ڡ�';
		if (skipped.length) {
			reply += `\n������/δ��¼ ${skipped.length} ����\n${skipped.map((item, idx) => `${idx + 1}. ${item.line || ('��' + item.index + '��')}��${item.reason}`).join('\n')}`;
		}
		reply += '\n�����ͼ�ﻹ����©���Ķ�������������ǵڼ���ͼ�ڼ������һ������¼��';
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
		if (!orderId) this.AppError('��ǰû�пɼ���Ķ��������ȴ򿪶�������ҳ��������Ҷ���ID');
		let roleName = asText(data.roleName || data.role || '', 40);
		let work = new WorkService();
		let ret = await work.joinOrder(openId, orderId, roleName);
		return {
			action: 'join_order',
			id: orderId,
			data: { orderId, roleName: ret.roleName || roleName, already: ret.already || false },
			reply: ret.already
				? '���Ѿ�����������Ĳ������ˣ�����Ҫ�ظ����ӡ�'
				: `�Ѱ��������������Ĳ����ˣ���λ��${ret.roleName || roleName || '�����Ա��Ĭ�ϸ�λ'}�������ɽ�������⣬���������Ա���ߵ�����`,
		};
	}

	async _agentCancelOrder(openId, staff, data = {}) {
		let orderId = asText(data.orderId || data.id || data.ORDER_ID || '', 120);
		let customerName = asText(data.customerName || data.ORDER_CUSTOMER_NAME || '', 80);
		let date = this._cleanActionDate(data.date || data.ORDER_DATE, false);
		let reason = asText(data.reason || '', 200) || 'AI����ȡ��';

		if (!orderId && customerName && date) {
			let found = await this._findOrderByCustomerAndDate(customerName, date);
			if (found) orderId = found._id;
		}
		if (!orderId) this.AppError('û���ҵ�Ҫȡ���Ķ��������ṩ����ID����ͻ�����+���ڡ�');

		let work = new WorkService();
		let existing = await WorkOrderModel.getOne(orderId);
		if (!existing) this.AppError('���������ڻ���ȡ��');

		await work.cancelOrder(openId, orderId, reason);
		let line = `${existing.ORDER_DATE || ''} ${existing.ORDER_TIME || ''} ${existing.ORDER_TYPE_NAME || '����'}���ͻ�${existing.ORDER_CUSTOMER_NAME || ''}`.replace(/\s+/g, ' ').trim();
		let summary = `${staff.STAFF_NAME || 'Ա��'}ͨ��AIȡ��������${line}��ԭ��${reason}����¼ID��${orderId}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI������¼��ȡ������', summary);
		return {
			action: 'cancel_order',
			id: orderId,
			data: { orderId, reason },
			auditNoteId,
			reply: `��ȡ���������ڣ�${line}��ԭ��${reason}��`,
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
		if (!orderId) this.AppError('û���ҵ�Ҫ�޸ĵĶ��������ṩ����ID����ͻ�����+���ڡ�');

		let work = new WorkService();
		let existing = await WorkOrderModel.getOne(orderId);
		if (!existing) this.AppError('����������');

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

		if (!Object.keys(updates).length) this.AppError('���ṩҪ�޸ĵ��ֶΣ����ڡ�ʱ�䡢���͡��ͻ����ص㡢����ע����');

		let merged = Object.assign({}, existing, updates);
		let saved = await work.saveOrder(openId, merged);
		let changed = Object.keys(updates).map(k => `${k}��${updates[k]}`).join('��');
		let line = `${merged.ORDER_DATE || ''} ${merged.ORDER_TIME || ''} ${merged.ORDER_TYPE_NAME || '����'}���ͻ�${merged.ORDER_CUSTOMER_NAME || ''}`.replace(/\s+/g, ' ').trim();
		let summary = `${staff.STAFF_NAME || 'Ա��'}ͨ��AI�޸Ķ�����ID��${orderId}����${changed}���޸ĺ�${line}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI������¼���޸Ķ���', summary);
		return {
			action: 'update_order',
			id: orderId,
			data: { orderId, updates, order: merged },
			auditNoteId,
			reply: `���޸Ķ������ڣ�${line}���޸����ݣ�${changed}��`,
		};
	}

	_assertAgentAdmin(staff, actionName = '�ò���') {
		if (!this.isAdminStaff(staff)) this.AppError(`${actionName}��Ҫ����ԱȨ�ޣ����л�����Ա�˺Ż��ù���Ա������`);
	}

	_adminLikeFromStaff(staff = {}) {
		return {
			_id: staff._id || '',
			ADMIN_ID: staff.STAFF_ID || staff._id || '',
			ADMIN_NAME: staff.STAFF_NAME || '',
			STAFF_NAME: staff.STAFF_NAME || '',
			ADMIN_DESC: 'С�������Ա',
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
		return '��' + (value / 100).toFixed(2);
	}

	_boolInput(value, fieldName = '���') {
		if (value === true || value === 1 || value === '1') return true;
		if (value === false || value === 0 || value === '0') return false;
		let text = asText(value, 20);
		if (/^(true|yes|pass|ͨ��|ͬ��|��׼|���ͨ��)$/i.test(text)) return true;
		if (/^(false|no|fail|����|�ܾ�|��ͨ��|��˲�ͨ��)$/i.test(text)) return false;
		this.AppError(`����ȷ${fieldName}��ͨ�����ǲ�ͨ��`);
	}

	async _resolveStaffForAgent(staff, data = {}, allowSelf = true) {
		let staffId = asText(data.staffId || data.STAFF_ID || data.id || '', 120);
		let staffName = asText(data.staffName || data.name || data.STAFF_NAME || '', 80);
		if (!staffId && !staffName && allowSelf) return staff;
		if (!this.isAdminStaff(staff)) {
			if (staffId && staffId != staff._id && staffId != staff.STAFF_ID) this.AppError('��ͨԱ��ֻ�ܲ�ѯ�Լ�������');
			if (staffName && staffName != staff.STAFF_NAME) this.AppError('��ͨԱ��ֻ�ܲ�ѯ�Լ�������');
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
		if (!target) this.AppError('û���ҵ�ָ��Ա�������ṩ׼ȷԱ��������Ա��ID');
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
			if (params.staffId && params.staffId != staff._id && params.staffId != staff.STAFF_ID) this.AppError('��ͨԱ��ֻ�ܲ�ѯ�Լ����տ��¼');
			if (params.staffName && params.staffName != staff.STAFF_NAME) this.AppError('��ͨԱ��ֻ�ܲ�ѯ�Լ����տ��¼');
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
			reply: lines.length ? `�տ��¼���£�\n${lines.join('\n')}` : 'û�в鵽�����������տ��¼��',
		};
	}

	async _agentSavePayment(openId, staff, data = {}) {
		this._assertAgentAdmin(staff, '¼���տ�/�˿�/���');
		let orderId = asText(data.orderId || data.ORDER_ID || data.PAYMENT_ORDER_ID || '', 120);
		if (!orderId) this.AppError('¼���տ�ȱ�ٶ���ID�򶩵���');
		let amount = data.amount || data.PAYMENT_AMOUNT || data.paymentAmount;
		if (amount === undefined || amount === null || String(amount).trim() === '') this.AppError('¼���տ�ȱ�ٽ��');
		let type = asText(data.type || data.PAYMENT_TYPE || 'deposit', 40);
		let note = asText(data.note || data.remark || data.PAYMENT_NOTE || '', 200);
		if (/(refund|adjust|�˿�|���|����)/i.test(type) && !note) this.AppError('�˿�/���������дԭ���ע');

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
		let auditNoteId = await this._addAuditNote(openId, 'AI������¼��¼���տ�', `${staff.STAFF_NAME || '����Ա'}ͨ��AI¼���տ�/�˿�/���������${orderId}������${saved.PAYMENT_TYPE || type}�����${saved.PAYMENT_AMOUNT || amount}������${saved.PAYMENT_DATE || payment.PAYMENT_DATE}����ע��${note || '��'}`);
		return {
			action: 'save_payment',
			id: saved._id || saved.PAYMENT_ID || '',
			data: ret,
			auditNoteId,
			reply: `�Ѱ�����ԱȨ��¼���տ����${orderId}������${saved.PAYMENT_TYPE || type}�����${saved.PAYMENT_AMOUNT || amount}��`,
		};
	}

	async _agentVoidPayment(openId, staff, data = {}) {
		this._assertAgentAdmin(staff, '�����տ�');
		let paymentId = asText(data.paymentId || data.id || data.PAYMENT_ID || '', 120);
		let reason = asText(data.reason || data.note || '', 200);
		if (!paymentId) this.AppError('�����տ�ȱ���տ�ID');
		if (!reason) this.AppError('�����տ������дԭ��');
		let service = new WorkService();
		let ret = await service.voidAdminOrderPayment(paymentId, reason, staff);
		let auditNoteId = await this._addAuditNote(openId, 'AI������¼�������տ�', `${staff.STAFF_NAME || '����Ա'}ͨ��AI�����տ${paymentId}��ԭ��${reason}`);
		return {
			action: 'void_payment',
			id: paymentId,
			data: ret,
			auditNoteId,
			reply: `�Ѱ�����ԱȨ�������տ${paymentId}��ԭ��${reason}`,
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
			if (params.staffId && params.staffId != staff._id && params.staffId != staff.STAFF_ID) this.AppError('��ͨԱ��ֻ�ܲ�ѯ�Լ������');
			if (params.staffName && params.staffName != staff.STAFF_NAME) this.AppError('��ͨԱ��ֻ�ܲ�ѯ�Լ������');
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
			reply: lines.length ? `��ɼ�¼���£�\n${lines.join('\n')}` : 'û�в鵽������������ɼ�¼��',
		};
	}

	async _agentQueryPayroll(staff, data = {}) {
		let target = await this._resolveStaffForAgent(staff, data, true);
		let month = asText(data.month || this._currentMonth(), 20);
		let service = new WorkPayrollService();
		let ret = await service.getPayrollForStaff(target._id, month);
		let paid = ret.payrollList || ret.paidPayrolls || [];
		let reply = `${ret.staffName || target.STAFF_NAME || 'Ա��'} ${ret.month || month} ����Ԥ��������${this._centText(ret.totalCent)}����ǰ���${this._centText(ret.currentCent)}���ͷ�${this._centText(ret.releaseCent)}������${this._centText(ret.adjustCent)}���ۻ�${this._centText(ret.deductCent)}���ѷ����ʵ�${paid.length}����`;
		if (ret.legacyNeeded) reply = `${target.STAFF_NAME || 'Ա��'} ${month} ���ھɹ�������·ݣ���Ҫ������ڲ鿴/���š�`;
		return {
			action: 'query_payroll',
			data: ret,
			reply,
		};
	}

	async _agentPayPayroll(openId, staff, data = {}) {
		this._assertAgentAdmin(staff, '���Ź���');
		let month = asText(data.month || '', 20);
		if (!month) this.AppError('�����ʱ����ṩ�·�');
		if (!data.staffId && !data.STAFF_ID && !data.id && !data.staffName && !data.name && !data.STAFF_NAME) this.AppError('�����ʱ����ṩԱ��������Ա��ID');
		let target = await this._resolveStaffForAgent(staff, data, false);
		let service = new WorkPayrollService();
		let preview = await service.previewStaffMonth(target._id, month);
		if (preview.legacyNeeded) this.AppError('�л���ǰ�������߾ɷ������');
		let operator = {
			_id: staff._id,
			STAFF_ID: staff.STAFF_ID || staff._id,
			STAFF_NAME: staff.STAFF_NAME || '',
			source: 'ai_agent',
		};
		let ret = await service.payStaffMonth(target._id, month, preview.previewHash || '', operator, { note: asText(data.note || '', 200) });
		let auditNoteId = await this._addAuditNote(openId, 'AI������¼�����Ź���', `${staff.STAFF_NAME || '����Ա'}ͨ��AI���Ź��ʣ�${target.STAFF_NAME || target._id}���·�${month}�����${this._centText(preview.totalCent)}��`);
		return {
			action: 'pay_payroll',
			id: ret && (ret.payrollId || ret.id || ''),
			data: ret,
			auditNoteId,
			reply: `�Ѱ�����ԱȨ�޷��Ź��ʣ�${target.STAFF_NAME || ''} ${month}�����${this._centText(preview.totalCent)}��`,
		};
	}

	async _agentAuditOrder(openId, staff, data = {}) {
		this._assertAgentAdmin(staff, '��˶���');
		let orderId = asText(data.orderId || data.id || data.ORDER_ID || '', 120);
		if (!orderId) this.AppError('��˶���ȱ�ٶ���ID');
		let pass = this._boolInput(data.pass !== undefined ? data.pass : data.result, '��˽��');
		let reason = asText(data.reason || data.note || '', 200);
		let service = new AdminWorkService();
		let ret = await service.auditOrder(this._adminLikeFromStaff(staff), orderId, pass, reason, data.participants || null, Number(data.orderEditTime || 0));
		let auditNoteId = await this._addAuditNote(openId, 'AI������¼����˶���', `${staff.STAFF_NAME || '����Ա'}ͨ��AI��˶�����${orderId}�������${pass ? 'ͨ��' : '��ͨ��'}��˵����${reason || '��'}`);
		return {
			action: 'audit_order',
			id: orderId,
			data: ret,
			auditNoteId,
			reply: `�Ѱ�����ԱȨ����˶�����${pass ? 'ͨ��' : '��ͨ��'}��${reason ? '˵����' + reason : ''}`,
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
		if (!title) this.AppError('AI��������ȱ�ٱ���');
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
			this.AppError('������У��ʧ�ܣ�������');
		}
		let summary = `${staff.STAFF_NAME || 'Ա��'}ͨ��AI��������ڣ�${date} ${item.ITEM_TIME || ''}��${title}${item.ITEM_CONTENT ? '����ע��' + item.ITEM_CONTENT : ''}����¼ID��${ret.id}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI������¼�����������', summary);
		return {
			action: 'create_item',
			id: ret.id,
			data: { date, item },
			auditNoteId,
			reply: `����������ڣ�${date} ${item.ITEM_TIME || ''}��${title}����ͬ��д��ȫ��С�������ˮ��`,
		};
	}

	async _agentCreateRest(openId, staff, data = {}) {
		let date = this._cleanActionDate(data.date || data.REST_DATE);
		let rest = {
			REST_DATE: date,
			REST_TYPE: asText(data.type || data.restType || data.REST_TYPE || '��Ϣ', 40) || '��Ϣ',
			REST_REASON: asText(data.reason || data.REST_REASON || '', 300),
		};
		let work = new WorkService();
		let ret = await work.saveRest(openId, rest);
		let summary = `${staff.STAFF_NAME || 'Ա��'}ͨ��AI������Ϣ/������룺${date}��${rest.REST_TYPE}${rest.REST_REASON ? '��ԭ��' + rest.REST_REASON : ''}����¼ID��${ret.id}`;
		let auditNoteId = await this._addAuditNote(openId, 'AI������¼��������Ϣ����', summary);
		return {
			action: 'create_rest',
			id: ret.id,
			data: { date, rest },
			auditNoteId,
			reply: `������${rest.REST_TYPE}���룺${date}${rest.REST_REASON ? '��' + rest.REST_REASON : ''}����ͬ��д��ȫ��С�������ˮ��`,
		};
	}

	async _agentAddNote(openId, staff, data = {}) {
		let title = asText(data.title || data.NOTE_TITLE, 80);
		if (!title) this.AppError('AI����С��ȱ�ٱ���');
		let note = {
			NOTE_TYPE: (data.noteType || data.NOTE_TYPE) == 'personal' ? 'personal' : 'team',
			NOTE_TITLE: title,
			NOTE_CONTENT: asText(data.content || data.NOTE_CONTENT || '', 1000),
			NOTE_DATE: this._cleanActionDate(data.date || data.NOTE_DATE || timeUtil.time('Y-M-D'), false) || timeUtil.time('Y-M-D'),
		};
		let work = new WorkService();
		let ret = await work.saveNote(openId, note);
		let auditNoteId = '';
		if (note.NOTE_TYPE != 'team' || !title.startsWith('AI������¼')) {
			let summary = `${staff.STAFF_NAME || 'Ա��'}ͨ��AI����${note.NOTE_TYPE == 'team' ? '�Ŷ�' : '����'}С�ǣ�${title}����¼ID��${ret.id}`;
			auditNoteId = await this._addAuditNote(openId, 'AI������¼������С��', summary);
		}
		return {
			action: 'add_note',
			id: ret.id,
			data: { date: note.NOTE_DATE, note },
			auditNoteId,
			reply: `������${note.NOTE_TYPE == 'team' ? '�Ŷ�' : '����'}С�ǣ�${title}����ͬ��д��ȫ��С�������ˮ��`,
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
				timeout: 12000,
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
				if (err && err.message == 'AI request timeout') err.safeMessage = 'AI �ӿڳ�ʱ�����Ժ�����';
				else if (err && !err.safeMessage) err.safeMessage = 'AI �ӿ�����ʧ�ܣ�����������̨����';
				reject(err);
			});
			if (hasBody) req.write(body);
			req.end();
		});
	}

	_httpSafeMessage(statusCode, parsed) {
		let msg = '';
		if (parsed && parsed.error && parsed.error.message) msg = String(parsed.error.message);
		else if (parsed && typeof parsed.error == 'string') msg = parsed.error;
		else if (parsed && parsed.message) msg = String(parsed.message);
		else if (parsed && parsed.msg) msg = String(parsed.msg);
		if (statusCode == 401 || statusCode == 403) return 'AI �ӿڼ�Ȩʧ�ܣ����� API Key';
		if (statusCode == 404) return 'AI �ӿڵ�ַ��ģ�Ͳ����ڣ������̨����';
		if (statusCode == 429) return 'AI �ӿڶ�Ȼ�Ƶ�����ޣ����Ժ�����';
		if (statusCode >= 500) return 'AI �����ǰģ����ʱ�����ã����Ժ����ԣ�����������֣�����AI�����ﻻһ������ģ�͡�';
		if (/param|parameter|����/i.test(msg)) return 'AI �ӿڲ��������ݣ���ȷ�� Base URL �� OpenAI ���ݵ� /v1 ��ַ��ģ�� ID ��д��ȷ������Ǵ��ı�ģ�ͣ�ͼƬʶ��ģ���뵥����д֧�ֶ�ͼ��ģ�͡�';
		return msg ? ('AI �ӿڷ��ش���' + msg.slice(0, 120)) : 'AI �ӿڷ��ش��������̨����';
	}
}

module.exports = WorkAiService;
