/**
 * Notes: 云屿小猫 Agent 工具与技能注册表
 *
 * 这个文件只声明小猫可以理解和调度的受控业务能力；真正权限和写入仍在
 * WorkAiService / WorkService / 财务服务里做最终校验。
 */

const ACTIONS = {
	query_schedule: {
		title: '查询档期',
		schema: 'query_schedule.data: startDate(YYYY-MM-DD)、endDate、scope(all/mine/joined/created)。',
		desc: '查询订单档期、事项、小记。日期不明确时先追问。',
	},
	create_order: {
		title: '新增单条订单档期',
		schema: 'create_order.data: date(必填)、customerName(必填)、time、endTime、typeName、typeId、customerMobile、source、place、content、amount、deposit、final、extra、participants[]。',
		desc: '用户明确要新增/录入一条订单时使用。',
	},
	create_orders: {
		title: '批量新增订单档期',
		schema: 'create_orders.data: orders[]（2条及以上必须用create_orders）。',
		desc: '截图或文字里包含多条订单时使用，逐条保留来源信息。',
	},
	join_order: {
		title: '加入订单参与人',
		schema: 'join_order.data: orderId、roleName。',
		desc: '当前员工要求加入某个订单参与人时使用。',
	},
	cancel_order: {
		title: '取消订单',
		schema: 'cancel_order.data: orderId(或customerName+date)、reason。',
		desc: '用户明确要求取消/删除/撤销订单时使用，必须能唯一定位对象。',
	},
	update_order: {
		title: '修改订单',
		schema: 'update_order.data: orderId(或customerName+date作为查找条件)、newDate(新日期)、newTime、newType、newCustomerName、newPlace、newAmount、newContent。只传要修改的字段。',
		desc: '改期、更正客户/类型/地点/金额等订单字段时使用。',
	},
	create_item: {
		title: '新增事项档期',
		schema: 'create_item.data: date(必填)、title(必填)、time、content。',
		desc: '非订单的待办、提醒、拍摄事项用这个动作。',
	},
	create_rest: {
		title: '新增休息申请',
		schema: 'create_rest.data: date(必填)、type(休息/请假/调休/外出)、reason。',
		desc: '员工请假、休息、调休、外出时使用。',
	},
	add_note: {
		title: '新增小记',
		schema: 'add_note.data: noteType(team/personal)、title(必填)、content、date。',
		desc: '记录跟进、复盘、提醒、团队说明。',
	},
	query_payments: {
		title: '查询收款',
		schema: 'query_payments.data: month、keyword、orderId、type、direction、status、size。',
		desc: '查询收款/退款/冲减明细。普通员工只看自己相关数据，管理员可查全店。',
	},
	save_payment: {
		title: '录入收款/退款/冲减',
		schema: 'save_payment.data: orderId(必填)、type(deposit/final/extra/product/supplement/refund/adjust或中文)、amount(必填)、date、baseType、note、refPaymentId。退款/冲减必须写原因note。',
		desc: '只有明确已收/已退/已冲减且能定位订单时使用。',
	},
	void_payment: {
		title: '作废收款',
		schema: 'void_payment.data: paymentId(必填)、reason(必填)。',
		desc: '作废已有收款记录，必须有 paymentId 和原因。',
	},
	query_commissions: {
		title: '查询提成',
		schema: 'query_commissions.data: month、staffId/staffName、orderId、paymentId、kind、status、keyword、size。',
		desc: '查询提成明细，权限由后台校验。',
	},
	query_payroll: {
		title: '查询工资',
		schema: 'query_payroll.data: month、staffId/staffName；普通员工默认查自己，管理员可查指定员工。',
		desc: '查询工资预览或发放状态。',
	},
	pay_payroll: {
		title: '发放工资',
		schema: 'pay_payroll.data: month(必填)、staffId/staffName(必填)、note；只有管理员可发工资，系统会按当前预览哈希校验后发放。',
		desc: '高风险动作，必须对象和月份明确。',
	},
	audit_order: {
		title: '审核订单',
		schema: 'audit_order.data: orderId(必填)、pass(true/false)、reason、participants、orderEditTime。',
		desc: '管理员审核订单时使用，必须有订单对象。',
	},
	none: {
		title: '追问/不执行',
		schema: 'none.data: {}。',
		desc: '信息不足、对象不唯一、金额/方向不清、动作越界时使用。',
	},
};

