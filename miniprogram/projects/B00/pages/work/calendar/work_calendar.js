const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const guestHelper = require('../../../../../helper/guest_helper.js');
const dateHelper = require('../../../../../helper/date_helper.js');
const lunarLib = require('../../../../../lib/tools/lunar_lib.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		isLoad: false,
		isGuest: false,
		month: '',
		day: '',
		scope: 'all',
		days: [],
		dayMap: {},
		dayData: null,
		options: null,
		calendarCache: {},
		calendarPanels: [],
		calendarWidth: 0,
		trackWidth: 0,
		trackX: 0,
		trackTransition: 'none',
		touchStartX: 0,
		touchStartY: 0,
		touchMoved: false,
		isDragging: false,
		isAnimating: false,
		skeletonRows: [
			{ avatar: true },
			{ avatar: true },
			{ avatar: true },
			{ avatar: true },
		],
	},

	onLoad: async function (options = {}) {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let today = this._normalizeShareDay(options.day) || this._today();
		let scope = ['all', 'mine', 'joined'].includes(options.scope) ? options.scope : 'all';
		let width = this._guessCalendarWidth();
		this.setData({
			month: today.substr(0, 7),
			day: today,
			scope,
			calendarWidth: width,
			trackWidth: width * 3,
			trackX: -width,
		});
	},

	onShow: async function () {
		let ok = await this._loadOptions();
		if (!ok) return;
		this._applyPendingCalendarDay();
		await this._loadCalendar();
		this._measureCalendar();
		await this._loadDay();
		await this._preloadNeighborCalendars();
	},

	onPullDownRefresh: async function () {
		await this._loadCalendar();
		await this._loadDay();
		await this._preloadNeighborCalendars();
		wx.stopPullDownRefresh();
	},

	_today() {
		return dateHelper.today();
	},

	_fmtDate(d) {
		let y = d.getFullYear();
		let m = String(d.getMonth() + 1).padStart(2, '0');
		let day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	},

	_normalizeShareDay(day) {
		day = String(day || '').trim();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
		return day;
	},

	_shiftMonth(month, step) {
		let arr = month.split('-');
		let d = new Date(Number(arr[0]), Number(arr[1]) - 1 + step, 1);
		return this._fmtDate(d).substr(0, 7);
	},

	_applyPendingCalendarDay() {
		let day = wx.getStorageSync('WORK_CALENDAR_DAY') || '';
		if (!day) return;
		wx.removeStorageSync('WORK_CALENDAR_DAY');
		this.setData({
			month: day.substr(0, 7),
			day,
			calendarPanels: this._buildCalendarPanels(day.substr(0, 7), day, this.data.calendarCache),
			trackX: this.data.calendarWidth ? -this.data.calendarWidth : this.data.trackX,
			trackTransition: 'none',
		});
	},

	_guessCalendarWidth() {
		try {
			let sys = wx.getSystemInfoSync();
			return Math.max(300, Math.round(sys.windowWidth * 702 / 750));
		} catch (e) {
			return 360;
		}
	},

	_loadOptions: async function () {
		if (guestHelper.isGuest()) {
			let options = guestHelper.getOptions();
			options.staffInitial = '访';
			this.setData({ options, isGuest: true });
			return true;
		}
		let opts = { title: 'bar' };
		let options = await cloudHelper.callCloudData('work/options', {}, opts);
		if (options) {
			options.staffInitial = options.staff && options.staff.STAFF_NAME ? options.staff.STAFF_NAME.substr(0, 1) : '云';
			this.setData({ options, isGuest: false });
			if (!options.staff) {
				wx.switchTab({ url: '/projects/B00/pages/work/my/work_my' });
				return false;
			}
		}
		return true;
	},

	_loadCalendar: async function () {
		return await this._loadCalendarByMonth(this.data.month, !this.data.isLoad);
	},

	_loadCalendarByMonth: async function (month, withLoading = false) {
		if (this.data.isGuest) {
			let data = guestHelper.getCalendar(month);
			let days = data.days || {};
			let cache = Object.assign({}, this.data.calendarCache || {});
			cache[month] = days;
			let cacheMonths = Object.keys(cache).sort();
			if (cacheMonths.length > 5) {
				for (let i = 0; i < cacheMonths.length - 5; i++) delete cache[cacheMonths[i]];
			}
			this.setData({
				calendarCache: cache,
				dayMap: month == this.data.month ? days : this.data.dayMap,
				days: month == this.data.month ? this._buildDays(this.data.month, days, this.data.day) : this.data.days,
				calendarPanels: this._buildCalendarPanels(this.data.month, this.data.day, cache),
				trackX: this.data.calendarWidth ? -this.data.calendarWidth : this.data.trackX,
				isLoad: true,
			});
			return;
		}
		let opts = withLoading ? { title: '加载中' } : { hint: false };
		let params = {
			month,
			scope: this.data.scope,
		};
		try {
			let data = await cloudHelper.callCloudData('work/calendar', params, opts);
			if (!data) return;
			let days = this._filterCalendarDaysForScope(data.days || {});
			let cache = Object.assign({}, this.data.calendarCache || {});
			cache[month] = days;
			let cacheMonths = Object.keys(cache).sort();
			if (cacheMonths.length > 5) {
				for (let i = 0; i < cacheMonths.length - 5; i++) delete cache[cacheMonths[i]];
			}
			this.setData({
					calendarCache: cache,
					dayMap: month == this.data.month ? days : this.data.dayMap,
					days: month == this.data.month ? this._buildDays(this.data.month, days, this.data.day) : this.data.days,
					calendarPanels: this._buildCalendarPanels(this.data.month, this.data.day, cache),
					trackX: this.data.calendarWidth ? -this.data.calendarWidth : this.data.trackX,
					isLoad: true,
				});
		} catch (err) {
			console.error(err);
		}
	},

	_isJoinedTag(tag) {
		if (!tag || tag.kind != 'order') return false;
		let staffId = (this.data.options && this.data.options.staff) ? this.data.options.staff._id : '';
		if (!staffId) return false;
		let ids = tag.participantIds;
		if (!Array.isArray(ids)) return false;
		return ids.indexOf(staffId) >= 0;
	},

	_isJoinedOrder: async function (orderId) {
		if (!orderId || !this.data.options || !this.data.options.staff) return false;
		let staffId = this.data.options.staff._id || '';
		if (!staffId) return false;
		try {
			let order = await cloudHelper.callCloudData('work/order_detail', { id: orderId }, { hint: false });
			let participants = order && Array.isArray(order.ORDER_PARTICIPANTS) ? order.ORDER_PARTICIPANTS : [];
			return participants.some(item => item && item.staffId == staffId);
		} catch (err) {
			console.error(err);
			return false;
		}
	},

	_filterCalendarDaysForScope: function (dayMap) {
		if (this.data.scope != 'joined') return dayMap || {};
		let result = {};
		for (let day in (dayMap || {})) {
			let tags = dayMap[day] || [];
			let nextTags = tags.filter(tag => this._isJoinedTag(tag));
			if (nextTags.length) result[day] = nextTags;
		}
		return result;
	},

	_loadDay: async function (withLoading = false) {
		if (this.data.isGuest) {
			this.setData({
				dayData: guestHelper.getDay(this.data.day),
			});
			return;
		}
		let opts = withLoading ? { title: 'bar' } : { hint: false };
		let params = {
			day: this.data.day,
			scope: this.data.scope,
		};
		let data = await cloudHelper.callCloudData('work/day_list', params, opts);
		data = await this._filterDayDataForScope(data);
		this.setData({
			dayData: data || { orders: [], items: [], rests: [] },
		});
	},

	_filterDayDataForScope: async function (data) {
		data = data || { orders: [], items: [], rests: [] };
		if (this.data.scope != 'joined') return data;
		let orders = [];
		for (let order of (data.orders || [])) {
			if (await this._isJoinedOrder(order._id)) orders.push(order);
		}
		return { orders, items: [], rests: [] };
	},

	_measureCalendar() {
		setTimeout(() => {
			wx.createSelectorQuery().in(this).select('.calendar-viewport').boundingClientRect(rect => {
				if (!rect || !rect.width) return;
				this.setData({
					calendarWidth: rect.width,
					trackWidth: rect.width * 3,
					trackX: -rect.width,
					trackTransition: 'none',
				});
			}).exec();
		}, 50);
	},

	_buildCalendarPanels(month, day, cache) {
		cache = cache || this.data.calendarCache || {};
		return [-1, 0, 1].map(step => {
			let panelMonth = this._shiftMonth(month, step);
			return {
				month: panelMonth,
				days: this._buildDays(panelMonth, cache[panelMonth] || {}, day),
			};
		});
	},

	_buildDays(month, dayMap, selectedDay) {
		let arr = month.split('-');
		let y = Number(arr[0]);
		let m = Number(arr[1]);
		let first = new Date(y, m - 1, 1);
		let startOffset = first.getDay();
		let start = new Date(y, m - 1, 1 - startOffset);
		let today = this._today();
		let list = [];
		for (let i = 0; i < 42; i++) {
			let d = new Date(start);
			d.setDate(start.getDate() + i);
			let date = this._fmtDate(d);
			let lunar = '';
			try {
				lunar = lunarLib.sloarToLunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
			} catch (e) {}
			list.push({
				date,
				day: d.getDate(),
				lunar,
				isCurMonth: d.getMonth() + 1 == m,
				isToday: date == today,
				isSelect: date == selectedDay,
				tags: dayMap[date] || [],
			});
		}
		return list;
	},

	bindDayTap: async function (e) {
		if (this.data.touchMoved) return;
		let day = e.currentTarget.dataset.day;
		if (!day) return;
		if (this.data.isGuest) {
			this.setData({
				day,
				month: day.substr(0, 7),
				days: this._buildDays(day.substr(0, 7), this.data.dayMap || {}, day),
				calendarPanels: this._buildCalendarPanels(day.substr(0, 7), day, this.data.calendarCache),
				trackX: this.data.calendarWidth ? -this.data.calendarWidth : this.data.trackX,
				trackTransition: 'none',
			});
			await this._loadDay();
			return;
		}
		wx.navigateTo({
			url: '../day_detail/work_day_detail?day=' + day + '&scope=' + (this.data.scope || 'all'),
		});
	},

	bindPrevMonthTap: async function () {
		await this._changeMonth(-1);
	},

	bindNextMonthTap: async function () {
		await this._changeMonth(1);
	},

	bindCalendarTouchStart: function (e) {
		if (this.data.isAnimating) return;
		let touch = e.touches && e.touches[0] ? e.touches[0] : null;
		if (!touch) return;
		this.setData({
			touchStartX: touch.clientX,
			touchStartY: touch.clientY,
			touchMoved: false,
			isDragging: true,
			trackTransition: 'none',
		});
	},

	bindCalendarTouchMove: function (e) {
		if (!this.data.isDragging || this.data.isAnimating || !this.data.calendarWidth) return;
		let touch = e.touches && e.touches[0] ? e.touches[0] : null;
		if (!touch) return;
		let dx = touch.clientX - this.data.touchStartX;
		let dy = touch.clientY - this.data.touchStartY;
		if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
		this.setData({ trackX: -this.data.calendarWidth + dx, touchMoved: Math.abs(dx) > 8 });
	},

	bindCalendarTouchEnd: function (e) {
		if (!this.data.isDragging || this.data.isAnimating || !this.data.calendarWidth) return;
		let touch = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : null;
		if (!touch) return;
		let dx = touch.clientX - this.data.touchStartX;
		let dy = touch.clientY - this.data.touchStartY;
		if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
			this.setData({ isDragging: false, touchMoved: false });
			return;
		}
		let threshold = Math.min(90, this.data.calendarWidth * 0.22);
		let step = 0;
		if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.2) step = dx < 0 ? 1 : -1;
		this._finishCalendarSlide(step);
	},

	bindTodayTap: async function () {
		let today = this._today();
		this.setData({
			month: today.substr(0, 7),
			day: today,
			calendarPanels: this._buildCalendarPanels(today.substr(0, 7), today, this.data.calendarCache),
			trackX: this.data.calendarWidth ? -this.data.calendarWidth : this.data.trackX,
			trackTransition: 'none',
		});
		await this._loadCalendar();
		await this._loadDay();
		await this._preloadNeighborCalendars();
	},

	_changeMonth: async function (step) {
		if (this.data.calendarWidth) return this._finishCalendarSlide(step);
		await this._applyMonthStep(step);
	},

	_finishCalendarSlide: function (step) {
		let width = this.data.calendarWidth;
		let targetX = step == 0 ? -width : -width * (1 + step);
		this.setData({
			isDragging: false,
			isAnimating: true,
			trackTransition: 'transform .22s ease-out',
			trackX: targetX,
		});
		setTimeout(() => {
			if (step == 0) {
				this.setData({ isAnimating: false, trackTransition: 'none', trackX: -width });
				return;
			}
			this._applyMonthStep(step);
			this.setData({ isAnimating: false });
		}, 230);
	},

	_applyMonthStep: async function (step) {
		let month = this._shiftMonth(this.data.month, step);
		let day = month + '-01';
		this.setData({
			month,
			day,
			days: this._buildDays(month, (this.data.calendarCache || {})[month] || {}, day),
			calendarPanels: this._buildCalendarPanels(month, day, this.data.calendarCache),
			trackX: this.data.calendarWidth ? -this.data.calendarWidth : this.data.trackX,
			trackTransition: 'none',
		});
		await this._loadDay();
		await this._loadCalendarByMonth(month, false);
		await this._preloadNeighborCalendars();
	},

	_preloadNeighborCalendars: async function () {
		let months = [this._shiftMonth(this.data.month, -1), this._shiftMonth(this.data.month, 1)];
		for (let month of months) {
			if ((this.data.calendarCache || {})[month]) continue;
			await this._loadCalendarByMonth(month, false);
		}
	},

	bindScopeTap: async function (e) {
		let scope = e.currentTarget.dataset.scope;
		this.setData({
			scope,
			calendarCache: {},
			calendarPanels: this._buildCalendarPanels(this.data.month, this.data.day, {}),
			trackX: this.data.calendarWidth ? -this.data.calendarWidth : this.data.trackX,
			trackTransition: 'none',
		});
		await this._loadCalendar();
		await this._loadDay();
		await this._preloadNeighborCalendars();
	},

	bindOrderTap: function (e) {
		if (this.data.isGuest) return guestHelper.showReadonlyTip();
		let id = e.currentTarget.dataset.id;
		wx.navigateTo({
			url: '../order_edit/work_order_edit?id=' + id,
		});
	},

	bindAddTap: function () {
		if (this.data.isGuest) return guestHelper.showReadonlyTip();
		let day = this.data.day || '';
		wx.setStorageSync('WORK_ADD_DAY', day);
		wx.navigateTo({
			url: '/projects/B00/pages/work/add/work_add' + (day ? '?day=' + encodeURIComponent(day) : ''),
			fail: err => {
				console.error(err);
				pageHelper.showModal((err && err.errMsg) || '打开新增页面失败');
			},
		});
	},

	bindGoBindTap: function () {
		wx.switchTab({ url: '/projects/B00/pages/work/my/work_my' });
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	onShareAppMessage: function () {
		let day = this.data.day || this._today();
		let scope = this.data.scope || 'all';
		return {
			title: `云屿摄影 ${day} 档期`,
			path: `/projects/B00/pages/work/calendar/work_calendar?day=${day}&scope=${scope}`,
			imageUrl: '/projects/B00/images/default_index_bg.png',
		};
	},

	onShareTimeline: function () {
		let day = this.data.day || this._today();
		let scope = this.data.scope || 'all';
		return {
			title: `云屿摄影 ${day} 档期`,
			query: `day=${day}&scope=${scope}`,
			imageUrl: '/projects/B00/images/default_index_bg.png',
		};
	},
});
