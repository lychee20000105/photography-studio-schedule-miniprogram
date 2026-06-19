/**
 * Notes: 预约后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2025-12-08 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const MeetService = require('../meet_service.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const setupUtil = require('../../../../framework/utils/setup/setup_util.js');
const util = require('../../../../framework/utils/util.js');
const cloudUtil = require('../../../../framework/cloud/cloud_util.js');
const cloudBase = require('../../../../framework/cloud/cloud_base.js');

const MeetModel = require('../../model/meet_model.js');
const JoinModel = require('../../model/join_model.js');
const DayModel = require('../../model/day_model.js');

const exportUtil = require('../../../../framework/utils/export_util.js');

const SETUP_MEET_TEMP_KEY = 'SETUP_MEET_TEMP';

// 导出报名数据KEY
const EXPORT_JOIN_DATA_KEY = 'EXPORT_JOIN_DATA';

class AdminMeetService extends BaseProjectAdminService {

	/** 预约数据列表 */
	async getDayList(meetId, start, end) {
		let where = {
			DAY_MEET_ID: meetId,
			day: ['between', start, end]
		}
		let orderBy = {
			day: 'asc'
		}
		return await DayModel.getAllBig(where, 'day,times,dayDesc', orderBy);
	}

	// 按项目统计人数
	async statJoinCntByMeet(meetId) {
		let days = await DayModel.getAll({
			DAY_MEET_ID: meetId
		}, 'day,times', {
			day: 'asc'
		});

		for (let k in days) {
			let times = days[k].times || [];
			for (let j in times) {
				times[j].stat = await this._statJoinCnt(meetId, times[j].mark);
			}
			await DayModel.edit(days[k]._id, {
				times
			});
		}
	}

	/** 自助签到码 */
	async genSelfCheckinQr(page, timeMark) {
		//生成小程序qr buffer
		let cloud = cloudBase.getCloud();

		if (page.startsWith('/projects/')) page = page.replace('/projects/', 'projects/');

		let result = await cloud.openapi.wxacode.getUnlimited({
			scene: timeMark,
			width: 280,
			check_path: false,
			env_version: 'release', //trial,develop
			page
		});

		let upload = await cloud.uploadFile({
			cloudPath: 'meet/usercheckin/' + timeMark + '.png',
			fileContent: result.buffer,
		});

		if (!upload || !upload.fileID) return;

		return upload.fileID;
	}

	/** 管理员按钮核销 */
	async checkinJoin(joinId, flag) {
		let where = {
			_id: joinId,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};
		let join = await JoinModel.getOne(where);
		if (!join) this.AppError('未找到可核销的预约记录');

		await JoinModel.edit(joinId, {
			JOIN_IS_CHECKIN: Number(flag)
		});
	}

	/** 管理员扫码核销 */
	async scanJoin(meetId, code) {
		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_CODE: code,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};
		let join = await JoinModel.getOne(where);
		if (!join) this.AppError('未找到可核销的预约记录');

		await JoinModel.edit(join._id, {
			JOIN_IS_CHECKIN: 1
		});
	}

	/**
	 * 判断本日是否有预约记录
	 * @param {*} daySet daysSet的节点
	 */
	checkHasJoinCnt(times) {
		if (!times) return false;
		for (let k in times) {
			if (times[k].stat.succCnt) return true;
		}
		return false;
	}

	// 判断含有预约的日期
	getCanModifyDaysSet(daysSet) {
		let now = timeUtil.time('Y-M-D');

		for (let k in daysSet) {
			if (daysSet[k].day < now) continue;
			daysSet[k].hasJoin = this.checkHasJoinCnt(daysSet[k].times);
		}

		return daysSet;
	}

	/** 取消某个时间段的所有预约记录 */
	async cancelJoinByTimeMark(admin, meetId, timeMark, reason) {
		let adminId = this._getAdminId(admin);
		let data = {
			JOIN_STATUS: JoinModel.STATUS.ADMIN_CANCEL,
			JOIN_REASON: reason || '',
			JOIN_IS_CHECKIN: 0,
			JOIN_EDIT_ADMIN_ID: adminId,
			JOIN_EDIT_ADMIN_NAME: admin.ADMIN_NAME,
			JOIN_EDIT_ADMIN_TIME: timeUtil.time(),
			JOIN_EDIT_ADMIN_STATUS: JoinModel.STATUS.ADMIN_CANCEL
		};

		await JoinModel.edit({
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: timeMark,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		}, data);

		return await this._updateTimeStat(meetId, timeMark);

	}


	/**添加 */
	async insertMeet(adminId, {
		title,
		order,
		typeId,
		typeName,
		daysSet,
		isShowLimit,
		formSet,
	}) {
		let data = {
			MEET_ADMIN_ID: adminId,
			MEET_TITLE: title,
			MEET_CONTENT: [],
			MEET_DAYS: dataUtil.getArrByKey(daysSet, 'day') || [],
			MEET_TYPE_ID: typeId,
			MEET_TYPE_NAME: typeName,
			MEET_IS_SHOW_LIMIT: isShowLimit,
			MEET_STYLE_SET: {
				pic: '',
				desc: ''
			},
			MEET_FORM_SET: formSet,
			MEET_STATUS: MeetModel.STATUS.COMM,
			MEET_ORDER: order
		};

		let id = await MeetModel.insert(data);
		await this._saveDays(id, daysSet);

		return {
			id
		};
	}

	/**删除数据 */
	async delMeet(id) {
		let cnt = await JoinModel.count({
			JOIN_MEET_ID: id
		});
		if (cnt > 0) this.AppError('该档期已有订单记录，不能直接删除，请先处理订单');

		await DayModel.del({
			DAY_MEET_ID: id
		});
		await MeetModel.del(id);
	}

	/**获取信息 */
	async getMeetDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let meet = await MeetModel.getOne(where, fields);
		if (!meet) return null;

		let meetService = new MeetService();
		meet.MEET_DAYS_SET = await meetService.getDaysSet(id, timeUtil.time('Y-M-D')); //今天及以后

		return meet;
	}

	/**
	 * 更新富文本详细的内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateMeetContent({
		id,
		content // 富文本数组
	}) {
		await MeetModel.edit(id, {
			MEET_CONTENT: content
		});

	}

	/**
	 * 更新封面内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateMeetStyleSet({
		meetId,
		styleSet
	}) {
		await MeetModel.edit(meetId, {
			MEET_STYLE_SET: styleSet
		});

	}

	/** 更新日期设置 */
	async _editDays(meetId, nowDay, daysSetData) {
		await this._saveDays(meetId, daysSetData, nowDay);
	}

	/**更新数据 */
	async editMeet({
		id,
		title,
		typeId,
		typeName,
		order,
		daysSet,
		isShowLimit,
		formSet
	}) {
		let meet = await MeetModel.getOne(id);
		if (!meet) this.AppError('预约项目不存在');

		let data = {
			MEET_TITLE: title,
			MEET_DAYS: dataUtil.getArrByKey(daysSet, 'day') || [],
			MEET_TYPE_ID: typeId,
			MEET_TYPE_NAME: typeName,
			MEET_IS_SHOW_LIMIT: isShowLimit,
			MEET_FORM_SET: formSet,
			MEET_ORDER: order
		};

		await MeetModel.edit(id, data);
		await this._editDays(id, timeUtil.time('Y-M-D'), daysSet);

	}

	/**预约名单分页列表 */
	async getJoinList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		meetId,
		mark,
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'JOIN_EDIT_TIME': 'desc'
		};
		let fields = 'JOIN_IS_CHECKIN,JOIN_CODE,JOIN_ID,JOIN_REASON,JOIN_USER_ID,JOIN_MEET_ID,JOIN_MEET_TITLE,JOIN_MEET_DAY,JOIN_MEET_TIME_START,JOIN_MEET_TIME_END,JOIN_MEET_TIME_MARK,JOIN_FORMS,JOIN_STATUS,JOIN_EDIT_TIME';

		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: mark
		};
		let safeSearch = dbUtil.fmtRegexKeyword(search);
		if (safeSearch) {
			where['JOIN_FORMS.val'] = {
				$regex: safeSearch,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					sortVal = Number(sortVal);
					if (sortVal == 1099) //取消的2种
						where.JOIN_STATUS = ['in', [10, 99]]
					else
						where.JOIN_STATUS = Number(sortVal);
					break;
				case 'checkin':
					// 签到
					where.JOIN_STATUS = JoinModel.STATUS.SUCC;
					if (sortVal == 1) {
						where.JOIN_IS_CHECKIN = 1;
					} else {
						where.JOIN_IS_CHECKIN = 0;
					}
					break;
			}
		}

		return await JoinModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**预约项目分页列表 */
	async getMeetList({
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

		orderBy = orderBy || {
			'MEET_ORDER': 'asc',
			'MEET_ADD_TIME': 'desc'
		};
		let fields = 'MEET_TYPE,MEET_TYPE_NAME,MEET_TITLE,MEET_STATUS,MEET_DAYS,MEET_ADD_TIME,MEET_EDIT_TIME,MEET_ORDER';

		let where = {};
		let safeSearch = dbUtil.fmtRegexKeyword(search);
		if (safeSearch) {
			where.MEET_TITLE = {
				$regex: safeSearch,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					where.MEET_STATUS = Number(sortVal);
					break;
				case 'typeId':
					// 按类型
					where.MEET_TYPE_ID = sortVal;
					break;
				case 'sort':
					// 排序
					if (sortVal == 'view') {
						orderBy = {
							'MEET_VIEW_CNT': 'desc',
							'MEET_ADD_TIME': 'desc'
						};
					}

					break;
			}
		}

		return await MeetModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 删除 */
	async delJoin(joinId) {
		let join = await JoinModel.getOne(joinId);
		if (!join) this.AppError('预约记录不存在');

		await JoinModel.del(joinId);
		return await this._updateTimeStat(join.JOIN_MEET_ID, join.JOIN_MEET_TIME_MARK);
	}

	/**修改报名状态 
	 * 特殊约定 99=>正常取消 
	 */
	async statusJoin(admin, joinId, status, reason = '') {
		let join = await JoinModel.getOne(joinId);
		if (!join) this.AppError('预约记录不存在');

		let adminId = this._getAdminId(admin);
		let data = {
			JOIN_STATUS: status,
			JOIN_REASON: reason || '',
			JOIN_IS_CHECKIN: 0,
			JOIN_EDIT_ADMIN_ID: adminId,
			JOIN_EDIT_ADMIN_NAME: admin.ADMIN_NAME,
			JOIN_EDIT_ADMIN_TIME: timeUtil.time(),
			JOIN_EDIT_ADMIN_STATUS: status
		};
		await JoinModel.edit(joinId, data);

		return await this._updateTimeStat(join.JOIN_MEET_ID, join.JOIN_MEET_TIME_MARK);
	}

	/**修改项目状态 */
	async statusMeet(id, status) {
		await MeetModel.edit(id, {
			MEET_STATUS: status
		});
	}

	/**置顶排序设定 */
	async sortMeet(id, sort) {
		await MeetModel.edit(id, {
			MEET_ORDER: sort
		});
	}

	//##################模板
	/**添加模板 */
	async insertMeetTemp({
		name,
		times,
	}) {
		let list = await setupUtil.get(SETUP_MEET_TEMP_KEY);
		if (!list || !Array.isArray(list)) list = [];

		list.unshift({
			id: dataUtil.makeID(),
			name,
			times,
			addTime: timeUtil.time()
		});

		await setupUtil.set(SETUP_MEET_TEMP_KEY, list);

	}

	/**更新数据 */
	async editMeetTemp({
		id,
		limit,
		isLimit
	}) {
		let list = await setupUtil.get(SETUP_MEET_TEMP_KEY);
		if (!list || !Array.isArray(list)) list = [];

		for (let k in list) {
			if (list[k].id == id) {
				for (let j in list[k].times) {
					list[k].times[j].limit = limit;
					list[k].times[j].isLimit = isLimit;
				}
				break;
			}
		}

		await setupUtil.set(SETUP_MEET_TEMP_KEY, list);
	}


	/**删除数据 */
	async delMeetTemp(id) {
		let list = await setupUtil.get(SETUP_MEET_TEMP_KEY);
		if (!list || !Array.isArray(list)) list = [];

		list = list.filter(item => item.id != id);
		await setupUtil.set(SETUP_MEET_TEMP_KEY, list);
	}


	/**模板列表 */
	async getMeetTempList() {
		let list = await setupUtil.get(SETUP_MEET_TEMP_KEY);
		if (!list || !Array.isArray(list)) list = [];
		return list;
	}

	// #####################导出报名数据
	/**获取报名数据 */
	async getJoinDataURL() {
		return await exportUtil.getExportDataURL(EXPORT_JOIN_DATA_KEY);
	}

	/**删除报名数据 */
	async deleteJoinDataExcel() {
		return await exportUtil.deleteDataExcel(EXPORT_JOIN_DATA_KEY);
	}

	/**导出报名数据 */
	async exportJoinDataExcel({
		meetId,
		startDay,
		endDay,
		status
	}) {
		let meet = await MeetModel.getOne(meetId, 'MEET_TITLE,MEET_FORM_SET');
		if (!meet) this.AppError('预约项目不存在');

		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_DAY: ['between', startDay, endDay],
			JOIN_STATUS: status
		};
		let orderBy = {
			JOIN_MEET_DAY: 'asc',
			JOIN_MEET_TIME_START: 'asc',
			JOIN_ADD_TIME: 'asc'
		};
		let list = await JoinModel.getAllBig(where, '*', orderBy);

		let header = ['预约项目', '日期', '开始时间', '结束时间', '状态', '是否签到', '提交时间'];
		let formTitles = [];
		for (let k in meet.MEET_FORM_SET) {
			if (meet.MEET_FORM_SET[k].type == 'image' || meet.MEET_FORM_SET[k].type == 'content') continue;
			formTitles.push(meet.MEET_FORM_SET[k].title);
			header.push(meet.MEET_FORM_SET[k].title);
		}

		let data = [header];
		for (let k in list) {
			let row = [
				list[k].JOIN_MEET_TITLE,
				list[k].JOIN_MEET_DAY,
				list[k].JOIN_MEET_TIME_START,
				list[k].JOIN_MEET_TIME_END,
				JoinModel.getDesc('STATUS', list[k].JOIN_STATUS),
				list[k].JOIN_IS_CHECKIN == 1 ? '已签到' : '未签到',
				timeUtil.timestamp2Time(list[k].JOIN_ADD_TIME)
			];

			for (let j in formTitles) {
				row.push(dataUtil.getValByForm(list[k].JOIN_FORMS, '', formTitles[j]));
			}
			data.push(row);
		}

		let options = {
			'!cols': header.map(() => ({ wch: 20 }))
		};
		return await exportUtil.exportDataExcel(EXPORT_JOIN_DATA_KEY, meet.MEET_TITLE + '预约名单', list.length, data, options);

	}

	async adminJoin(admin, userId, meetId, timeMark, forms) {
		let adminId = userId || this._getAdminId(admin);
		let meetService = new MeetService();
		let day = meetService.getDayByTimeMark(timeMark);
		let meet = await meetService.getMeetOneDay(meetId, day, {
			_id: meetId
		});
		if (!meet) this.AppError('预约时段选择错误1，请重新选择');

		let daySet = meetService.getDaySetByTimeMark(meet, timeMark);
		if (!daySet) this.AppError('预约时段选择错误2，请重新选择');

		let timeSet = meetService.getTimeSetByTimeMark(meet, timeMark);
		if (!timeSet) this.AppError('预约时段选择错误3，请重新选择');
		if (timeSet.status == 0) this.AppError('该时段已经关闭，请选择其他');
		if (timeSet.isLimit && timeSet.stat.succCnt >= timeSet.limit) this.AppError('该时段订单已满，请选择其他');

		let data = {};
		data.JOIN_USER_ID = adminId || 'admin';
		data.JOIN_MEET_ID = meetId;
		data.JOIN_MEET_TITLE = meet.MEET_TITLE;
		data.JOIN_MEET_DAY = daySet.day;
		data.JOIN_MEET_TIME_START = timeSet.start;
		data.JOIN_MEET_TIME_END = timeSet.end;
		data.JOIN_MEET_TIME_MARK = timeMark;
		data.JOIN_START_TIME = timeUtil.time2Timestamp(daySet.day + ' ' + timeSet.start + ':00');
		data.JOIN_FORMS = forms;
		data.JOIN_STATUS = JoinModel.STATUS.SUCC;
		data.JOIN_CODE = dataUtil.genRandomIntString(15);
		data.JOIN_IS_ADMIN = 1;
		data.JOIN_EDIT_ADMIN_ID = adminId || '';
		data.JOIN_EDIT_ADMIN_NAME = admin.ADMIN_NAME;
		data.JOIN_EDIT_ADMIN_TIME = timeUtil.time();
		data.JOIN_EDIT_ADMIN_STATUS = JoinModel.STATUS.SUCC;

		let joinId = await JoinModel.insert(data);
		await this._updateTimeStat(meetId, timeMark);

		return {
			result: 'ok',
			joinId
		};
	}

	async _statJoinCnt(meetId, timeMark) {
		let whereJoin = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: timeMark
		};
		let ret = await JoinModel.groupCount(whereJoin, 'JOIN_STATUS') || {};

		return {
			succCnt: ret['JOIN_STATUS_1'] || 0,
			waitCheckCnt: 0,
			cancelCnt: ret['JOIN_STATUS_10'] || 0,
			adminCancelCnt: ret['JOIN_STATUS_99'] || 0,
		};
	}

	_getAdminId(admin) {
		if (!admin) return '';
		return admin._id || admin.ADMIN_ID || '';
	}

	async _updateTimeStat(meetId, timeMark) {
		let stat = await this._statJoinCnt(meetId, timeMark);
		let day = timeMark.substr(1, 4) + '-' + timeMark.substr(5, 2) + '-' + timeMark.substr(7, 2);
		let whereDay = {
			DAY_MEET_ID: meetId,
			day
		};
		let daySet = await DayModel.getOne(whereDay, 'times');
		if (!daySet) return stat;

		let times = daySet.times || [];
		for (let k in times) {
			if (times[k].mark === timeMark) {
				times[k].stat = stat;
				break;
			}
		}

		await DayModel.edit(whereDay, {
			times
		});
		return stat;
	}

	async _saveDays(meetId, daysSet, startDay = '') {
		if (!Array.isArray(daysSet)) daysSet = [];

		let dayArr = [];
		for (let k in daysSet) {
			let day = daysSet[k].day;
			if (!day) continue;
			dayArr.push(day);

			let times = daysSet[k].times || [];
			for (let j in times) {
				if (!times[j].stat) {
					times[j].stat = {
						succCnt: 0,
						waitCheckCnt: 0,
						cancelCnt: 0,
						adminCancelCnt: 0
					};
				}
			}

			let where = {
				DAY_MEET_ID: meetId,
				day
			};
			let data = {
				DAY_MEET_ID: meetId,
				day,
				dayDesc: daysSet[k].dayDesc || (timeUtil.fmtDateCHN(day) + ' (' + timeUtil.week(day) + ')'),
				times
			};
			await DayModel.insertOrUpdate(where, data);
		}

		if (startDay) {
			let oldDays = await DayModel.getAll({
				DAY_MEET_ID: meetId,
				day: ['>=', startDay]
			}, 'day');
			for (let k in oldDays) {
				if (!dayArr.includes(oldDays[k].day)) {
					await DayModel.del(oldDays[k]._id);
				}
			}
		}
	}

}

module.exports = AdminMeetService;