const SKILLS = [
	{
		key: 'schedule_query',
		title: '档期查询',
		triggers: /(档期|日程|安排|今天|明天|后天|昨天|下周|这周|本周|什么时候|有空|忙不忙)/,
		queryTypes: ['query'],
		actions: ['query_schedule'],
		prompts: [
			'查询档期时优先明确起止日期；用户说今天/明天/后天/昨天时按当前日期换算。',
			'超过14天的大范围查询要缩小范围或追问。',
		],
	},
	{
		key: 'order_intake',
		title: '订单录入',
		triggers: /(新增|记录|登记|录入|创建|添加|安排|约拍|预约|客户|订单|拍摄|写真|证件照|婚礼|宝宝宴|生日宴|求婚|订婚)/,
		queryTypes: ['write'],
		actions: ['create_order', 'create_orders', 'query_schedule'],
		prompts: [
			'新增订单必须有日期和客户名称；时间、类型、地点、电话、金额没有就留空或追问。',
			'金额识别要区分应收/套餐价和实收/到账。',
		],
	},
	{
		key: 'image_order_intake',
		title: '图片识别录单',
		triggers: /(截图|图片|识别|照片|聊天记录|红包|转账|收款截图|订单截图|漏了|补录)/,
		queryTypes: ['complex'],
		image: true,
		actions: ['create_order', 'create_orders', 'save_payment', 'query_schedule'],
		prompts: [
			'带图时先判断图片类型，再决定是订单、收款、财务信息还是无关图片。',
			'多张图必须逐张独立读取日期和客户，不要把后一张图的日期套到前一张。',
		],
	},
	{
		key: 'date_correction',
		title: '改期纠错',
		triggers: /(修改|更改|更正|调整|改期|改到|调到|换到|移到|挪到|记错|应该是|正确是|实际是|取消|删除|撤销)/,
		queryTypes: ['write'],
		actions: ['update_order', 'cancel_order', 'query_schedule'],
		prompts: [
			'改期优先用 update_order；找不到明确原订单时先 query_schedule 或 none 追问。',
			'取消订单必须能唯一定位对象，并且要有原因。',
		],
	},
	{
		key: 'finance_admin',
		title: '收款与财务',
		triggers: /(收款|退款|冲减|作废|付款|支付|转账|红包|到账|已收|实收|定金|尾款|补款|财务|流水|明细)/,
		queryTypes: ['query', 'write'],
		actions: ['query_payments', 'save_payment', 'void_payment'],
		prompts: [
			'财务写入必须明确订单、金额、方向和日期；方向不清时不要执行。',
			'退款、冲减、作废必须有原因。',
		],
	},
	{
		key: 'payroll_audit',
		title: '提成工资审核',
		triggers: /(提成|工资|发工资|薪资|结算|审核|通过|不通过|冻结|释放|扣回)/,
		queryTypes: ['query', 'write'],
		actions: ['query_commissions', 'query_payroll', 'pay_payroll', 'audit_order'],
		prompts: [
			'提成、工资、审核属于高风险能力，生成动作参数后由后台权限校验。',
			'发工资、审核不通过必须对象、月份/订单和说明明确。',
		],
	},
	{
		key: 'note_task',
		title: '小记与事项',
		triggers: /(小记|备注|记录一下|跟进|提醒|待办|事项|任务|复盘|客户回访|话术)/,
		queryTypes: ['write'],
		actions: ['add_note', 'create_item'],
		prompts: [
			'客户跟进、复盘和提醒优先沉淀为小记或事项。',
			'事项需要日期；纯文字沉淀可用小记。',
		],
	},
	{
		key: 'rest_request',
		title: '休息请假',
		triggers: /(休息|请假|调休|外出|请个假|请一天|放假)/,
		queryTypes: ['write'],
		actions: ['create_rest'],
		prompts: [
			'休息/请假必须有日期；没有日期先追问。',
		],
	},
	{
		key: 'customer_followup',
		title: '客户跟进',
		triggers: /(客户|跟进|回访|成交|报价|套餐|话术|怎么说|发什么|回复|邀约)/,
		queryTypes: ['chat', 'explain'],
		actions: ['add_note'],
		prompts: [
			'客户跟进建议要贴合县城摄影店语境，真诚、具体、能直接发给客户。',
			'如果用户要求记录跟进结果，可用 add_note。',
		],
	},
	{
		key: 'knowledge_qa',
		title: '小程序知识问答',
		triggers: /(功能|怎么用|能做什么|小程序|帮助|入口|设置|配置|权限|模型|API|Key|AI|小猫)/i,
		queryTypes: ['chat', 'explain'],
		actions: ['none'],
		prompts: [
			'解释功能时只能基于系统已知能力，不编造不存在的页面或按钮。',
			'遇到配置类问题要提醒 API Key 不会放到小程序前端。',
		],
	},
];

