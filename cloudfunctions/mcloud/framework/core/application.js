/**
 * Notes: 云函数业务主逻辑
 * Ver : CCMiniCloud Framework 2.8.1 ALL RIGHTS RESERVED BY cclinUX0730 (wechat)
 * Date: 2025-09-05 04:00:00
 */
const util = require('../utils/util.js');
const cloudBase = require('../cloud/cloud_base.js');
const timeUtil = require('../utils/time_util.js');
const appUtil = require('./app_util.js');
const appCode = require('./app_code.js');
const appOther = require('./app_other.js');
const config = require('../../config/config.js');

const PROJECT_PID = 'B00';
const PROJECT_ROUTES = {
	[PROJECT_PID]: () => require('project/B00/public/route.js')
};
const PROJECT_CONTROLLERS = {
	[PROJECT_PID]: (controllerName) => require('project/B00/controller/' + controllerName + '.js')
};

function checkProjectPid(pid) {
	return pid === PROJECT_PID;
}

async function app(event, context) {

	// 非标业务处理
	let {
		eventX,
		isOther
	} = appOther.handlerOther(event);
	event = eventX;

	// 取得openid
	const cloud = cloudBase.getCloud();
	const wxContext = cloud.getWXContext();
	let r = '';
	let PID = '';
	let controllerName = '';
	let actionName = '';
	let timeTicks = timeUtil.time();
	try {

		if (!util.isDefined(event.route)) {
			showEvent(event);
			console.error('Route Not Defined');
			return appUtil.handlerSvrErr();
		}

		r = event.route.toLowerCase();
		if (!r.includes('/')) {
			showEvent(event);
			console.error('Route Format error[' + r + ']');
			return appUtil.handlerSvrErr();
		}

		PID = String(event.PID || '').trim();
		if (!checkProjectPid(PID)) {
			showEvent(event);
			console.error('PID Not Allowed');
			return appUtil.handlerAppErr('PID Not Allowed', appCode.LOGIC);
		}

		// 路由不存在
		const routes = PROJECT_ROUTES[PID]();
		if (!util.isDefined(routes[r])) {
			showEvent(event);
			console.error('Route [' + r + '] Is Not Exist');
			return appUtil.handlerSvrErr();
		}

		let routesArr = routes[r].split('@');

		controllerName = routesArr[0];
		actionName = routesArr[1];

		// 事前处理
		if (actionName.includes('#')) {
			let actionNameArr = actionName.split('#');
			actionName = actionNameArr[0];
			if (actionNameArr[1] && config.IS_DEMO) {
				console.warn('APP Before = ' + actionNameArr[1]);
				return beforeApp(actionNameArr[1]);
			}
		}

		let time = timeUtil.time('Y-M-D h:m:s');
		timeTicks = timeUtil.time();
		let openId = wxContext.OPENID;

		console.log(`[REQ] ${time} Route=${r} Controller=${controllerName} Action=${actionName}`);

		// 引入逻辑controller
		controllerName = controllerName.toLowerCase().trim();
		const ControllerClass = PROJECT_CONTROLLERS[PID](controllerName);
		const controller = new ControllerClass(r, openId, event);

		// 调用方法
		await controller['initSetup']();
		let result = await controller[actionName]();

		// 返回值处理
		if (isOther) {
			// 非标处理
			return result;
		} else {
			if (!result)
				result = appUtil.handlerSucc(r); // 无数据返回
			else
				result = appUtil.handlerData(result, r); // 有数据返回
		}

		time = timeUtil.time('Y-M-D h:m:s');
		timeTicks = timeUtil.time() - timeTicks;
		console.log(`[RES] ${time} Route=${r} Duration=${timeTicks}ms`);

		return result;


	} catch (ex) {
		const log = cloud.logger();

		time = timeUtil.time('Y-M-D h:m:s');
		timeTicks = timeUtil.time() - timeTicks;
		console.error(`[ERR] ${time} Route=${r} Duration=${timeTicks}ms Exception=${ex.message} Code=${ex.code}`);

		// 系统级错误定位调试
		if (config.TEST_MODE && ex.name != 'AppError') throw ex;

		if (ex.name == 'AppError') {
			log.warn({
				route: r,
				errCode: ex.code,
				errMsg: ex.message
			});
			// 自定义error处理
			return appUtil.handlerAppErr(ex.message, ex.code);
		} else {
			log.error({
				route: r,
				errCode: ex.code,
				errMsg: ex.message,
				errStack: ex.stack
			});


			// 系统error
			return appUtil.handlerSvrErr();
		}
	}
}

// 事前处理
function beforeApp(method) {
	switch (method) {
		case 'demo': {
			return appUtil.handlerAppErr('本系统当前为体验演示模式，后台提交的操作均不生效。如需开通请联系云屿科技技术支持', appCode.LOGIC);
		}
	}
	console.error('事前处理, Method Not Find = ' + method);
}

// 展示当前输入数据
function showEvent(event) {
	console.warn('[showEvent] route=' + (event && event.route) + ' PID=' + (event && event.PID));
}

module.exports = {
	app
}
