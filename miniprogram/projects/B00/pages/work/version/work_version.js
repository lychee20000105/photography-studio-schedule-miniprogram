const ProjectBiz = require('../../../biz/project_biz.js');
const versionInfo = require('../../../../../version.js');

Page({
	data: {
		versionInfo,
		history: [],
		runtime: null,
	},
	onLoad: function () {
		ProjectBiz.initPage(this, { isLoadSkin: true });
		let runtime = this._getRuntimeVersion();
		let history = Array.isArray(versionInfo.history) && versionInfo.history.length
			? versionInfo.history
			: [{
				version: versionInfo.current,
				date: versionInfo.date,
				name: versionInfo.name,
				summary: versionInfo.summary,
				items: [versionInfo.summary],
			}];
		history = history.map(item => this._decorateVersion(item, runtime));
		this.setData({ history, runtime });
	},

	_getRuntimeVersion: function () {
		let runtime = {
			version: versionInfo.current,
			envVersion: 'develop',
			envText: '研发版本',
			sourceText: '本地研发版本',
		};
		try {
			if (wx.getAccountInfoSync) {
				let info = wx.getAccountInfoSync();
				let mini = info && info.miniProgram ? info.miniProgram : {};
				if (mini.version) runtime.version = mini.version;
				if (mini.envVersion) runtime.envVersion = mini.envVersion;
			}
		} catch (e) {}
		if (runtime.envVersion == 'release') {
			runtime.envText = '当前发布版本';
			runtime.sourceText = '微信正式版运行版本';
		} else if (runtime.envVersion == 'trial') {
			runtime.envText = '体验版版本';
			runtime.sourceText = '微信体验版运行版本';
		}
		return runtime;
	},

	_versionValue: function (version) {
		let arr = String(version || '0').split('.');
		let major = Number(arr[0] || 0);
		let minor = Number(arr[1] || 0);
		return major * 10000 + minor;
	},

	_decorateVersion: function (item, runtime) {
		item = Object.assign({}, item || {});
		let cmp = this._versionValue(item.version) - this._versionValue(runtime.version);
		if (cmp == 0) {
			item.statusText = runtime.envVersion == 'release' ? '当前版本' : '研发版本';
			item.statusClass = 'current';
		} else if (cmp > 0) {
			item.statusText = runtime.envVersion == 'release' ? '待发布' : '版本预告';
			item.statusClass = 'future';
		} else {
			item.statusText = '历史版本';
			item.statusClass = 'history';
		}
		return item;
	},
});
