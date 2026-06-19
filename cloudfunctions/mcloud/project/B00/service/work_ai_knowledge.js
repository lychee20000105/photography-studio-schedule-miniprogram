/**
 * AI 知识库检索服务 (Phase 4: 免费关键词方案)
 * 在云函数侧为 AI 提供知识检索，注入系统提示词
 */

const KNOWLEDGE_BASE = [
	{
		id: 'pricing_wedding',
		category: 'pricing',
		keywords: ['婚礼', '跟拍', '婚庆', '结婚', '婚纱'],
		content: '婚礼跟拍：全天跟拍+精修+底片全送。可选花絮/航拍/双机位。定金30%-50%锁定档期。',
	},
	{
		id: 'pricing_portrait',
		category: 'pricing',
		keywords: ['写真', '外景', '个人', '情侣', '闺蜜', '全家福'],
		content: '外景写真：1-2套服装+精修+底片。可选棚拍/妆造。提前3-7天预约。',
	},
	{
		id: 'pricing_commercial',
		category: 'pricing',
		keywords: ['商拍', '商业', '产品', '企业', '宣传'],
		content: '商业拍摄：产品/团队/宣传视频，按项目报价，预付50%。',
	},
	{
		id: 'pricing_event',
		category: 'pricing',
		keywords: ['活动', '百日宴', '生日', '派对'],
		content: '活动跟拍：现场记录+精修。提前3天预约。',
	},
	{
		id: 'faq_booking',
		category: 'faq',
		keywords: ['预约', '档期', '怎么约', '如何预约'],
		content: '预约：确认类型日期→定金锁档→拍前沟通→当天到场。',
	},
	{
		id: 'faq_payment',
		category: 'faq',
		keywords: ['付款', '定金', '尾款', '价格', '费用', '多少钱'],
		content: '定金30-50%锁档，尾款当天结清。支持微信/支付宝/银行转账。',
	},
	{
		id: 'faq_delivery',
		category: 'faq',
		keywords: ['交付', '精修', '底片', '出片', '多久'],
		content: '精修7-15个工作日交付，底片全送。可加急。网盘或U盘交付。',
	},
	{
		id: 'workflow_prep',
		category: 'workflow',
		keywords: ['准备', '拍前', '清单', '确认'],
		content: '拍前确认：日期时间地点、类型风格、服装造型、特殊需求、天气备选、定金确认。',
	},
	{
		id: 'sales_followup',
		category: 'sales',
		keywords: ['跟进', '追单', '回访', '客户维护'],
		content: '跟进节奏：拍后3天样片→7天选片→15天满意度→30天转介绍。',
	},
];

function retrieveKnowledge(query, maxResults = 3) {
	query = String(query || '').trim();
	if (!query) return [];
	let scored = [];
	for (let entry of KNOWLEDGE_BASE) {
		let score = 0;
		for (let kw of entry.keywords) {
			if (query.includes(kw)) score += 10;
		}
		if (score > 0) scored.push({ entry, score });
	}
	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, maxResults).map(item => item.entry);
}

function formatKnowledgeForSystem(entries) {
	if (!entries || !entries.length) return '';
	return '相关知识：' + entries.map(e => e.content).join('；');
}

module.exports = {
	KNOWLEDGE_BASE,
	retrieveKnowledge,
	formatKnowledgeForSystem,
};
