const Module = require('module');
const path = require('path');
const zlib = require('zlib');

const target = path.join(__dirname, 'project', 'B00', 'controller', 'work_admin_controller.js');
const payload = [
	'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'
].join('');
const source = zlib.gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
const patchedModule = new Module(target, module.parent);
patchedModule.filename = target;
patchedModule.paths = Module._nodeModulePaths(path.dirname(target));
patchedModule._compile(source, target);
require.cache[target] = patchedModule;

module.exports = patchedModule.exports;
