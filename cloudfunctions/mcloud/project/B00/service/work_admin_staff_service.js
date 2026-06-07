/**
 * Notes: 云屿摄影小程序内员工管理
 */

const BaseProjectService = require('./base_project_service.js');
const WorkStaffModel = require('../model/work_staff_model.js');
const util = require('../../../framework/utils/util.js');

class WorkAdminStaffService extends BaseProjectService {

	async getStaffList() {
		let list = await WorkStaffModel.getAll({
			_pid: util.getProjectId(),
		}, '*', {
			STAFF_STATUS: 'desc',
			STAFF_NAME: 'asc',
		}, 1000);
		return list || [];
	}

	async saveStaff(input) {
		input = input || {};
		let id = input._id || input.id || '';
		let name = String(input.STAFF_NAME || '').trim();
		let mobile = String(input.STAFF_MOBILE || '').trim();
		let bindCode = String(input.STAFF_BIND_CODE || '').trim();

		if (!name) this.AppError('请填写员工姓名');
		if (!/^1[3-9]\d{9}$/.test(mobile)) this.AppError('请填写11位手机号');
		if (!bindCode) this.AppError('请填写绑定码/工号');

		let whereMobile = {
			_pid: util.getProjectId(),
			STAFF_MOBILE: mobile,
		};
		if (id) whereMobile._id = ['<>', id];
		let cnt = await WorkStaffModel.count(whereMobile);
		if (cnt > 0) this.AppError('该手机号已经存在');

		let data = {
			STAFF_NAME: name,
			STAFF_MOBILE: mobile,
			STAFF_BIND_CODE: bindCode,
			STAFF_ROLES: Array.isArray(input.STAFF_ROLES) ? input.STAFF_ROLES.map(item => String(item || '').trim()).filter(item => item) : [],
			STAFF_RULES: this._cleanRules(input.STAFF_RULES),
			STAFF_IS_ADMIN: Number(input.STAFF_IS_ADMIN || 0),
			STAFF_STATUS: Number(input.STAFF_STATUS || 0) == 0 ? WorkStaffModel.STATUS.STOP : WorkStaffModel.STATUS.COMM,
		};
		if (input.STAFF_TEAM_ID !== undefined) data.STAFF_TEAM_ID = String(input.STAFF_TEAM_ID || '').trim();
		if (input.STAFF_TEAM_NAME !== undefined) data.STAFF_TEAM_NAME = String(input.STAFF_TEAM_NAME || '').trim();

		if (id) {
			let old = await WorkStaffModel.getOne({ _id: id, _pid: util.getProjectId() }, '_id');
			if (!old) this.AppError('员工不存在');
			await WorkStaffModel.edit(id, data);
		} else {
			data.STAFF_OPENID = '';
			data.STAFF_OPENID_BIND_STATUS = 0;
			id = await WorkStaffModel.insert(data);
		}
		return { id };
	}

	_cleanRules(rules) {
		if (!Array.isArray(rules)) return [];
		let ret = [];
		for (let item of rules) {
			if (!item || !item.roleName) continue;
			let mode = item.mode || 'percent';
			if (!['percent', 'fixed', 'manual', 'none'].includes(mode)) mode = 'percent';
			ret.push({
				roleName: String(item.roleName || '').trim(),
				mode,
				percent: Number(item.percent || 0),
				amount: Number(item.amount || 0),
			});
		}
		return ret;
	}
}

module.exports = WorkAdminStaffService;
