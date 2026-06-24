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
