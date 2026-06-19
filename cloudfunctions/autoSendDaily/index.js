const cloud = require('wx-server-sdk');
const https = require('https');

const CLOUD_ID = process.env.CLOUD_ID || 'yunyukeji-d4g7waei5d5d6cdeb';
const PROJECT_ID = process.env.PROJECT_ID || 'B00';
const WECOM_WEBHOOK_URL = process.env.WECOM_WEBHOOK_URL || '';
const SETUP_WECOM_WEBHOOK_URL = 'SETUP_WECOM_WEBHOOK_URL';
const WECOM_WEBHOOK_PREFIX = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=';

cloud.init({
	env: CLOUD_ID
});

const db = cloud.database();

exports.main = async event => {
	const day = event && event.day ? event.day : getChinaDay();
	const webhookUrl = await getWebhookUrl();

	if (!webhookUrl) {
		console.error('WECOM_WEBHOOK_URL is empty');
		return {
			code: -1,
			message: '未配置企业微信群机器人 Webhook，请在后台“企业微信机器人”中填写'
		};
	}
	if (!isValidWecomWebhookUrl(webhookUrl)) {
		console.error('WECOM_WEBHOOK_URL is invalid');
		return {
			code: -1,
			message: '企业微信群机器人 Webhook 配置无效，请填写企业微信机器人生成的 Webhook 地址'
		};
	}

	try {
		const joins = await getDailyJoins(day);
		const markdown = formatDailyMarkdown(day, joins);
		const sendResult = await sendWecomMarkdown(webhookUrl, markdown);

		return {
			code: 0,
			day,
			count: joins.length,
			wecom: sendResult
		};
	} catch (err) {
		console.error('autoSendDaily failed', err);
		return {
			code: -1,
			day,
			message: err.message
		};
	}
};

async function getWebhookUrl() {
	const savedUrl = await getSavedWebhookUrl();
	return savedUrl || WECOM_WEBHOOK_URL.trim();
}

async function getSavedWebhookUrl() {
	try {
		let res = await db.collection('bx_setup')
			.where({
				_pid: PROJECT_ID,
				SETUP_KEY: SETUP_WECOM_WEBHOOK_URL
			})
			.limit(1)
			.get();

		let saved = pickSetupValue(res);
		if (saved) return saved;

		res = await db.collection('bx_setup')
			.where({
				SETUP_KEY: SETUP_WECOM_WEBHOOK_URL
			})
			.limit(1)
			.get();

		return pickSetupValue(res);
	} catch (err) {
		console.warn('read saved wecom webhook failed', err);
		return '';
	}
}

function pickSetupValue(res) {
	const row = res && res.data && res.data[0];
	if (!row || !row.SETUP_VALUE) return '';
	const val = row.SETUP_VALUE.val;
	return typeof val === 'string' ? val.trim() : '';
}

function isValidWecomWebhookUrl(url) {
	if (typeof url !== 'string') return false;
	const value = url.trim();
	if (!value.startsWith(WECOM_WEBHOOK_PREFIX)) return false;

	try {
		const parsed = new URL(value);
		return parsed.protocol === 'https:'
			&& parsed.hostname === 'qyapi.weixin.qq.com'
			&& parsed.pathname === '/cgi-bin/webhook/send'
			&& !!parsed.searchParams.get('key');
	} catch (err) {
		return false;
	}
}

async function getDailyJoins(day) {
	let all = [];
	let skip = 0;
	const limit = 100;

	while (true) {
		const res = await db.collection('bx_join')
			.where({
				_pid: PROJECT_ID,
				JOIN_MEET_DAY: day,
				JOIN_STATUS: 1
			})
			.orderBy('JOIN_MEET_TIME_START', 'asc')
			.orderBy('JOIN_ADD_TIME', 'asc')
			.skip(skip)
			.limit(limit)
			.get();

		const list = res.data || [];
		all = all.concat(list);
		if (list.length < limit) break;
		skip += limit;
	}

	return all;
}

