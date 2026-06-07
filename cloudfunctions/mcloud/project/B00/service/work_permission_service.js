/**
 * Notes: 云屿摄影工作台员工权限基础服务
 */

const BaseProjectService = require('./base_project_service.js');
const WorkStaffModel = require('../model/work_staff_model.js');
const util = require('../../../framework/utils/util.js');
const timeUtil = require('../../../framework/utils/time_util.js');

class WorkPermissionService extends BaseProjectService {

	async getStaffByOpenId(openId, must = true) {
		openId = String(openId || '').trim();
		if (!openId) {
			if (must) this.AppError('请先登录');
			return null;
		}

		let staff = await WorkStaffModel.getOne({
			_pid: util.getProjectId(),
			STAFF_OPENID: openId,
			STAFF_STATUS: WorkStaffModel.STATUS.COMM,
		}, '*', {
			STAFF_ADD_TIME: 'asc',
		});
		if (!staff) {
			if (must) this.AppError('请先在「我的」里绑定员工手机号');
			return null;
		}
		return staff;
	}

	async getEnabledStaffListByOpenId(openId) {
		openId = String(openId || '').trim();
		if (!openId) return [];
		return await WorkStaffModel.getAll({
			_pid: util.getProjectId(),
			STAFF_OPENID: openId,
			STAFF_STATUS: WorkStaffModel.STATUS.COMM,
		}, '*', {
			STAFF_ADD_TIME: 'asc',
		}, 1000);
	}

	async assertStaff(openId) {
		return await this.getStaffByOpenId(openId, true);
	}

	isAdminStaff(staff) {
		return !!(staff && staff.STAFF_STATUS == WorkStaffModel.STATUS.COMM && staff.STAFF_OPENID && Number(staff.STAFF_IS_ADMIN || 0) == 1);
	}

	async assertAdmin(openId, code) {
		let staff = await WorkStaffModel.getOne({
			_pid: util.getProjectId(),
			STAFF_OPENID: String(openId || '').trim(),
			STAFF_STATUS: WorkStaffModel.STATUS.COMM,
			STAFF_IS_ADMIN: 1,
		}, '*', {
			STAFF_ADD_TIME: 'asc',
		});
		if (!this.isAdminStaff(staff)) this.AppError('无管理权限', code);
		return staff;
	}

	cleanStaff(staff, withRules = false, withPrivate = false) {
		if (!staff) return null;
		let node = {
			_id: staff._id,
			STAFF_ID: staff.STAFF_ID,
			STAFF_NAME: staff.STAFF_NAME,
			STAFF_ROLES: staff.STAFF_ROLES || [],
			STAFF_IS_ADMIN: Number(staff.STAFF_IS_ADMIN || 0),
			STAFF_STATUS: staff.STAFF_STATUS,
			STAFF_OPENID_BIND_STATUS: Number(staff.STAFF_OPENID_BIND_STATUS || (staff.STAFF_OPENID ? 1 : 0)),
			STAFF_TEAM_ID: staff.STAFF_TEAM_ID || '',
			STAFF_TEAM_NAME: staff.STAFF_TEAM_NAME || '',
		};
		if (withRules || withPrivate) node.STAFF_PERMISSIONS = staff.STAFF_PERMISSIONS || [];
		if (withPrivate) node.STAFF_MOBILE = staff.STAFF_MOBILE;
		if (withRules) node.STAFF_RULES = staff.STAFF_RULES || [];
		return node;
	}

	async touchLogin(staffId) {
		if (!staffId) return;
		await WorkStaffModel.edit(staffId, { STAFF_LOGIN_TIME: timeUtil.time() });
	}
}

module.exports = WorkPermissionService;
