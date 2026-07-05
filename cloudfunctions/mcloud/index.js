function reload(modulePath) {
	try {
		let resolved = require.resolve(modulePath);
		delete require.cache[resolved];
		return require(modulePath);
	} catch (ex) {
		console.error('[' + modulePath + ']', ex && ex.stack ? ex.stack : ex);
		return null;
	}
}

function loadLivePatches() {
	reload('./work_ai_service_live_patch.js');
	reload('./work_admin_controller_live_patch.js');
	reload('./work_route_live_patch.js');
}

// Cloud function entry
exports.main = async (event, context) => {
	loadLivePatches();
	let appPath = './framework/core/application.js';
	try {
		delete require.cache[require.resolve(appPath)];
	} catch (ex) {}
	const application = require(appPath);
	return await application.app(event, context);
}
