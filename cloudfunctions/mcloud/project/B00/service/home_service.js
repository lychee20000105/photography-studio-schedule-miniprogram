/**
 * Notes: 全局/首页模块业务逻辑
 * Date: 2025-03-15 04:00:00 
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 */

const BaseProjectService = require('./base_project_service.js'); 
const setupUtil = require('../../../framework/utils/setup/setup_util.js'); 

const PUBLIC_SETUP_KEYS = new Set([
	'SETUP_ABOUT_KEY',
]);

class HomeService extends BaseProjectService {

	async getSetup(key) {
		if (!PUBLIC_SETUP_KEYS.has(key)) this.AppError('设置项不可访问');

		return await setupUtil.get(key);
	}
  
}

module.exports = HomeService;
