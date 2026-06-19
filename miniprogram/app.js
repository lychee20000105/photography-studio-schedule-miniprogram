const setting = require('./setting/setting.js');
const versionInfo = require('./version.js');

const DEFAULT_SHARE_IMAGE = '/projects/B00/images/default_index_bg.png';
const VERSION_NOTICE_KEY = 'YUNYU_VERSION_NOTICE_CLOSED';

function getSharePage(page) {
	if (page) return page;
	let pages = getCurrentPages();
	return pages && pages.length ? pages[pages.length - 1] : null;
}

function encodeShareQuery(options = {}) {
	let arr = [];
	for (let key in (options || {})) {
		if (options[key] === undefined || options[key] === null || options[key] === '') continue;
		arr.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(options[key])));
	}
	return arr.join('&');
}

function getSharePath(page, extraOptions = {}) {
	page = getSharePage(page);
	let route = page && page.route ? page.route : 'projects/B00/pages/work/calendar/work_calendar';
	let options = Object.assign({}, page && page.options ? page.options : {}, extraOptions || {});
	let query = encodeShareQuery(options);
	return '/' + route + (query ? '?' + query : '');
}

function getShareTitle(page) {
	page = getSharePage(page);
	let route = page && page.route ? page.route : '';
	if (route.indexOf('/work/calendar/') > -1) return '云屿摄影-档期';
	if (route.indexOf('/work/performance/') > -1) return '云屿摄影-业绩';
	if (route.indexOf('/work/add/') > -1) return '云屿摄影-订单';
	if (route.indexOf('/work/note/') > -1) return '云屿摄影-小记';
	return setting.COMPANY ? setting.COMPANY.split('｜')[0] : '云屿摄影';
}

function normalizeShareAppMessage(page, ret = {}) {
	ret = ret || {};
	return {
		title: ret.title || getShareTitle(page),
		path: ret.path || getSharePath(page),
		imageUrl: ret.imageUrl || DEFAULT_SHARE_IMAGE,
	};
}

function normalizeShareTimeline(page, ret = {}) {
	ret = ret || {};
	let path = ret.path || getSharePath(page);
	let query = ret.query || '';
	if (!query && path.indexOf('?') > -1) query = path.split('?').slice(1).join('?');
	return {
		title: ret.title || getShareTitle(page),
		query,
		imageUrl: ret.imageUrl || DEFAULT_SHARE_IMAGE,
	};
}

function patchPageShare() {
	if (typeof Page !== 'function' || Page.__yunyuSharePatched) return;
	const originPage = Page;
	Page = function (options = {}) {
		const rawShareAppMessage = options.onShareAppMessage;
		const rawShareTimeline = options.onShareTimeline;
		options.onShareAppMessage = function (res) {
			let ret = rawShareAppMessage ? rawShareAppMessage.call(this, res) : null;
			return normalizeShareAppMessage(this, ret);
		};
		options.onShareTimeline = function (res) {
			let ret = rawShareTimeline ? rawShareTimeline.call(this, res) : null;
			return normalizeShareTimeline(this, ret);
		};
		return originPage(options);
	};
	Page.__yunyuSharePatched = true;
}

patchPageShare();

function showVersionNotice() {
	let version = (versionInfo && versionInfo.current) || setting.APP_VERSION || '';
	if (!version) return;
	if (wx.getStorageSync(VERSION_NOTICE_KEY) == version) return;

	let name = (versionInfo && versionInfo.name) || setting.APP_VERSION_NAME || '';
	let summary = (versionInfo && versionInfo.summary) || '';
	let date = (versionInfo && versionInfo.date) || setting.APP_VERSION_DATE || '';
	let notice = {
		version,
		title: '更新通告 v' + version,
		name,
		date,
		items: [summary || name || '小程序已更新。'].filter(item => item),
	};

	let tryShow = (count = 0) => {
		let pages = getCurrentPages();
		let page = pages && pages.length ? pages[pages.length - 1] : null;
		let pet = page && page.selectComponent ? page.selectComponent('#workPet') : null;
		if (pet && typeof pet.showVersionNotice == 'function') {
			pet.showVersionNotice(notice);
			return;
		}
		if (count < 8) setTimeout(() => tryShow(count + 1), 300);
	};

	setTimeout(() => tryShow(), 800);
}

App({
	onLaunch: function (options) {

		if (!wx.cloud) {
			console.error('请使用 2.2.3 或以上的基础库以使用云能力')
		} else {
			wx.cloud.init({
				// env 参数说明：
				//   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
				//   此处请填入环境 ID, 环境 ID 可打开云控制台查看
				//   如不填则使用默认环境（第一个创建的环境）
				// env: 'my-env-id',
				env: setting.CLOUD_ID,
				traceUser: true,
			})
		}

		this.globalData = {};

		// 用于自定义导航栏
		wx.getSystemInfo({
			success: e => {
				this.globalData.statusBar = e.statusBarHeight;
				let capsule = wx.getMenuButtonBoundingClientRect();
				if (capsule) {
					this.globalData.custom = capsule;
					this.globalData.customBar = capsule.bottom + capsule.top - e.statusBarHeight;
				} else {
					this.globalData.customBar = e.statusBarHeight + 50;
				} 
			}
		});

		showVersionNotice();
	},

})
