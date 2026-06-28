/**
 * 前端文件编码修复
 * 1. work_admin_ai.wxml: 修复 40 个 U+FFFD 乱码（中文尾部截断）+ 去 BOM
 * 2. work_admin_ai.js / .wxss: 去 UTF-8 BOM
 *
 * 用 Node.js 读写，确保 UTF-8 无 BOM，规避 PowerShell 编码污染。
 */
const fs = require('fs');

const DIR = 'D:/yunyu-repo/miniprogram/projects/B00/pages/work/admin_ai/';

// wxml 乱码修复映射（基于完整上下文人工还原）
// 模式：乱码处原文是中文字符被截断成 �?（U+FFFD + ?），还原正确中文
const wxmlFixes = [
	// [乱码片段, 正确文本]
	['加载\uFFFD?..', '加载中...'],
	['AI 小助手配\uFFFD?/view>', 'AI 小助手配置</view>'],
	['不会\uFFFD?API Key 放进小程序前端\uFFFD?/view>', '不会把 API Key 放进小程序前端。</view>'],
	['<view class="section-title">供应\uFFFD?/view>', '<view class="section-title">供应商</view>'],
	['点编辑可\uFFFD?Base URL、模型和 Key\uFFFD?/view>', '点编辑可填 Base URL、模型和 Key。</view>'],
	['bindtap="bindProviderAddTap">\uFFFD?/button>', 'bindtap="bindProviderAddTap">+</button>'],
	['class="provider-tag">待保\uFFFD?Key</text>', 'class="provider-tag">待保存 Key</text>'],
	["'编辑供应\uFFFD?':'新增供应\uFFFD?}}", "'编辑供应商':'新增供应商'}}"],
	['<view class="label">供应商名\uFFFD?/view>', '<view class="label">供应商名称</view>'],
	['placeholder="例如：公司专用账\uFFFD? />', 'placeholder="例如：公司专用账号" />'],
	['留空则不修改当前已保\uFFFD?Key；填写后点“应用到当前配置”，再点页面底部“保存配置”\uFFFD?/view>', '留空则不修改当前已保存 Key；填写后点“应用到当前配置”，再点页面底部“保存配置”。</view>'],
	['<text class="arrow">\uFFFD?/text>', '<text class="arrow">▾</text>'],  // 下拉箭头（共3处）
	['mimo 等模\uFFFD?ID', 'mimo 等模型 ID'],
	['知道模型 ID 就能直接填写\uFFFD?/view>', '知道模型 ID 就能直接填写。</view>'],
	['视觉地址和视\uFFFD?Key 留空时，会沿用上面的接口地址\uFFFD?Key\uFFFD?/view>', '视觉地址和视觉 Key 留空时，会沿用上面的接口地址和 Key。</view>'],
	['placeholder="留空沿用\uFFFD?Base URL"', 'placeholder="留空沿用文本 Base URL"'],
	["'获取\uFFFD?':'获取列表'", "'获取中':'获取列表'"],
	['留空沿用文本模\uFFFD? />', '留空沿用文本模型。" />'],
	['要读图就填一个支持图片的兼容模型\uFFFD?/view>', '要读图就填一个支持图片的兼容模型。</view>'],
	['成交适合客户跟进\uFFFD?/view>', '成交适合客户跟进。</view>'],
	['<view class="label">最大回\uFFFD?/view>', '<view class="label">最大回复</view>'],
	['<view class="label">系统提示\uFFFD?/view>', '<view class="label">系统提示词</view>'],
	['怎么回答、不能做什\uFFFD?></textarea>', '怎么回答、不能做什么。</textarea>'],
	['不要写 API Key、手机号、客户隐私或一次性聊天内容\uFFFD?></textarea>', '不要写 API Key、手机号、客户隐私或一次性聊天内容。</textarea>'],
	['真实订单、金额、收款、工资和审核仍以后台数据为准\uFFFD?/view>', '真实订单、金额、收款、工资和审核仍以后台数据为准。</view>'],
	['字段完整度和审计规则校验\uFFFD?/view>', '字段完整度和审计规则校验后写入。</view>'],
	['<view class="stat-label">技\uFFFD?/view>', '<view class="stat-label">技能</view>'],
	['<view class="stat-label">高风\uFFFD?/view>', '<view class="stat-label">高风险</view>'],
	['class="badge danger">高风\uFFFD?{{item.highRiskCount}}', 'class="badge danger">高风险 {{item.highRiskCount}}'],
];

function stripBOM(buf) {
	if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
		return buf.slice(3);
	}
	return buf;
}

// 1. 修复 wxml
console.log('===== 修复 work_admin_ai.wxml =====');
let wxmlBuf = fs.readFileSync(DIR + 'work_admin_ai.wxml');
wxmlBuf = stripBOM(wxmlBuf);
let wxml = wxmlBuf.toString('utf8');
let beforeFFFD = (wxml.match(/\uFFFD/g) || []).length;
console.log('  修复前 FFFD 数量: ' + beforeFFFD);

let fixCount = 0;
wxmlFixes.forEach(([bad, good]) => {
	if (wxml.includes(bad)) {
		wxml = wxml.split(bad).join(good);
		fixCount++;
	} else {
		console.log('  ⚠ 未找到: ' + bad.slice(0, 30));
	}
});

let afterFFFD = (wxml.match(/\uFFFD/g) || []).length;
console.log('  应用修复: ' + fixCount + '/' + wxmlFixes.length);
console.log('  修复后 FFFD 数量: ' + afterFFFD);

if (afterFFFD > 0) {
	// 列出剩余 FFFD 行
	wxml.split('\n').forEach((l, i) => {
		if (l.includes('\uFFFD')) console.log('    剩余 line ' + (i + 1) + ': ' + l.trim().slice(0, 80));
	});
}

fs.writeFileSync(DIR + 'work_admin_ai.wxml', wxml, 'utf8');
console.log('  ✓ wxml 已写入（UTF-8 无 BOM）');

// 2. 去 js / wxss 的 BOM
['work_admin_ai.js', 'work_admin_ai.wxss'].forEach(f => {
	console.log('===== 去除 ' + f + ' 的 BOM =====');
	let buf = fs.readFileSync(DIR + f);
	if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
		fs.writeFileSync(DIR + f, buf.slice(3));
		console.log('  ✓ 已去除 BOM');
	} else {
		console.log('  - 无 BOM，跳过');
	}
});

console.log('\n✓ 编码修复完成');
