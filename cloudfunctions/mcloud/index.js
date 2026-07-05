try {
	require('./work_ai_service_live_patch.js');
} catch (ex) {
	console.error('[work_ai_service_live_patch]', ex && ex.stack ? ex.stack : ex);
}
try {
	require('./work_admin_controller_live_patch.js');
} catch (ex) {
	console.error('[work_admin_controller_live_patch]', ex && ex.stack ? ex.stack : ex);
}
try {
	require('./work_route_live_patch.js');
} catch (ex) {
	console.error('[work_route_live_patch]', ex && ex.stack ? ex.stack : ex);
}

const application = require('./framework/core/application.js');

// Cloud function entry
exports.main = async (event, context) => {
	return await application.app(event, context);
}