function formatDailyMarkdown(day, joins) {
	const title = `云屿摄影今日档期（${day}）`;
	if (!joins.length) {
		return `## ${title}\n\n今天暂无已记录档期。`;
	}

	let lines = [`## ${title}`, `共 ${joins.length} 单，团队请按时间核对。`, ''];
	joins.forEach((join, idx) => {
		const forms = formsToObject(join.JOIN_FORMS || []);
		const timeText = formatTime(join);
		const customer = pick(forms, ['客户姓名', '姓名', '联系人']) || '未填客户';
		const phone = pick(forms, ['联系电话', '手机', '手机号']) || '';
		const location = pick(forms, ['拍摄地点', '地点', '地址']) || '地点未填';
		const amount = pick(forms, ['订单金额', '金额']) || '';
		const deposit = pick(forms, ['已收定金', '定金']) || '';
		const progress = pick(forms, ['后期进度', '进度']) || '';
		const note = pick(forms, ['备注', '说明']) || '';
		const status = getJoinStatusText(join.JOIN_STATUS);

		lines.push(`${idx + 1}. **${timeText}｜${join.JOIN_MEET_TITLE || '拍摄档期'}**`);
		lines.push(`   客户：${customer}${phone ? `（${phone}）` : ''}`);
		lines.push(`   地点：${location}`);
		if (amount || deposit) lines.push(`   金额：${amount || '-'} / 定金：${deposit || '-'}`);
		if (progress) lines.push(`   进度：${progress}`);
		if (status !== '预约成功') lines.push(`   状态：${status}`);
		if (note) lines.push(`   备注：${note}`);
	});

	lines.push('');
	lines.push('请前台、摄影、摄像、化妆、销售和运营同步核对。');

	return lines.join('\n');
}

function formatTime(join) {
	const start = join.JOIN_MEET_TIME_START || '';
	const end = join.JOIN_MEET_TIME_END || '';
	if (start && end && start !== end) return `${start}-${end}`;
	if (start) return start;
	return '全天';
}

function formsToObject(forms) {
	let obj = {};
	for (const form of forms) {
		if (!form || !form.title) continue;
		if (form.type === 'image' || form.type === 'content') continue;
		let val = Array.isArray(form.val) ? form.val.join('、') : form.val;
		if (val === undefined || val === null) val = '';
		obj[form.title] = String(val).trim();
	}
	return obj;
}

function pick(obj, keys) {
	for (const key of keys) {
		if (obj[key]) return obj[key];
	}
	return '';
}

function getJoinStatusText(status) {
	switch (status) {
		case 1:
			return '预约成功';
		case 10:
			return '已取消';
		case 99:
			return '后台取消';
		default:
			return String(status || '');
	}
}

function getChinaDay() {
	const now = new Date();
	const utc = now.getTime() + now.getTimezoneOffset() * 60000;
	const china = new Date(utc + 8 * 60 * 60000);
	return china.toISOString().slice(0, 10);
}

function sendWecomMarkdown(webhookUrl, content) {
	return postJson(webhookUrl, {
		msgtype: 'markdown',
		markdown: {
			content
		}
	});
}

function postJson(url, data) {
	return new Promise((resolve, reject) => {
		const body = JSON.stringify(data);
		const req = https.request(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body)
			},
			timeout: 15000
		}, res => {
			let chunks = '';
			res.setEncoding('utf8');
			res.on('data', chunk => {
				chunks += chunk;
			});
			res.on('end', () => {
				let parsed = {};
				try {
					parsed = JSON.parse(chunks || '{}');
				} catch (e) {
					parsed = {
						raw: chunks
					};
				}
				if (res.statusCode >= 200 && res.statusCode < 300 && parsed.errcode === 0) {
					resolve(parsed);
				} else {
					reject(new Error(`WeCom HTTP ${res.statusCode}: ${chunks}`));
				}
			});
		});

		req.on('timeout', () => {
			req.destroy(new Error('WeCom request timeout'));
		});
		req.on('error', reject);
		req.write(body);
		req.end();
	});
}
