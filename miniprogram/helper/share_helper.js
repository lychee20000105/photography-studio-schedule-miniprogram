/**
 * Notes: 小程序分享辅助
 */

const setting = require('../setting/setting.js');

const DEFAULT_IMAGE = '/projects/B00/images/default_index_bg.png';

function getPage(page) {
	if (page) return page;
	let pages = getCurrentPages();
	return pages && pages.length ? pages[pages.length - 1] : null;
}

function encodeQuery(options = {}) {
	let arr = [];
	for (let key in (options || {})) {
		if (options[key] === undefined || options[key] === null || options[key] === '') continue;
		arr.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(options[key])));
	}
	return arr.join('&');
}

function getPath(page, extraOptions = {}) {
	page = getPage(page);
	let route = page && page.route ? page.route : 'projects/B00/pages/work/calendar/work_calendar';
	let options = Object.assign({}, page && page.options ? page.options : {}, extraOptions || {});
	let query = encodeQuery(options);
	return '/' + route + (query ? '?' + query : '');
}

function getTitle(page) {
	page = getPage(page);
	let route = page && page.route ? page.route : '';
	if (route.includes('/work/calendar/')) return '云屿摄影-档期';
	if (route.includes('/work/performance/')) return '云屿摄影-业绩';
	if (route.includes('/work/add/')) return '云屿摄影-订单';
	if (route.includes('/work/note/')) return '云屿摄影-小记';
	return setting.COMPANY ? setting.COMPANY.split('｜')[0] : '云屿摄影';
}

function normalizeAppMessage(page, ret = {}) {
	ret = ret || {};
	return {
		title: ret.title || getTitle(page),
		path: ret.path || getPath(page),
		imageUrl: ret.imageUrl || DEFAULT_IMAGE,
	};
}

function normalizeTimeline(page, ret = {}) {
	ret = ret || {};
	let path = ret.path || getPath(page);
	let query = ret.query || '';
	if (!query && path.includes('?')) query = path.split('?').slice(1).join('?');
	return {
		title: ret.title || getTitle(page),
		query,
		imageUrl: ret.imageUrl || DEFAULT_IMAGE,
	};
}

function appMessage(page) {
	return normalizeAppMessage(page, {});
}

function timeline(page) {
	return normalizeTimeline(page, {});
}

module.exports = {
	getPath,
	normalizeAppMessage,
	normalizeTimeline,
	appMessage,
	timeline,
};