const WRITE_ACTIONS = {
	create_order: true,
	create_orders: true,
	join_order: true,
	cancel_order: true,
	update_order: true,
	create_item: true,
	create_rest: true,
	add_note: true,
	save_payment: true,
	void_payment: true,
	pay_payroll: true,
	audit_order: true,
};

const HIGH_RISK_ACTIONS = {
	cancel_order: true,
	save_payment: true,
	void_payment: true,
	pay_payroll: true,
	audit_order: true,
};

function unique(list) {
	let seen = {};
	let out = [];
	for (let item of list || []) {
		if (!item || seen[item]) continue;
		seen[item] = true;
		out.push(item);
	}
	return out;
}

function findSkill(key) {
	return SKILLS.find(item => item.key == key);
}

function addSkill(keys, key) {
	if (!key || keys.includes(key) || !findSkill(key)) return;
	keys.push(key);
}

function selectSkills(message = '', queryType = 'chat', hasImages = false) {
	let text = String(message || '');
	let keys = [];

	if (hasImages) addSkill(keys, 'image_order_intake');

	for (let skill of SKILLS) {
		let matchText = skill.triggers && skill.triggers.test(text);
		let matchImage = hasImages && skill.image;
		if (matchText || matchImage) addSkill(keys, skill.key);
	}

	if (queryType == 'write' && !keys.length) addSkill(keys, 'order_intake');
	if (queryType == 'query' && !keys.length) addSkill(keys, 'schedule_query');
	if (queryType == 'complex') addSkill(keys, hasImages ? 'image_order_intake' : 'order_intake');
	if (queryType == 'explain') addSkill(keys, 'knowledge_qa');
	if (!keys.length) addSkill(keys, queryType == 'chat' ? 'customer_followup' : 'knowledge_qa');

	// Keep the prompt compact but include knowledge safety for most business rounds.
	if (!keys.includes('knowledge_qa') && keys.length < 6 && /(功能|权限|配置|API|模型|小程序|帮助|AI|Key)/i.test(text)) {
		addSkill(keys, 'knowledge_qa');
	}

	return keys.map(findSkill).filter(Boolean).slice(0, 6);
}

function allowedActionsForSkills(skills = [], queryType = '') {
	let actions = [];
	for (let skill of skills) {
		for (let action of skill.actions || []) actions.push(action);
	}
	actions.push('none');
	actions = unique(actions).filter(action => ACTIONS[action]);
	if (queryType == 'query') actions = actions.filter(action => !WRITE_ACTIONS[action] || action == 'none');
	return actions;
}

