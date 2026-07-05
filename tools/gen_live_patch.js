/**
 * Live Patch 重新生成器 v3（完全结构化重建）
 *
 * 不依赖原文件 footer 的精确截取，而是：
 *   1. 从骨架提取 target 列表（顺序 + 路径）和 payload 格式
 *   2. 用固定模板重新生成整个文件：
 *        header（标准定义） → payloads → targets → compile 调用 → exports
 *
 * 统一用 path.join 多参数格式（微信云函数环境兼容）。
 */
const fs = require('fs');
const zlib = require('zlib');
const { execSync } = require('child_process');

const MROOT = 'D:/yunyu-repo/cloudfunctions/mcloud/';

function readSkeleton(patchFile, source) {
	if (source === 'HEAD') {
		return execSync('git show HEAD:cloudfunctions/mcloud/' + patchFile, { encoding: 'utf8', cwd: 'D:/yunyu-repo' });
	}
	return fs.readFileSync(MROOT + patchFile, 'utf8');
}

function encodeSource(relPath) {
	return zlib.gzipSync(fs.readFileSync(MROOT + relPath, 'utf8')).toString('base64');
}

function chunk(b64, width) {
	width = width || 200;
	const out = [];
	for (let i = 0; i < b64.length; i += width) out.push(b64.slice(i, i + width));
	return out;
}

// 解析骨架：提取 target 列表（保持顺序）+ payload 格式
function analyze(content) {
	// target 映射 + 顺序（按文件中出现顺序）
	const targetRe = /const\s+(\w+Target)\s*=\s*path\.join\(__dirname,\s*([\s\S]*?)\);/g;
	const order = []; // [{payloadName, parts:[...]}]
	let m;
	while ((m = targetRe.exec(content)) !== null) {
		const payloadName = m[1].replace('Target', 'Payload');
		let parts;
		try { parts = (new Function('return [' + m[2].trim() + '];'))(); }
		catch (e) { throw new Error('解析 target 失败 ' + m[1] + ': ' + m[2].slice(0, 50)); }
		order.push({ payloadName, parts });
	}

	// payload 格式检测（数组 or 单字符串）
	const fmt = {};
	const pdRe = /const\s+(\w+Payload)\s*=\s*([\s\S]*?);\s*\n/g;
	while ((m = pdRe.exec(content)) !== null) {
		fmt[m[1]] = m[2].trim().startsWith('[') ? 'array' : 'string';
	}

	return { order, fmt };
}

// 标准 header（与各 patch 原版一致的函数定义）
const HEADER = `const Module = require('module');
const path = require('path');
const zlib = require('zlib');

const virtualTargets = Object.create(null);
const originalResolveFilename = Module._resolveFilename;

function normalizeTarget(p) {
\treturn path.normalize(p);
}

function resolveVirtualRequest(request, parent) {
\tif (!parent || !parent.filename || !request || request[0] !== '.') return '';
\tlet base = normalizeTarget(path.resolve(path.dirname(parent.filename), request));
\tlet candidates = [base];
\tif (!path.extname(base)) candidates.push(base + '.js');
\tfor (let i = 0; i < candidates.length; i++) {
\t\tlet candidate = normalizeTarget(candidates[i]);
\t\tif (virtualTargets[candidate]) return candidate;
\t}
\treturn '';
}

Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
\tlet virtualTarget = resolveVirtualRequest(request, parent);
\tif (virtualTarget) return virtualTarget;
\treturn originalResolveFilename.call(this, request, parent, isMain, options);
};

function inflate(payload) {
\treturn zlib.gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
}

function compilePatchedModule(target, source) {
\ttarget = normalizeTarget(target);
\tvirtualTargets[target] = true;
\tconst patchedModule = new Module(target, module.parent);
\tpatchedModule.filename = target;
\tpatchedModule.paths = Module._nodeModulePaths(path.dirname(target));
\tpatchedModule._compile(source, target);
\trequire.cache[target] = patchedModule;
\treturn patchedModule;
}
`;

function regenerate(patchFile, skeletonSource) {
	console.log('\n===== ' + patchFile + ' (骨架: ' + skeletonSource + ') =====');
	const content = readSkeleton(patchFile, skeletonSource);
	const { order, fmt } = analyze(content);

	if (!order.length) throw new Error(patchFile + ' 无 target 声明，骨架损坏');

	const payloadBlocks = [];
	const targetLines = [];
	const compileLines = [];
	let lastVarName = null;

	order.forEach((o, i) => {
		const rel = o.parts.join('/').replace(/^\/+/, '');
		const b64 = encodeSource(rel);
		console.log('  [' + (i + 1) + '/' + order.length + '] ' + o.payloadName + ' -> ' + rel + ' (' + b64.length + ' chars)');

		// payload 声明（格式优先用检测到的，默认 array）
		const format = fmt[o.payloadName] || 'array';
		if (format === 'array') {
			const lines = chunk(b64, 200);
			payloadBlocks.push('const ' + o.payloadName + ' = [\n' + lines.map(l => '\t' + JSON.stringify(l)).join(',\n') + '\n].join(\'\');');
		} else {
			payloadBlocks.push('const ' + o.payloadName + ' = ' + JSON.stringify(b64) + ';');
		}

		// target 声明（统一多参数 path.join 格式）
		const targetVar = o.payloadName.replace('Payload', 'Target');
		const argList = o.parts.map(p => JSON.stringify(p)).join(', ');
		targetLines.push('const ' + targetVar + ' = path.join(__dirname, ' + argList + ');');

		// compile 调用
		const isLast = (i === order.length - 1);
		if (isLast) {
			lastVarName = o.payloadName.replace('Payload', 'Module');
			compileLines.push('const ' + lastVarName + ' = compilePatchedModule(' + targetVar + ', inflate(' + o.payloadName + '));');
		} else {
			compileLines.push('compilePatchedModule(' + targetVar + ', inflate(' + o.payloadName + '));');
		}
	});

	const newContent = HEADER +
		'\n' + payloadBlocks.join('\n\n') + '\n\n' +
		targetLines.join('\n') + '\n\n' +
		compileLines.join('\n') + '\n\n' +
		'module.exports = ' + lastVarName + '.exports;\n';

	fs.writeFileSync(MROOT + patchFile, newContent, 'utf8');
	console.log('✓ 写入 ' + patchFile + ' (' + newContent.length + ' bytes)');
}

// route：工作区骨架完好（1 target）；
// controller / ai_service：工作区骨架已损坏（缺 target），统一用 HEAD 完整骨架
regenerate('work_route_live_patch.js', 'worktree');
regenerate('work_admin_controller_live_patch.js', 'HEAD');
regenerate('work_ai_service_live_patch.js', 'HEAD');

console.log('\n✓ 全部生成完成');
