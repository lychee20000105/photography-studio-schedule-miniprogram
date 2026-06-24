module.exports = {

	//### 环境相关
	CLOUD_ID: 'yunyukeji-d4g7waei5d5d6cdeb', //你的云环境id

	// ##################################################################
	IS_DEMO: false, //是否演示版 (后台不可操作提交动作)

	// ##################################################################
	// #### 调试相关
	TEST_MODE: false, // 测试模式 涉及小程序码生成路径， 用以下 TEST_TOKEN_ID openid..
	TEST_TOKEN_ID: 'OPENID_FOR_LOCAL_TEST_ONLY',

	DATA_EXPORT_PATH: 'export/', //数据导出路径

	// #### 内容安全
	CLIENT_CHECK_CONTENT: true, //前台图片文字是否校验
	ADMIN_CHECK_CONTENT: true, //后台图片文字是否校验

	// ### 后台业务相关
	ADMIN_LOGIN_EXPIRE: 7200, //管理员token过期时间 (秒) 2小时
}
