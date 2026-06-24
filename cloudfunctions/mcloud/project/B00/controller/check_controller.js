/**
 * Notes: 内容检测控制器
 * Date: 2025-03-15 19:20:00 
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 */

const BaseProjectController = require('./base_project_controller.js');
const contentCheck = require('../../framework/validate/content_check.js');

class CheckController extends BaseProjectController {

	/**
	 * 图片校验 
	 */
	async checkImg() {

		// 数据校验
		let rules = {
			img: 'must|string|max:200|name=图片',
			mine: 'default=jpg|name=类型',
		};

		// 取得数据
		let input = this.validateData(rules);

		// 使用客户端传入的 mime 参数，但加白名单校验
		const ALLOWED_MIME = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
		let mime = (input.mine || 'jpg').toLowerCase();
		if (!ALLOWED_MIME.includes(mime)) mime = 'jpg';

		return await contentCheck.checkImg(input.img, mime);

	}

}

module.exports = CheckController;