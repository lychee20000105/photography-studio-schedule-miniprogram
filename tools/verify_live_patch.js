/**
 * Live Patch 验证脚本
 * 用 VM 沙箱执行每个 patch 文件，拦截 compilePatchedModule，
 * 确认每个 patch 解码后的源码 === 工作区源码文件内容。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const MROOT = 'D:/yunyu-repo/cloudfunctions/mcloud/';

function verify(patchFile) {
	console.log('\n===== ' + patchFile + ' =====');
	const src = fs.readFileSync(MROOT + patchFile, 'utf8');
	const captured = {};

	const sandbox = {
		require: (m) => require(m),
		__dirname: MROOT,
		module: { exports: {} },
		exports: {},
		console, Buffer, process: { env: {} },
	};

	// 把 compilePatchedModule 改写为捕获函数
	const modified = src.replace(
		/function\s+compilePatchedModule\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/,
		'function compilePatchedModule(t,s){ captured[t]=s; return {exports:{}}; }'
	);

	try {
		vm.runInNewContext('var captured=arguments[0];\n' + modified + '\n;', sandbox, { filename: patchFile }, captured);
	} catch (e) {
		// captured 通过闭包传入
		console.log('  ✗ 执行失败: ' + e.message);
		return false;
	}

	const keys = Object.keys(sandbox.captured || {});
	if (!keys.length) {
		// 闭包方式失败，fallback：直接从 sandbox 取（modified 里 captured 是局部 var）
	}
	return true;
}

// 更可靠：直接让 modified 把结果挂到 sandbox 上
function verifyV2(patchFile) {
	console.log('\n===== ' + patchFile + ' =====');
	const src = fs.readFileSync(MROOT + patchFile, 'utf8');

	const sandbox = {
		require: (m) => {
			if (m === 'zlib' || m === 'path' || m === 'module') return require(m);
			return require(m);
		},
		__dirname: MROOT,
		module: { exports: {} },
		exports: {},
		console, Buffer, process: { env: {} },
		__captured: {},
	};

	const modified = src
		.replace(/function\s+compilePatchedModule\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/,
			'function compilePatchedModule(t,s){ __captured[t]=s; return {exports:{}}; }');

	// 在脚本开头注入 __captured 声明，确保函数内能访问
	const script = 'var __captured = {};\n' + modified + '\n;this.__result = __captured;';
	try {
		vm.runInNewContext(script, sandbox, { filename: patchFile });
	} catch (e) {
		console.log('  ✗ 执行失败: ' + e.message);
		return false;
	}

	const crypto = require('crypto');
	const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
	const captured = sandbox.__result || {};
	const keys = Object.keys(captured);

	if (!keys.length) {
		console.log('  ✗ 未捕获到任何 patch');
		return false;
	}

	let allOk = true;
	keys.forEach(target => {
		const patchSrc = captured[target];
		const rel = target.replace(MROOT.replace(/\//g, path.sep), '').replace(/\\/g, '/');
		const srcPath = MROOT + rel;
		let srcContent;
		try {
			srcContent = fs.readFileSync(srcPath, 'utf8');
		} catch (e) {
			console.log('  ? ' + rel + ': 源码读取失败 ' + srcPath);
			allOk = false;
			return;
		}
		const same = patchSrc === srcContent;
		console.log('  ' + (same ? '✓' : '✗') + ' ' + rel + '  ' + (same ? '一致' : '漂移!'));
		if (!same) {
			console.log('     patch ' + sha(patchSrc) + '(' + patchSrc.split('\n').length + '行) vs 源码 ' + sha(srcContent) + '(' + srcContent.split('\n').length + '行)');
			allOk = false;
		}
	});

	return allOk;
}

const results = [
	verifyV2('work_route_live_patch.js'),
	verifyV2('work_admin_controller_live_patch.js'),
	verifyV2('work_ai_service_live_patch.js'),
];

console.log('\n========== 总结 ==========');
if (results.every(r => r)) {
	console.log('✓✓✓ 全部 patch 与源码一致，可安全部署');
} else {
	console.log('✗✗✗ 存在漂移，需修复');
}
process.exit(results.every(r => r) ? 0 : 1);
