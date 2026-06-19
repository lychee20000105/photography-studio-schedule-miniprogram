const cloudHelper = require('../../helper/cloud_helper.js');
const guestHelper = require('../../helper/guest_helper.js');

const STORAGE_KEY = 'WORK_PET_STATE';
const POS_KEY = 'WORK_PET_POS_V4';
const CHAT_KEY = 'WORK_PET_CHAT_HISTORY_V1';
const CHAT_THREADS_KEY = 'WORK_PET_CHAT_THREADS_V1';
const ACTIVE_CHAT_KEY = 'WORK_PET_ACTIVE_THREAD_V1';
const VERSION_NOTICE_KEY = 'YUNYU_VERSION_NOTICE_CLOSED';
const PET_BOX = { width: 84, height: 92 };
const DEFAULT_CONTEXT_LIMIT = 128000;
const LOCAL_IMAGE_DIR = 'work_pet_images';
const AGENT_VERSION = {
	version: '0.2.0',
	date: '2026-06-11',
	name: '安全访客与清晰录单',
	items: [
		'访客模式不读取真实业务数据，访客新增只保存在本机临时缓存。',
		'小猫助手支持多对话、本地图片预览和截图录单提示。',
		'Agent设置入口展示当前模型、服务商、上下文估算和更新日志。',
	],
};

const TYPE_MAP = {
	cloud: { label: '云朵小猫', icon: '云' },
	camera: { label: '相机小猫', icon: '拍' },
	star: { label: '星光小猫', icon: '星' },
};

function clamp(num, min, max) {
	num = Number(num || 0);
	return Math.max(min, Math.min(max, num));
}

function defaultPet() {
	return {
		enabled: true,
		type: 'cloud',
		level: 1,
		exp: 0,
		hunger: 70,
		health: 90,
		mood: 'happy',
		moodText: '状态很好',
		lastCareTime: Date.now(),
	};
}

function normalizePet(raw) {
	let pet = Object.assign(defaultPet(), raw || {});
	if (!TYPE_MAP[pet.type]) pet.type = 'cloud';
	pet.level = Math.max(1, Number(pet.level || 1));
	pet.exp = clamp(pet.exp, 0, 99999);
	pet.hunger = clamp(pet.hunger, 0, 100);
	pet.health = clamp(pet.health, 0, 100);
	let hours = Math.max(0, (Date.now() - Number(pet.lastCareTime || Date.now())) / 3600000);
	if (hours >= 1) {
		pet.hunger = clamp(pet.hunger - Math.floor(hours * 4), 0, 100);
		if (pet.hunger < 18) pet.health = clamp(pet.health - Math.floor(hours * 2), 0, 100);
		pet.lastCareTime = Date.now();
	}
	if (pet.health < 35) {
		pet.mood = 'sick';
		pet.moodText = '有点不舒服';
	} else if (pet.hunger < 25) {
		pet.mood = 'hungry';
		pet.moodText = '有点饿';
	} else if (pet.exp >= pet.level * 40) {
		pet.level += 1;
		pet.exp = 0;
		pet.mood = 'happy';
		pet.moodText = '升级啦';
	} else {
		pet.mood = pet.mood || 'happy';
		if (pet.mood == 'happy') {
			if (pet.hunger >= 80 && pet.health >= 80) pet.moodText = '元气满满';
			else if (pet.health < 60) pet.moodText = '有点疲惫';
			else pet.moodText = '状态很好';
		} else {
			pet.moodText = pet.moodText || '陪你工作';
		}
	}
	return pet;
}

function getMode(route) {
	route = String(route || '');
	if (route.includes('/calendar/')) return { mode: 'calendar', bubble: '今天档期我盯着' };
	if (route.includes('/performance/')) return { mode: 'performance', bubble: '业绩只给你看重点' };
	if (route.includes('/order_edit/') || route.includes('/add/')) return { mode: 'order', bubble: '记得保存订单' };
	if (route.includes('/admin_')) return { mode: 'admin', bubble: '管理中心在线' };
	if (route.includes('/my/')) return { mode: 'my', bubble: '可以在这里照顾我' };
	return { mode: 'normal', bubble: '我在这里' };
}

