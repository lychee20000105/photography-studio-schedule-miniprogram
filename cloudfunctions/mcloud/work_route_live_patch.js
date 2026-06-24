const Module = require('module');
const path = require('path');
const zlib = require('zlib');

function inflate(payload) {
	return zlib.gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
}

function compilePatchedModule(target, source) {
	const patchedModule = new Module(target, module.parent);
	patchedModule.filename = target;
	patchedModule.paths = Module._nodeModulePaths(path.dirname(target));
	patchedModule._compile(source, target);
	require.cache[target] = patchedModule;
	return patchedModule;
}

const routePayload = [
	'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',
	'X3n/B1H3jjaQLAAA'
].join('');

const routeTarget = path.join(__dirname, 'project', 'B00', 'public', 'route.js');

const routeModule = compilePatchedModule(routeTarget, inflate(routePayload));

module.exports = routeModule.exports;