function normalizeActionList(actions = []) {
	return unique(actions).filter(action => ACTIONS[action] || action == 'create_note');
}

function buildSkillPrompt(skills = []) {
	if (!skills.length) return '';
	let lines = [
		'本轮启用的小猫技能：',
	];
	for (let skill of skills) {
		lines.push('- ' + skill.title + '：' + (skill.prompts || []).join('；'));
	}
	return lines.join('\n');
}

function buildToolPrompt(skills = [], queryType = '') {
	let actions = allowedActionsForSkills(skills, queryType);
	return [
		'你也是云屿摄影小程序内的受控执行型业务智能体。',
		'本轮只允许这些动作：' + actions.join('、') + '。',
		'权限原则：不要因为动作敏感就直接拒绝；先按当前登录账号生成最准确的动作参数，后台会按员工/管理员权限拦截。',
		'破坏性动作约束：取消订单、作废收款、发工资、审核不通过必须有明确对象ID或唯一可定位对象，并有原因/说明；不能用模糊描述批量执行。',
		'禁止编造订单ID、客户名、金额、收款状态、员工身份；缺少关键字段用none追问。',
		'严禁幻觉：如果你返回none动作，reply里绝不能说"已修改/已帮你/已完成/已处理/已执行"等成功表述。',
		'动作JSON格式：{"action":"...","reply":"...","data":{...}}。',
	].join('\n');
}

function buildWriteActionPrompt(skills = [], queryType = '') {
	let actions = allowedActionsForSkills(skills, queryType);
	let lines = [];
	for (let action of actions) {
		if (ACTIONS[action] && ACTIONS[action].schema) lines.push(ACTIONS[action].schema);
	}
	lines.push('缺少日期、客户名称、对象ID、金额方向或唯一对象时用none追问。');
	lines.push('写入动作系统自动追加审查小记和Agent审计流水。');
	return lines.join('\n');
}

function getPublicCatalog() {
	let actionList = Object.keys(ACTIONS).map(key => {
		let action = ACTIONS[key] || {};
		let isWrite = !!WRITE_ACTIONS[key];
		let riskLevel = HIGH_RISK_ACTIONS[key] ? 'high' : (isWrite ? 'medium' : 'low');
		return {
			key,
			title: action.title || key,
			desc: action.desc || '',
			isWrite,
			riskLevel,
		};
	});

	let actionMap = {};
	for (let action of actionList) actionMap[action.key] = action;

	let skillList = SKILLS.map(skill => {
		let actions = (skill.actions || []).filter(action => ACTIONS[action]);
		return {
			key: skill.key,
			title: skill.title,
			queryTypes: skill.queryTypes || [],
			image: !!skill.image,
			actions,
			actionTitles: actions.map(action => actionMap[action] ? actionMap[action].title : action),
			actionTitleText: actions.map(action => actionMap[action] ? actionMap[action].title : action).join('、'),
			writeCount: actions.filter(action => actionMap[action] && actionMap[action].isWrite).length,
			highRiskCount: actions.filter(action => actionMap[action] && actionMap[action].riskLevel == 'high').length,
		};
	});

	return {
		skills: skillList,
		actions: actionList,
		stats: {
			skillCount: skillList.length,
			actionCount: actionList.length,
			writeActionCount: actionList.filter(action => action.isWrite).length,
			highRiskActionCount: actionList.filter(action => action.riskLevel == 'high').length,
		},
	};
}

module.exports = {
	ACTIONS,
	SKILLS,
	ALL_ACTIONS: Object.keys(ACTIONS),
	selectSkills,
	allowedActionsForSkills,
	normalizeActionList,
	buildSkillPrompt,
	buildToolPrompt,
	buildWriteActionPrompt,
	getPublicCatalog,
};