function defaultPos() {
	try {
		let sys = wx.getSystemInfoSync();
		return {
			x: Math.max(8, sys.windowWidth - 92),
			y: Math.max(90, sys.windowHeight - 104),
		};
	} catch (e) {
		return { x: 292, y: 540 };
	}
}

function normalizePos(pos) {
	let base = defaultPos();
	pos = Object.assign(base, pos || {});
	try {
		let sys = wx.getSystemInfoSync();
		pos.x = clamp(pos.x, 6, Math.max(6, sys.windowWidth - PET_BOX.width));
		pos.y = clamp(pos.y, 58, Math.max(58, sys.windowHeight - PET_BOX.height - 6));
	} catch (e) {}
	return pos;
}

function defaultMessages() {
	return [{
		role: 'assistant',
		content: '我在值班。可以帮你查档期、看小记、识别截图录订单、记录事项/休息，也能整理客户跟进话术。高风险的收款、提成、工资和审核我会提醒你走管理中心。',
	}];
}

function genThreadId() {
	return 't' + Date.now() + Math.floor(Math.random() * 1000);
}

function makeThread(title) {
	let now = Date.now();
	return {
		id: genThreadId(),
		title: title || '新对话',
		messages: defaultMessages(),
		createTime: now,
		updateTime: now,
		contextLimit: DEFAULT_CONTEXT_LIMIT,
		contextUsed: 0,
		contextPercent: 0,
		contextStyle: 'background: conic-gradient(#537d96 0deg, #e6ded1 0deg);',
	};
}

function trimMessages(list) {
	list = Array.isArray(list) ? list : [];
	return list
		.filter(item => item && (item.role == 'user' || item.role == 'assistant') && item.content)
		.slice(-12)
		.map(item => ({
			role: item.role,
			content: String(item.content || '').slice(0, item.role == 'assistant' ? 4000 : 800),
			images: normalizeMessageImages(item.images || item.attachments || []),
		}));
}

function normalizeMessageImages(images) {
	if (!Array.isArray(images)) return [];
	return images
		.filter(item => item && (item.src || item.path || item.localPath || item.fileID))
		.slice(0, 4)
		.map(item => ({
			src: String(item.src || item.localPath || item.path || '').slice(0, 600),
			fileID: String(item.fileID || '').slice(0, 500),
			name: String(item.name || '图片').slice(0, 80),
		}));
}

function buildThreadTitle(messages) {
	let user = (messages || []).find(item => item && item.role == 'user' && item.content);
	if (!user) return '新对话';
	let title = String(user.content || '').replace(/\s*\[已附加\d+张图片\]\s*/g, '').replace(/\s+/g, ' ').trim();
	return title ? title.slice(0, 16) : '图片识别对话';
}

function estimateTokens(messages) {
	let items = messages || [];
	let text = items.map(item => item && item.content ? item.content : '').join('\n');
	let zh = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
	let other = Math.max(0, text.length - zh);
	let textTokens = Math.ceil(zh * 2 + other / 4);
	let imgCount = items.reduce((sum, item) => sum + (item && item.images ? item.images.length : 0), 0);
	return Math.max(0, textTokens + imgCount * 800);
}

function ensureLocalImageDir() {
	if (!wx.getFileSystemManager || !wx.env || !wx.env.USER_DATA_PATH) return '';
	let fs = wx.getFileSystemManager();
	let dir = wx.env.USER_DATA_PATH + '/' + LOCAL_IMAGE_DIR;
	try {
		fs.accessSync(dir);
	} catch (err) {
		try {
			fs.mkdirSync(dir, true);
		} catch (e) {}
	}
	return dir;
}

function contextLimitByModel(model) {
	model = String(model || '').toLowerCase();
	if (!model) return DEFAULT_CONTEXT_LIMIT;
	if (model.includes('gemini-1.5') || model.includes('agnes-1.5') || model.includes('agnes-2.0') || model.includes('flash')) return 1000000;
	if (model.includes('gpt-4.1') || model.includes('gpt-4o') || model.includes('claude-3-5') || model.includes('claude-3-7') || model.includes('claude-4') || model.includes('claude-sonnet-4') || model.includes('claude-opus-4')) return 128000;
	if (model.includes('deepseek')) return 64000;
	if (model.includes('qwen-long')) return 1000000;
	if (model.includes('qwen')) return 128000;
	return DEFAULT_CONTEXT_LIMIT;
}

