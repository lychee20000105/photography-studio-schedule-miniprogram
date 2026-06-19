module.exports = {
	PID: 'B00',
	NAV_COLOR: '#000000',
	NAV_BG: '#ffffff',

	// 用户
	USER_FIELDS: [
		{ mark: 'sex', title: '性别', type: 'select', selectOptions: ['男', '女'], must: true },
		{ mark: 'area', title: '所在地区', type: 'text' },
		{ mark: 'work', title: '行业领域', type: 'text' },
	],

	// 资讯 
	NEWS_CATE: [
		{ id: 1, title: '本店动态', style: 'leftbig3' },
		{ id: 2, title: '拍摄小贴士', style: 'leftbig' },
	],

	// ### 预约相关
	MEET_JOIN_MUST_LOGIN: false,
	MEET_TYPE: [
		{ id: 1, title: '生日跟拍', style: 'leftbig2' },
		{ id: 2, title: '百日宴', style: 'leftbig2' },
		{ id: 3, title: '婚礼跟拍', style: 'leftbig2' },
		{ id: 4, title: '订婚宴', style: 'leftbig2' },
		{ id: 5, title: '寿宴', style: 'leftbig2' },
		{ id: 6, title: '乔迁跟拍', style: 'leftbig2' },
		{ id: 7, title: '写真', style: 'leftbig2' },
		{ id: 8, title: '外景约拍', style: 'leftbig2' },
		{ id: 9, title: '活动商拍', style: 'leftbig2' },
		{ id: 10, title: '艺术肖像', style: 'leftbig2' },
		{ id: 11, title: '其他拍摄', style: 'leftbig2' },
	],
	MEET_CAN_NULL_TIME: true, // 允许无具体时段的日期（适合记录全天档期）

	// 内部档期记录表单字段
	MEET_JOIN_FIELDS: [
		{ mark: 'meetCustomerName', isDefault: true, type: 'text', title: '客户姓名', must: true, max: 30 },
		{ mark: 'meetCustomerMobile', isDefault: true, type: 'mobile', title: '联系电话', must: true },
		{ mark: 'meetShootPlace', isDefault: true, type: 'text', title: '拍摄地点', must: true, max: 100, desc: '如：XX酒店/XX户外/工作室' },
		{ mark: 'meetOrderAmount', isDefault: true, type: 'digit', title: '订单金额', must: false, desc: '单位：元' },
		{ mark: 'meetDepositAmount', isDefault: true, type: 'digit', title: '已收定金', must: false, desc: '单位：元' },
		{ mark: 'meetPostProgress', isDefault: true, type: 'select', title: '后期进度', must: true, selectOptions: ['待拍摄', '已拍摄待修图', '修图中', '已修图待交付', '已交付'], desc: '当前处理到哪一步了' },
		{ mark: 'meetRemark', isDefault: true, type: 'textarea', title: '备注', must: false, max: 200, desc: '其他需要记录的信息' },
		{ mark: 'meetOrderImage', isDefault: true, type: 'image', title: '订单截图', must: false, max: 3, desc: '上传收据/合同等截图' },
	],

	// 样片
	ALBUM_CATE: [
		{ id: 1, title: '跟拍纪实' },
		{ id: 2, title: '艺术肖像' },
		{ id: 3, title: '写真作品' },
		{ id: 4, title: '外景约拍' },
		{ id: 5, title: '活动商拍' },
	],
	ALBUM_FIELDS: [
		{ mark: 'cover', title: '封面照片', type: 'image', min: 1, max: 1, must: true },
		{ mark: 'detail', title: '详细介绍', type: 'content', must: true },
	],

	// 拍摄服务
	PRODUCT_CATE: [
		{ id: 1, title: '拍摄服务' }
	],
	PRODUCT_FIELDS: [
		{ mark: 'price', title: '服务价格', type: 'digit', must: true },
		{ mark: 'origPrice', title: '原价', type: 'digit', must: true },
		{ mark: 'adv', title: '亮点介绍', type: 'text', max: 30, must: true, desc: '一句话介绍产品亮点' },
		{ mark: 'service', title: '摄影服务', type: 'textarea', must: true },
		{ mark: 'item', title: '行程安排', type: 'textarea', must: true },
		{ mark: 'product', title: '影像产品', type: 'textarea', must: true },
		{ mark: 'desc', title: '服务简介', type: 'textarea', must: false },
		{ mark: 'cover', title: '封面图', type: 'image', len: 1, must: true },
		{ mark: 'album', title: '服务图册', type: 'image', must: true },
	],

}
