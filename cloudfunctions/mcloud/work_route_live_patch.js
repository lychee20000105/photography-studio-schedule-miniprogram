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
	'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'
].join('');

const routeTarget = path.join(__dirname, 'project', 'B00', 'public', 'route.js');
const patchedRouteModule = compilePatchedModule(routeTarget, inflate(routePayload));

module.exports = patchedRouteModule.exports;