function decorateThread(thread, model) {
	thread = Object.assign(makeThread(), thread || {});
	thread.messages = trimMessages(thread.messages || []);
	if (!thread.messages.length) thread.messages = defaultMessages();
	thread.title = thread.title || buildThreadTitle(thread.messages);
	thread.contextLimit = Number(thread.contextLimit || 0) || contextLimitByModel(model);
	thread.contextUsed = Number(thread.contextUsed || 0) || estimateTokens(thread.messages);
	let percent = thread.contextLimit ? Math.min(99, Math.round(thread.contextUsed * 100 / thread.contextLimit)) : 0;
	thread.contextPercent = Math.max(0, percent);
	thread.contextStyle = 'background: conic-gradient(#537d96 ' + Math.round(percent * 3.6) + 'deg, #e6ded1 0deg);';
	return thread;
}

function sortThreads(list) {
	return (list || []).sort((a, b) => Number(b.updateTime || 0) - Number(a.updateTime || 0));
}

function buildNoticeItems(items) {
	items = Array.isArray(items) ? items : [];
	let list = [];
	for (let item of items) {
		let text = String(item || '').trim();
		if (!text) continue;
		let parts = text.split(/[；;。]\s*/).map(part => part.trim()).filter(part => part);
		list = list.concat(parts);
	}
	return list.length ? list.slice(0, 8) : ['小程序已更新。'];
}

