/**
 * 知识库关键词检索助手 (Phase 4: 免费方案)
 * 使用本地关键词匹配代替向量检索
 */

const KNOWLEDGE_ENTRIES = [
	{
		id: 'pricing_wedding',
		category: 'pricing',
		keywords: ['婚礼', '跟拍', '婚庆', '结婚', '婚纱', '婚礼摄影', '婚礼摄像'],
		title: '婚礼跟拍服务',
		content: '婚礼跟拍包含全天跟拍、精修交付、底片全送。可选拍前花絮、航拍、双机位。定金30%-50%预约档期，尾款拍摄当天结清。',
	},
	{
		id: 'pricing_portrait',
		category: 'pricing',
		keywords: ['写真', '外景', '个人写真', '情侣写真', '闺蜜写真', '全家福'],
		title: '写真拍摄服务',
		content: '外景写真含1-2套服装、精修交付、底片全送。可选室内棚拍、妆造服务。提前3-7天预约，定金确认档期。',
	},
	{
		id: 'pricing_commercial',
		category: 'pricing',
		keywords: ['商拍', '商业', '产品', '企业', '团队', '宣传', '商业拍摄'],
		title: '商业拍摄服务',
		content: '商业拍摄含产品摄影、企业团队照、宣传视频。按项目报价，可签合同开票。预付50%启动。',
	},
	{
		id: 'pricing_event',
		category: 'pricing',
		keywords: ['活动', '跟拍', '百日宴', '生日', '派对', '活动跟拍'],
		title: '活动跟拍服务',
		content: '活动跟拍含现场记录、精修交付。百日宴、生日派对、企业年会等均可。提前3天预约。',
	},
	{
		id: 'faq_booking',
		category: 'faq',
		keywords: ['预约', '订', '档期', '时间', '怎么约', '如何预约', '能约'],
		title: '如何预约拍摄',
		content: '预约流程：1.确认拍摄类型和日期 2.支付定金锁定档期 3.拍摄前1-3天沟通细节 4.拍摄当天到场。可通过小程序或联系客服预约。',
	},
	{
		id: 'faq_payment',
		category: 'faq',
		keywords: ['付款', '支付', '定金', '尾款', '多少钱', '价格', '费用', '报价'],
		title: '付款与价格',
		content: '定金30%-50%预约档期，尾款拍摄当天结清。支持微信、支付宝、银行转账。具体价格根据拍摄类型和套餐不同，请咨询客服获取详细报价。',
	},
	{
		id: 'faq_delivery',
		category: 'faq',
		keywords: ['交付', '多久', '照片', '精修', '底片', '出片', '修图'],
		title: '交付周期',
		content: '精修照片一般7-15个工作日交付，底片全送。加急可协商。成品通过网盘或U盘交付。',
	},
	{
		id: 'faq_cancel',
		category: 'faq',
		keywords: ['取消', '退', '改期', '退款', '不拍了'],
		title: '取消与改期政策',
		content: '拍摄前7天可免费改期一次。拍摄前3天取消扣定金50%。拍摄当天取消不退定金。特殊情况可协商。',
	},
	{
		id: 'workflow_prep',
		category: 'workflow',
		keywords: ['准备', '拍前', '清单', '确认', '沟通'],
		title: '拍前确认清单',
		content: '拍摄前确认：1.日期时间地点 2.拍摄类型和风格 3.服装造型方案 4.特殊需求备注 5.天气备选方案(外景) 6.定金到账确认。',
	},
	{
		id: 'workflow_delivery',
		category: 'workflow',
		keywords: ['后期', '修图', '选片', '交付标准', '质量'],
		title: '后期交付标准',
		content: '精修标准：肤色统一、光影优化、瑕疵处理、构图裁切。不包含大幅瘦脸、换背景等重度修图。选片后7-15个工作日交付。',
	},
	{
		id: 'sales_followup',
		category: 'sales',
		keywords: ['跟进', '追单', '回访', '客户', '维护'],
		title: '客户跟进话术',
		content: '跟进节奏：拍摄后3天发送样片 → 7天询问选片 → 15天回访满意度 → 30天推荐转介绍。话术重点：真诚关心、不打扰、提供价值。',
	},
	{
		id: 'sales_referral',
		category: 'sales',
		keywords: ['转介绍', '推荐', '老带新', '优惠'],
		title: '转介绍激励',
		content: '老客户推荐新客户成功下单，老客户可获赠精修加片或下次拍摄折扣。新客户享首次预约优惠。',
	},
];

let _cache = {};
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function retrieveKnowledge(query, maxEntries = 3) {
	query = String(query || '').trim();
	if (!query) return [];

	let now = Date.now();
	if (now - _cacheTime < CACHE_TTL && _cache[query]) return _cache[query];

	let scored = [];
	for (let entry of KNOWLEDGE_ENTRIES) {
		let score = 0;
		for (let kw of entry.keywords) {
			if (query.includes(kw)) score += 10;
		}
		if (query.includes(entry.title)) score += 15;
		if (score > 0) scored.push({ entry, score });
	}

	scored.sort((a, b) => b.score - a.score);
	let result = scored.slice(0, maxEntries).map(item => item.entry);

	_cache[query] = result;
	_cacheTime = now;
	return result;
}

function formatKnowledgeForPrompt(entries) {
	if (!entries || !entries.length) return '';
	return entries.map(e => `[${e.title}] ${e.content}`).join('\n');
}

function clearCache() {
	_cache = {};
	_cacheTime = 0;
}

module.exports = {
	KNOWLEDGE_ENTRIES,
	retrieveKnowledge,
	formatKnowledgeForPrompt,
	clearCache,
};
