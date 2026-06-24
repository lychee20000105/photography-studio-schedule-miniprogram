/**
 * Notes: 管理员管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2025-07-11 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const util = require('../../../../framework/utils/util.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const AdminModel = require('../../../../framework/platform/model/admin_model.js');
const LogModel = require('../../../../framework/platform/model/log_model.js');

class AdminMgrService extends BaseProjectAdminService {

	//**管理员登录  */
	async adminLogin(name, password) {

		// H-03: 暴力破解防护 — 常量
		const LOCK_THRESHOLD = 5;           // 连续失败次数上限
		const LOCK_DURATION = 15 * 60;      // 锁定时长（秒），15 分钟

		// H-03: 先查锁定状态
		let lockWhere = {
			ADMIN_STATUS: 1,
			ADMIN_NAME: name
		};
		let lockFields = '_id,ADMIN_FAIL_CNT,ADMIN_FAIL_TIME';
		let lockAdmin = await AdminModel.getOne(lockWhere, lockFields);

		if (lockAdmin && (lockAdmin.ADMIN_FAIL_CNT || 0) >= LOCK_THRESHOLD) {
			let failTime = lockAdmin.ADMIN_FAIL_TIME || 0;
			let now = timeUtil.time();
			if (now - failTime < LOCK_DURATION) {
				let remainMin = Math.ceil((LOCK_DURATION - (now - failTime)) / 60);
				this.AppError('登录失败次数过多，请 ' + remainMin + ' 分钟后再试');
			} else {
				// 锁定已过期，重置计数
				await AdminModel.edit(lockAdmin._id, {
					ADMIN_FAIL_CNT: 0,
					ADMIN_FAIL_TIME: 0
				});
			}
		}

		// 正常登录查询
		let where = {
			ADMIN_STATUS: 1,
			ADMIN_NAME: name
		}
		let fields = '_id,ADMIN_ID,ADMIN_NAME,ADMIN_PASSWORD,ADMIN_DESC,ADMIN_TYPE,ADMIN_LOGIN_TIME,ADMIN_LOGIN_CNT';
		let admin = await AdminModel.getOne(where, fields);
		if (!admin || !dataUtil.verifyPassword(password, admin.ADMIN_PASSWORD)) {
			// H-03: 登录失败 — 累加失败计数
			if (lockAdmin && lockAdmin._id) {
				await AdminModel.edit(lockAdmin._id, {
					ADMIN_FAIL_CNT: (lockAdmin.ADMIN_FAIL_CNT || 0) + 1,
					ADMIN_FAIL_TIME: timeUtil.time()
				});
			}
			this.AppError('管理员不存在或者已停用');
		}

		// H-03: 登录成功 — 清除失败计数
		if (lockAdmin && (lockAdmin.ADMIN_FAIL_CNT || 0) > 0) {
			await AdminModel.edit(lockAdmin._id, {
				ADMIN_FAIL_CNT: 0,
				ADMIN_FAIL_TIME: 0
			});
		}

		let cnt = admin.ADMIN_LOGIN_CNT || 0;

		// 生成token
		let token = dataUtil.genRandomString(64);
		let tokenTime = timeUtil.time();
		let data = {
			ADMIN_TOKEN: token,
			ADMIN_TOKEN_TIME: tokenTime,
			ADMIN_LOGIN_TIME: timeUtil.time(),
			ADMIN_LOGIN_CNT: cnt + 1
		}
		if (dataUtil.needsPasswordHashUpgrade(admin.ADMIN_PASSWORD)) {
			data.ADMIN_PASSWORD = dataUtil.hashPassword(password);
		}
		await AdminModel.edit(admin._id, data);

		let type = admin.ADMIN_TYPE;
		let last = (!admin.ADMIN_LOGIN_TIME) ? '尚未登录' : timeUtil.timestamp2Time(admin.ADMIN_LOGIN_TIME);

		// 写日志
		this.insertLog('登录了系统', admin, LogModel.TYPE.SYS);

		return {
			token,
			name: admin.ADMIN_NAME,
			type,
			last,
			cnt
		}

	}

	async clearLog() {
		let where = {}
		await LogModel.del(where);
	}

	/** 取得日志分页列表 */
	async getLogList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件 
		page,
		size,
		oldTotal = 0
	}) {

		orderBy = orderBy || {
			LOG_ADD_TIME: 'desc'
		};
		let fields = '*';
		let where = {};

		if (util.isDefined(search) && search) {
			where.or = [{
				LOG_CONTENT: ['like', search]
			}, {
				LOG_ADMIN_DESC: ['like', search]
			}, {
				LOG_ADMIN_NAME: ['like', search]
			}];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'type':
					// 按类型
					where.LOG_TYPE = Number(sortVal);
					break;
			}
		}
		let result = await LogModel.getList(where, fields, orderBy, page, size, true, oldTotal);


		return result;
	}

	/** 获取所有管理员 */
	async getMgrList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {
		orderBy = {
			ADMIN_ADD_TIME: 'desc'
		}
		let fields = 'ADMIN_NAME,ADMIN_STATUS,ADMIN_PHONE,ADMIN_TYPE,ADMIN_LOGIN_CNT,ADMIN_LOGIN_TIME,ADMIN_DESC,ADMIN_EDIT_TIME,ADMIN_EDIT_IP';

		let where = {};
		where.and = {
			_pid: this.getProjectId() //复杂的查询在此处标注PID
		};
		if (util.isDefined(search) && search) {
			where.or = [{
				ADMIN_NAME: ['like', search]
			},
			{
				ADMIN_PHONE: ['like', search]
			},
			{
				ADMIN_DESC: ['like', search]
			}
			];
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					where.and.ADMIN_STATUS = Number(sortVal);
					break;
				case 'type':
					// 按类型
					where.and.ADMIN_TYPE = Number(sortVal);
					break;
			}
		}

		return await AdminModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 删除管理员 */
	async delMgr(id, myAdminId) {
		this.AppError('该功能暂不开放，如需开通请联系云屿科技技术支持');
	}

	/** 添加新的管理员 */
	async insertMgr({
		name,
		desc,
		phone,
		password
	}) {
		this.AppError('该功能暂不开放，如需开通请联系云屿科技技术支持');

	}

	/** 修改状态 */
	async statusMgr(id, status, myAdminId) {
		this.AppError('该功能暂不开放，如需开通请联系云屿科技技术支持');
	}


	/** 获取管理员信息 */
	async getMgrDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let mgr = await AdminModel.getOne(where, fields);
		if (!mgr) return null;

		return mgr;
	}

	/** 修改管理员 */
	async editMgr(id, {
		name,
		desc,
		phone,
		password
	}) {

		this.AppError('该功能暂不开放，如需开通请联系云屿科技技术支持');
	}

	/** 修改自身密码 */
	async pwdtMgr(adminId, oldPassword, password) {

		let where = {
			_id: adminId
		}
		let admin = await AdminModel.getOne(where, '_id,ADMIN_PASSWORD');
		if (!admin || !dataUtil.verifyPassword(oldPassword, admin.ADMIN_PASSWORD))
			this.AppError('旧密码错误');

		try {
			dataUtil.assertStrongPassword(password);
		} catch (err) {
			this.AppError('新密码强度不足：' + err.message);
		}

		let data = {
			ADMIN_PASSWORD: dataUtil.hashPassword(password),
			ADMIN_TOKEN: '',
			ADMIN_TOKEN_TIME: 0,
		}
		return await AdminModel.edit(adminId, data);
	}
}

module.exports = AdminMgrService;