Component({
	data: {
		pet: defaultPet(),
		mode: 'normal',
		bubble: '',
		toolIcon: '云',
		burst: false,
		pos: defaultPos(),
			dragging: false,
			hasMoved: false,
			chatVisible: false,
			chatFullscreen: false,
			sidebarVisible: true,
			chatThreads: [],
			activeChatId: '',
			chatMessages: defaultMessages(),
			chatInput: '',
			chatAttachments: [],
			uploadingAttachment: false,
			chatLoading: false,
			chatAnchor: 'chat-bottom',
			activeThread: decorateThread(makeThread()),
			agentInfoVisible: false,
			agentInfo: null,
			versionNoticeVisible: false,
			versionNotice: null,
		},
	lifetimes: {
		attached() {
			this.refresh();
		},
		detached() {
			if (this._scrollTimer1) { clearTimeout(this._scrollTimer1); this._scrollTimer1 = null; }
			if (this._scrollTimer2) { clearTimeout(this._scrollTimer2); this._scrollTimer2 = null; }
			if (this._burstTimer) { clearTimeout(this._burstTimer); this._burstTimer = null; }
		},
	},
	pageLifetimes: {
		show() {
			this.refresh();
		},
	},
	methods: {
		refresh() {
			let pet = normalizePet(wx.getStorageSync(STORAGE_KEY) || {});
			wx.setStorageSync(STORAGE_KEY, pet);
			let pages = getCurrentPages();
			let route = pages.length ? pages[pages.length - 1].route : '';
			let pageMeta = getMode(route);
			let pos = normalizePos(wx.getStorageSync(POS_KEY) || {});
			this.setData({
				pet,
				mode: pageMeta.mode,
				bubble: this.data.burst ? pageMeta.bubble : '',
				toolIcon: TYPE_MAP[pet.type].icon,
				pos,
			});
		},
		savePet(pet) {
			pet = normalizePet(pet);
			wx.setStorageSync(STORAGE_KEY, pet);
			this.setData({ pet, toolIcon: TYPE_MAP[pet.type].icon });
			return pet;
		},
		bindPetTap() {
			if (this.data.dragging || Date.now() < (this._tapBlockedUntil || 0)) return;
			if (this.data.hasMoved) return;
			let oldLevel = Number(this.data.pet.level || 1);
			let pet = normalizePet(this.data.pet);
			pet.exp = clamp(pet.exp + 5, 0, 99999);
			pet.hunger = clamp(pet.hunger + 10, 0, 100);
			if (pet.health < 80) pet.health = clamp(pet.health + 3, 0, 100);
			if (pet.health < 35) { pet.mood = 'sick'; pet.moodText = '好一点了'; }
			else if (pet.hunger < 25) { pet.mood = 'hungry'; pet.moodText = '吃饱啦'; }
			else { pet.mood = 'happy'; pet.moodText = '在呢'; }
			pet = this.savePet(pet);
			let leveled = pet.level > oldLevel;
			let bubble = leveled
				? '升级啦！Lv.' + pet.level
				: (pet.mood === 'sick' ? '好一点了' : (pet.mood === 'hungry' ? '吃饱啦' : '在呢'));
			this.openChat(bubble);
			if (this._burstTimer) clearTimeout(this._burstTimer);
			this._burstTimer = setTimeout(() => {
				this.setData({ burst: false, bubble: '' });
				this._burstTimer = null;
			}, leveled ? 2500 : 1500);
		},
		openChat(bubble) {
			let state = this._loadThreads();
			this.setData({
				chatVisible: true,
				chatFullscreen: false,
				sidebarVisible: true,
				chatThreads: state.threads,
				activeChatId: state.activeId,
				activeThread: state.activeThread,
				chatMessages: state.activeThread.messages,
				burst: true,
				bubble: bubble || '',
			});
			this._scrollChatToBottom();
		},
		bindChatClose() {
			if (this._scrollTimer1) { clearTimeout(this._scrollTimer1); this._scrollTimer1 = null; }
			if (this._scrollTimer2) { clearTimeout(this._scrollTimer2); this._scrollTimer2 = null; }
			this.setData({ chatVisible: false, chatInput: '', chatFullscreen: false, sidebarVisible: true });
		},
		bindToggleFullscreen() {
			let next = !this.data.chatFullscreen;
			this.setData({ chatFullscreen: next, sidebarVisible: next ? false : true });
			this._scrollChatToBottom();
		},
		bindToggleSidebar() {
			this.setData({ sidebarVisible: !this.data.sidebarVisible });
		},
		bindHideSidebar() {
			if (!this.data.chatFullscreen || !this.data.sidebarVisible) return;
			this.setData({ sidebarVisible: false });
		},
		showVersionNotice(notice = {}) {
			if (!notice.version) return;
			let items = buildNoticeItems(notice.items || [notice.summary]);
			this.setData({
				versionNoticeVisible: true,
				versionNotice: Object.assign({}, notice, { items }),
			});
		},
		bindVersionNoticeClose() {
			this.setData({ versionNoticeVisible: false });
		},
		bindVersionNoticeMute() {
			let notice = this.data.versionNotice || {};
			if (notice.version) wx.setStorageSync(VERSION_NOTICE_KEY, notice.version);
			this.setData({ versionNoticeVisible: false });
		},
		bindCopyMessage(e) {
			let content = e.currentTarget.dataset.content || '';
			if (!content) return;
			wx.setClipboardData({
				data: content,
				success: () => wx.showToast({ title: '已复制', icon: 'success', duration: 1200 }),
			});
		},
		noop() {},
		bindChatInput(e) {
			this.setData({ chatInput: e.detail.value });
		},
		bindAttachTap() {
			if (this.data.chatLoading || this.data.uploadingAttachment) return;
			wx.showActionSheet({
				itemList: ['选择图片', '选择聊天文件'],
				success: res => {
					if (res.tapIndex === 0) this._chooseImageAttachment();
					if (res.tapIndex === 1) this._chooseFileAttachment();
				},
			});
		},
		_chooseImageAttachment() {
			wx.chooseImage({
				count: Math.max(1, 4 - (this.data.chatAttachments || []).length),
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async res => {
					let paths = res.tempFilePaths || [];
					await this._uploadAttachments(paths.map((path, idx) => ({
						path,
						name: '截图' + (idx + 1) + '.jpg',
						type: 'image',
					})));
				},
			});
		},
		_chooseFileAttachment() {
			if (!wx.chooseMessageFile) {
				wx.showToast({ title: '当前微信版本不支持文件选择', icon: 'none' });
				return;
			}
			wx.chooseMessageFile({
				count: Math.max(1, 4 - (this.data.chatAttachments || []).length),
				type: 'image',
				success: async res => {
					let files = (res.tempFiles || []).map(file => ({
						path: file.path,
						name: file.name || '图片',
						type: 'image',
					}));
					await this._uploadAttachments(files);
				},
			});
		},
		async _uploadAttachments(files) {
			files = (files || []).filter(item => item && item.path);
			if (!files.length) return;
			let current = this.data.chatAttachments || [];
			if (current.length >= 4) return wx.showToast({ title: '最多添加4张图片', icon: 'none' });
			files = files.slice(0, 4 - current.length);
			this.setData({ uploadingAttachment: true });
			wx.showLoading({ title: '上传中', mask: true });
			try {
				let add = [];
				if (guestHelper.isGuest()) {
					for (let idx = 0; idx < files.length; idx++) {
						let localPath = await this._saveLocalImage(files[idx].path, idx);
						add.push({
							fileID: '',
							name: files[idx].name || ('图片' + (idx + 1)),
							type: 'image',
							localPath: localPath || files[idx].path,
							src: localPath || files[idx].path,
							isGuestLocal: 1,
						});
					}
				} else {
					let paths = files.map(item => item.path);
					let fileIDs = await cloudHelper.transTempPics(paths, 'work/ai/', '');
					if (!Array.isArray(fileIDs)) fileIDs = [];
					for (let idx = 0; idx < fileIDs.length && idx < files.length; idx++) {
						let localPath = await this._saveLocalImage(files[idx].path, idx);
						add.push({
							fileID: fileIDs[idx],
							name: files[idx].name || ('图片' + (idx + 1)),
							type: 'image',
							localPath: localPath || files[idx].path,
							src: localPath || files[idx].path,
						});
					}
				}
				this.setData({ chatAttachments: current.concat(add) });
				let total = current.length + add.length;
				wx.showToast({ title: '已添加' + total + '张图片', icon: 'success', duration: 1200 });
			} catch (err) {
				console.error(err);
				wx.showToast({ title: '上传失败', icon: 'none' });
			} finally {
				wx.hideLoading();
				this.setData({ uploadingAttachment: false });
			}
		},
		_saveLocalImage(path, idx = 0) {
			return new Promise(resolve => {
				if (!path || !wx.getFileSystemManager || !wx.env || !wx.env.USER_DATA_PATH) return resolve(path || '');
				let dir = ensureLocalImageDir();
				if (!dir) return resolve(path);
				let ext = '.jpg';
				let m = String(path).match(/\.(png|jpe?g|webp|gif|bmp)(\?|$)/i);
				if (m && m[1]) ext = '.' + m[1].toLowerCase().replace('jpeg', 'jpg');
				let target = dir + '/' + Date.now() + '_' + idx + ext;
				wx.getFileSystemManager().copyFile({
					srcPath: path,
					destPath: target,
					success: () => resolve(target),
					fail: () => {
						if (!wx.saveFile) return resolve(path);
						wx.saveFile({
							tempFilePath: path,
							success: res => resolve(res.savedFilePath || path),
							fail: () => resolve(path),
						});
					},
				});
			});
		},
		bindRemoveAttachment(e) {
			let idx = Number(e.currentTarget.dataset.idx || 0);
			let list = [...(this.data.chatAttachments || [])];
			list.splice(idx, 1);
			this.setData({ chatAttachments: list });
		},
		bindClearAttachments() {
			this.setData({ chatAttachments: [] });
		},
		bindPreviewMessageImage(e) {
			let src = e.currentTarget.dataset.src || '';
			if (!src) return;
			let urls = [];
			for (let msg of (this.data.chatMessages || [])) {
				for (let img of (msg.images || [])) {
					if (img && img.src) urls.push(img.src);
				}
			}
			if (!urls.length) urls = [src];
			wx.previewImage({ current: src, urls });
		},
		bindPreviewAttachment(e) {
			let src = e.currentTarget.dataset.src || '';
			if (!src) return;
			let urls = (this.data.chatAttachments || []).map(item => item.src || item.localPath || item.path).filter(Boolean);
			wx.previewImage({ current: src, urls: urls.length ? urls : [src] });
		},
		bindQuickAsk(e) {
			let text = e.currentTarget.dataset.text || '';
			if (text.includes('截图') && !(this.data.chatAttachments || []).length) {
				if (guestHelper.isGuest()) {
					let guestMsg = { role: 'assistant', content: '访客模式不支持截图 AI 识别。你可以直接用文字告诉我订单信息，例如：\n"6月20日10:00 罗雅 外景写真 金额299 定金150"\n\n绑定员工后可使用完整截图录单功能。' };
					let messages = trimMessages((this.data.chatMessages || []).concat([guestMsg]));
					this.setData({ chatMessages: messages });
					this._saveChat(messages);
					this._scrollChatToBottom();
					return;
				}
				this.setData({ chatInput: text });
				this._chooseImageAttachment();
				return;
			}
			this.setData({ chatInput: text }, () => this.bindChatSend());
		},
		async bindChatSend() {
			if (this._isSending || this.data.chatLoading) return;
			this._isSending = true;
			try {
				let text = String(this.data.chatInput || '').trim();
				let originalInput = text;
				let attachments = this.data.chatAttachments || [];
				let originalAttachments = attachments.slice();
				if (!text && !attachments.length) {
					wx.showToast({ title: '请输入消息或上传图片', icon: 'none', duration: 1500 });
					return;
				}
				if (!text && attachments.length) text = '请逐张识别我上传的所有截图里的档期/订单信息；一张图可能包含多个订单，能确认的都帮我记录到系统里，不要只记录第一条。';

				let messageImages = attachments.map(item => ({
					src: item.src || item.localPath || item.path || '',
					fileID: item.fileID || '',
					name: item.name || '图片',
				}));
				let displayText = text + (attachments.length ? `\n[已附加${attachments.length}张图片]` : '');
				let messages = trimMessages((this.data.chatMessages || []).concat([{ role: 'user', content: displayText, images: messageImages }]));
				this.setData({ chatMessages: messages, chatInput: '', chatAttachments: [], chatLoading: true });
				this._saveChat(messages);
				this._scrollChatToBottom();

				try {
					let reply = '';
					if (guestHelper.isGuest()) {
						let guestRet = guestHelper.handleGuestAgent(text, attachments);
						reply = guestRet.reply;
						if (guestRet.created) this._refreshPageAfterAgentAction({
							action: 'create_order',
							data: { date: guestRet.date },
						});
					} else {
						let history = trimMessages(messages.slice(0, -1));
						let res = await cloudHelper.callCloud('work/ai_chat', {
							message: text,
							history,
							attachments,
							pageContext: this._getPageContext(),
						}, { hint: false });
						let data = res && res.data ? res.data : {};
						reply = data.reply || '我收到啦，但 AI 没有返回文字。';
						this._applyContextMeta(data);
						this._refreshPageAfterAgentAction(data);
					}
					messages = trimMessages(messages.concat([{ role: 'assistant', content: reply }]));
				} catch (err) {
					let msg = (err && err.msg) || (err && err.message) || 'AI 小助手暂时不可用，请稍后再试。';
					messages = trimMessages(messages.concat([{ role: 'assistant', content: msg }]));
				}

				this.setData({ chatMessages: messages, chatLoading: false });
				this._saveChat(messages);
				this._scrollChatToBottom();
			} finally {
				this._isSending = false;
			}
		},
		_saveChat(messages) {
			messages = trimMessages(messages);
			let state = this._loadThreads();
			let threads = state.threads;
			let activeId = this.data.activeChatId || state.activeId;
			let thread = threads.find(item => item.id == activeId);
			if (!thread) {
				thread = makeThread();
				threads.unshift(thread);
				activeId = thread.id;
			}
			thread.messages = messages;
			thread.title = buildThreadTitle(messages);
			thread.updateTime = Date.now();
			thread.contextUsed = this._lastContextUsed || estimateTokens(messages);
			thread.contextLimit = this._lastContextLimit || (this.data.activeThread && this.data.activeThread.contextLimit ? this.data.activeThread.contextLimit : thread.contextLimit);
			this._lastContextUsed = 0;
			this._lastContextLimit = 0;
			thread = decorateThread(thread);
			threads = sortThreads(threads.map(item => item.id == activeId ? thread : decorateThread(item))).slice(0, 20);
			wx.setStorageSync(CHAT_THREADS_KEY, threads);
			wx.setStorageSync(ACTIVE_CHAT_KEY, activeId);
			wx.setStorageSync(CHAT_KEY, messages);
			this.setData({
				chatThreads: threads,
				activeChatId: activeId,
				activeThread: thread,
			});
		},
		_getPageContext() {
			let pages = getCurrentPages();
			let page = pages && pages.length ? pages[pages.length - 1] : null;
			if (!page) return {};
			return {
				route: page.route || '',
				orderId: page.data && page.data.id ? page.data.id : '',
				day: page.data && page.data.day ? page.data.day : '',
			};
		},
		_loadThreads() {
			let threads = wx.getStorageSync(CHAT_THREADS_KEY) || [];
			if (!Array.isArray(threads)) threads = [];
			let activeId = wx.getStorageSync(ACTIVE_CHAT_KEY) || '';
			if (!threads.length) {
				let oldMessages = trimMessages(wx.getStorageSync(CHAT_KEY) || []);
				let thread = makeThread(oldMessages.length ? buildThreadTitle(oldMessages) : '新对话');
				thread.messages = oldMessages.length ? oldMessages : defaultMessages();
				thread = decorateThread(thread);
				threads = [thread];
				activeId = thread.id;
				wx.setStorageSync(CHAT_THREADS_KEY, threads);
				wx.setStorageSync(ACTIVE_CHAT_KEY, activeId);
			}
			threads = sortThreads(threads.map(item => decorateThread(item))).slice(0, 20);
			let activeThread = threads.find(item => item.id == activeId) || threads[0];
			activeId = activeThread.id;
			return { threads, activeId, activeThread };
		},
		bindNewChat() {
			let threads = this._loadThreads().threads;
			let thread = decorateThread(makeThread());
			threads = sortThreads([thread].concat(threads)).slice(0, 20);
			wx.setStorageSync(CHAT_THREADS_KEY, threads);
			wx.setStorageSync(ACTIVE_CHAT_KEY, thread.id);
			this.setData({
				chatThreads: threads,
				activeChatId: thread.id,
				activeThread: thread,
				chatMessages: thread.messages,
				chatInput: '',
				chatAttachments: [],
			});
			this._scrollChatToBottom();
		},
		bindSwitchChat(e) {
			let id = e.currentTarget.dataset.id || '';
			let state = this._loadThreads();
			let thread = state.threads.find(item => item.id == id);
			if (!thread) return;
			wx.setStorageSync(ACTIVE_CHAT_KEY, id);
			this.setData({
				activeChatId: id,
				activeThread: thread,
				chatMessages: thread.messages,
				chatInput: '',
				chatAttachments: [],
			});
			this._scrollChatToBottom();
		},
		bindDeleteChat(e) {
			let id = e.currentTarget.dataset.id || this.data.activeChatId;
			wx.showModal({
				title: '删除对话',
				content: '只会删除本机这条聊天记录，不影响订单、档期和小记。',
				confirmText: '删除',
				confirmColor: '#dc2626',
				success: res => {
					if (!res.confirm) return;
					let threads = this._loadThreads().threads.filter(item => item.id != id);
					if (!threads.length) threads = [decorateThread(makeThread())];
					let active = threads[0];
					wx.setStorageSync(CHAT_THREADS_KEY, threads);
					wx.setStorageSync(ACTIVE_CHAT_KEY, active.id);
					this.setData({
						chatThreads: threads,
						activeChatId: active.id,
						activeThread: active,
						chatMessages: active.messages,
						chatInput: '',
						chatAttachments: [],
					});
					this._scrollChatToBottom();
				},
			});
		},
		_applyContextMeta(data = {}) {
			this._lastAgentModel = data.model || this._lastAgentModel || '';
			this._lastProviderName = data.providerName || this._lastProviderName || '';
			let metaLimit = Number(data.contextLimit || 0) || contextLimitByModel(data.model || '');
			let usage = data.usage || {};
			let used = Number(usage.total_tokens || usage.totalTokens || 0);
			let messages = this.data.chatMessages || [];
			if (!used) used = estimateTokens(messages);
			let thread = Object.assign({}, this.data.activeThread || {});
			thread.contextLimit = metaLimit || thread.contextLimit || DEFAULT_CONTEXT_LIMIT;
			thread.contextUsed = Math.max(used, estimateTokens(messages));
			this._lastContextLimit = thread.contextLimit;
			this._lastContextUsed = thread.contextUsed;
			this.setData({ activeThread: decorateThread(thread, data.model) });
		},
		bindOpenAgentInfo() {
			let thread = this.data.activeThread || {};
			let model = this._lastAgentModel || '等待首次AI回复后显示';
			let provider = this._lastProviderName || '管理员配置的兼容接口';
			this.setData({
				agentInfoVisible: true,
				agentInfo: {
					name: AGENT_VERSION.name,
					version: AGENT_VERSION.version,
					date: AGENT_VERSION.date,
					provider,
					model,
					context: `${thread.contextUsed || 0} / ${thread.contextLimit || DEFAULT_CONTEXT_LIMIT}`,
					items: AGENT_VERSION.items,
				},
			});
		},
		bindCloseAgentInfo() {
			this.setData({ agentInfoVisible: false });
		},
		_scrollChatToBottom() {
			if (this._scrollTimer1) clearTimeout(this._scrollTimer1);
			if (this._scrollTimer2) clearTimeout(this._scrollTimer2);
			this._scrollTimer1 = setTimeout(() => {
				this.setData({ chatAnchor: '' });
				this._scrollTimer2 = setTimeout(() => {
					this.setData({ chatAnchor: 'chat-bottom' });
					this._scrollTimer2 = null;
				}, 80);
				this._scrollTimer1 = null;
			}, 60);
		},
		_refreshPageAfterAgentAction(data = {}) {
			let action = data.action || '';
			if (action == 'create_note') action = 'add_note';
			if (!['create_order', 'create_orders', 'join_order', 'create_item', 'create_rest', 'add_note'].includes(action)) return;
			let day = data.data && data.data.date ? data.data.date : '';
			if (!day && data.data && Array.isArray(data.data.dates) && data.data.dates.length) day = data.data.dates.slice().sort()[0];
			if (day) wx.setStorageSync('WORK_CALENDAR_DAY', day);
			let pages = getCurrentPages();
			let page = pages && pages.length ? pages[pages.length - 1] : null;
			if (!page) return;
			setTimeout(async () => {
				try {
					let curPages = getCurrentPages();
					let curPage = curPages && curPages.length ? curPages[curPages.length - 1] : null;
					if (!curPage || curPage !== page) return;
					if (typeof page._loadDay == 'function') await page._loadDay();
					if (typeof page._loadCalendar == 'function') await page._loadCalendar();
					if (typeof page._loadList == 'function') await page._loadList();
				} catch (err) {
					console.error(err);
				}
			}, 300);
		},
		bindClearChat() {
			let messages = defaultMessages();
			this.setData({ chatMessages: messages, chatInput: '', chatAttachments: [] });
			this._saveChat(messages);
			this._scrollChatToBottom();
		},
		bindTouchStart() {
			this._pendingPos = this.data.pos;
			this._hasMovedDuringTouch = false;
			this.setData({
				dragging: true,
				bubble: '轻轻拎住啦',
				hasMoved: false,
			});
		},
		bindMoveChange(e) {
			if (!e || !e.detail) return;
			let pos = normalizePos({
				x: e.detail.x,
				y: e.detail.y,
			});
			this._pendingPos = pos;
			if (Math.abs(pos.x - this.data.pos.x) > 3 || Math.abs(pos.y - this.data.pos.y) > 3) {
				this._hasMovedDuringTouch = true;
			}
		},
		bindTouchEnd() {
			let pos = normalizePos(this._pendingPos || this.data.pos);
			let moved = !!this._hasMovedDuringTouch;
			wx.setStorageSync(POS_KEY, pos);
			if (moved) this._tapBlockedUntil = Date.now() + 220;
			this.setData({
				pos,
				dragging: false,
				hasMoved: moved,
				bubble: '',
			});
			setTimeout(() => this.setData({ hasMoved: false }), 220);
		},
	},
});
