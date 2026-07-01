/**
 * Notes: 路由配置文件
  * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * User: CC
 * Date: 2025-10-14 07:00:00
 */

module.exports = {

	'home/setup_get': 'home_controller@getSetup',

	'passport/login': 'passport_controller@login',
	'passport/phone': 'passport_controller@getPhone',
	'passport/my_detail': 'passport_controller@getMyDetail',
	'passport/register': 'passport_controller@register',
	'passport/edit_base': 'passport_controller@editBase',

	// 收藏
	'fav/update': 'fav_controller@updateFav',
	'fav/del': 'fav_controller@delFav',
	'fav/is_fav': 'fav_controller@isFav',
	'fav/my_list': 'fav_controller@getMyFavList',

	// 内容
	'news/list': 'news_controller@getNewsList',
	'news/home_list': 'news_controller@getHomeNewsList',
	'news/view': 'news_controller@viewNews',

	// 样片
	'album/list': 'album_controller@getAlbumList',
	'album/view': 'album_controller@viewAlbum',

	// 拍摄服务
	'product/list': 'product_controller@getProductList',
	'product/view': 'product_controller@viewProduct',

	// 内部工作台
	'work/me': 'work_controller@getMe',
	'work/bind_staff': 'work_controller@bindStaff',
	'work/options': 'work_controller@getOptions',
	'work/calendar': 'work_controller@getCalendar',
	'work/day_list': 'work_controller@getDayList',
	'work/order_list': 'work_controller@getOrderList',
	'work/order_detail': 'work_controller@getOrderDetail',
	'work/order_save': 'work_controller@saveOrder',
	'work/order_join': 'work_controller@joinOrder',
	'work/order_complete': 'work_controller@completeOrder',
	'work/order_cancel': 'work_controller@cancelOrder',
	'work/order_restore': 'work_controller@restoreOrder',
	'work/note_list': 'work_controller@getNoteList',
	'work/note_detail': 'work_controller@getNoteDetail',
	'work/note_save': 'work_controller@saveNote',
	'work/item_save': 'work_controller@saveItem',
	'work/item_cancel': 'work_controller@cancelItem',
	'work/rest_save': 'work_controller@saveRest',
	'work/messages': 'work_controller@getMessages',
	'work/message_summary': 'work_controller@getMessageSummary',
	'work/message_read': 'work_controller@readMessage',
	'work/message_read_all': 'work_controller@readAllMessages',
	'work/feedback_submit': 'work_controller@submitFeedback',
	'work/ai_chat': 'work_controller@aiChat',
	'work/my_payroll': 'work_controller@getMyPayroll',
	'work/performance_home': 'work_performance_controller@getHome',
	'work/performance_summary': 'work_performance_controller@getSummary',
	'work/performance_rank': 'work_performance_controller@getRank',
	'work/payment_my_list': 'work_performance_controller@getMyPaymentList',
	'work/commission_my_list': 'work_performance_controller@getMyCommissionList',
	'work/admin_home': 'work_admin_controller@getHome',
	'work/admin_performance_board': 'work_admin_controller@getPerformanceBoard',
	'work/admin_order_search': 'work_admin_controller@searchOrder',
	'work/admin_payment_list': 'work_admin_controller@getPaymentList',
	'work/admin_payment_save': 'work_admin_controller@savePayment#demo',
	'work/admin_payment_void': 'work_admin_controller@voidPayment#demo',
	'work/admin_commission_list': 'work_admin_controller@getCommissionList',
	'work/admin_frozen_list': 'work_admin_controller@getFrozenList',
	'work/admin_staff_list': 'work_admin_controller@getStaffList',
	'work/admin_staff_save': 'work_admin_controller@saveStaff#demo',
	'work/admin_staff_options': 'work_admin_controller@getStaffOptions',
	'work/admin_payroll_preview': 'work_admin_controller@previewPayroll',
	'work/admin_payroll_pay': 'work_admin_controller@payPayroll#demo',
	'work/admin_audit_list': 'work_admin_controller@getAuditList',
	'work/admin_order_audit': 'work_admin_controller@auditOrder#demo',
	'work/admin_order_cancel': 'work_admin_controller@cancelOrder#demo',
		'work/admin_feedback_list': 'work_admin_controller@getFeedbackList',
		'work/admin_ai_config_get': 'work_admin_controller@getAiConfig',
		'work/admin_ai_models_get': 'work_admin_controller@getAiModels',
		'work/admin_ai_config_save': 'work_admin_controller@saveAiConfig#demo',
		'work/admin_ai_providers_save': 'work_admin_controller@saveAiConfig#demo',
		'work/admin_agent_audit_list': 'work_admin_controller@getAgentAuditList',
		'work/admin_agent_audit_detail': 'work_admin_controller@getAgentAuditDetail',
		'work/admin_agent_confirm_list': 'work_admin_controller@getAgentConfirmList',
		'work/admin_agent_confirm_approve': 'work_admin_controller@approveAgentConfirm#demo',
		'work/admin_agent_confirm_reject': 'work_admin_controller@rejectAgentConfirm#demo',

		// 预约
	'meet/list': 'meet_controller@getMeetList',
	'meet/list_by_day': 'meet_controller@getMeetListByDay',
	'meet/list_has_day': 'meet_controller@getHasDaysFromDay',
	'meet/view': 'meet_controller@viewMeet',
	'meet/detail_for_join': 'meet_controller@detailForJoin',
	'meet/before_join': 'meet_controller@beforeJoin',
	'meet/join': 'meet_controller@join',

	'meet/my_join_list': 'meet_controller@getMyJoinList',
	'meet/my_join_cancel': 'meet_controller@cancelMyJoin',
	'meet/my_join_detail': 'meet_controller@getMyJoinDetail',
	'meet/my_join_someday': 'meet_controller@getMyJoinSomeday',
	'meet/my_join_checkin': 'meet_controller@userSelfCheckin',


	//***########### ADMIN ################## */
	'admin/home': 'admin/admin_home_controller@adminHome',

	'admin/login': 'admin/admin_mgr_controller@adminLogin',
	'admin/mgr_list': 'admin/admin_mgr_controller@getMgrList',
	'admin/mgr_insert': 'admin/admin_mgr_controller@insertMgr#demo',
	'admin/mgr_del': 'admin/admin_mgr_controller@delMgr#demo',
	'admin/mgr_detail': 'admin/admin_mgr_controller@getMgrDetail',
	'admin/mgr_edit': 'admin/admin_mgr_controller@editMgr#demo',
	'admin/mgr_status': 'admin/admin_mgr_controller@statusMgr#demo',
	'admin/mgr_pwd': 'admin/admin_mgr_controller@pwdMgr#demo',
	'admin/log_list': 'admin/admin_mgr_controller@getLogList',
	'admin/log_clear': 'admin/admin_mgr_controller@clearLog#demo',

	'admin/setup_get': 'admin/admin_setup_controller@getSetup',
	'admin/setup_set': 'admin/admin_setup_controller@setSetup#demo',
	'admin/setup_set_content': 'admin/admin_setup_controller@setContentSetup#demo',
	'admin/setup_qr': 'admin/admin_setup_controller@genMiniQr',

	// 用户
	'admin/user_list': 'admin/admin_user_controller@getUserList',
	'admin/user_detail': 'admin/admin_user_controller@getUserDetail',
	'admin/user_del': 'admin/admin_user_controller@delUser#demo',

	'admin/user_data_get': 'admin/admin_user_controller@userDataGet',
	'admin/user_data_export': 'admin/admin_user_controller@userDataExport',
	'admin/user_data_del': 'admin/admin_user_controller@userDataDel',

	// 内部工作台
	'admin/work_staff_list': 'admin/admin_work_controller@getStaffList',
	'admin/work_staff_save': 'admin/admin_work_controller@saveStaff#demo',
	'admin/work_staff_status': 'admin/admin_work_controller@stopStaff#demo',
	'admin/work_type_list': 'admin/admin_work_controller@getTypeList',
	'admin/work_type_save': 'admin/admin_work_controller@saveType#demo',
	'admin/work_audit_list': 'admin/admin_work_controller@getAuditList',
	'admin/work_audit_order': 'admin/admin_work_controller@auditOrder#demo',
	'admin/work_audit_item': 'admin/admin_work_controller@auditItem#demo',
	'admin/work_audit_rest': 'admin/admin_work_controller@auditRest#demo',
	'admin/work_payroll': 'admin/admin_work_controller@getPayroll',
	'admin/work_payroll_pay': 'admin/admin_work_controller@payStaffMonth#demo',
	'admin/work_canceled_orders': 'admin/admin_work_controller@getCanceledOrders',
	'admin/work_order_restore': 'admin/admin_work_controller@restoreOrder#demo',
	'admin/work_order_del': 'admin/admin_work_controller@delOrder#demo',


	// 内容
	'admin/news_list': 'admin/admin_news_controller@getNewsList',
	'admin/news_insert': 'admin/admin_news_controller@insertNews#demo',
	'admin/news_detail': 'admin/admin_news_controller@getNewsDetail',
	'admin/news_edit': 'admin/admin_news_controller@editNews#demo',
	'admin/news_update_pic': 'admin/admin_news_controller@updateNewsPic#demo',
	'admin/news_update_content': 'admin/admin_news_controller@updateNewsContent#demo',
	'admin/news_del': 'admin/admin_news_controller@delNews#demo',
	'admin/news_sort': 'admin/admin_news_controller@sortNews#demo',
	'admin/news_status': 'admin/admin_news_controller@statusNews#demo',
	'admin/news_home': 'admin/admin_news_controller@homeNews#demo',

	// 样片
	'admin/album_list': 'admin/admin_album_controller@getAlbumList',
	'admin/album_insert': 'admin/admin_album_controller@insertAlbum#demo',
	'admin/album_detail': 'admin/admin_album_controller@getAlbumDetail',
	'admin/album_edit': 'admin/admin_album_controller@editAlbum#demo#demo',
	'admin/album_update_forms': 'admin/admin_album_controller@updateAlbumForms#demo',
	'admin/album_del': 'admin/admin_album_controller@delAlbum#demo',
	'admin/album_sort': 'admin/admin_album_controller@sortAlbum#demo',
	'admin/album_home': 'admin/admin_album_controller@homeAlbum#demo',
	'admin/album_status': 'admin/admin_album_controller@statusAlbum#demo',

	// 拍摄服务
	'admin/product_list': 'admin/admin_product_controller@getProductList',
	'admin/product_insert': 'admin/admin_product_controller@insertProduct#demo',
	'admin/product_detail': 'admin/admin_product_controller@getProductDetail',
	'admin/product_edit': 'admin/admin_product_controller@editProduct#demo',
	'admin/product_update_forms': 'admin/admin_product_controller@updateProductForms#demo',
	'admin/product_del': 'admin/admin_product_controller@delProduct#demo',
	'admin/product_sort': 'admin/admin_product_controller@sortProduct#demo',
	'admin/product_home': 'admin/admin_product_controller@homeProduct#demo',
	'admin/product_status': 'admin/admin_product_controller@statusProduct#demo',

	// 预约
	'admin/meet_list': 'admin/admin_meet_controller@getMeetList',
	'admin/meet_join_list': 'admin/admin_meet_controller@getJoinList',
	'admin/meet_join_insert': 'admin/admin_meet_controller@adminJoin#demo',
	'admin/join_status': 'admin/admin_meet_controller@statusJoin#demo',
	'admin/join_del': 'admin/admin_meet_controller@delJoin#demo',
	'admin/meet_insert': 'admin/admin_meet_controller@insertMeet#demo',
	'admin/meet_detail': 'admin/admin_meet_controller@getMeetDetail',
	'admin/meet_edit': 'admin/admin_meet_controller@editMeet#demo',
	'admin/meet_del': 'admin/admin_meet_controller@delMeet#demo',
	'admin/meet_update_content': 'admin/admin_meet_controller@updateMeetContent#demo',
	'admin/meet_update_style': 'admin/admin_meet_controller@updateMeetStyleSet#demo',
	'admin/meet_sort': 'admin/admin_meet_controller@sortMeet#demo',
	'admin/meet_status': 'admin/admin_meet_controller@statusMeet#demo',
	'admin/meet_cancel_time_join': 'admin/admin_meet_controller@cancelJoinByTimeMark#demo',
	'admin/join_scan': 'admin/admin_meet_controller@scanJoin',
	'admin/join_checkin': 'admin/admin_meet_controller@checkinJoin',
	'admin/self_checkin_qr': 'admin/admin_meet_controller@genSelfCheckinQr',
	'admin/meet_day_list': 'admin/admin_meet_controller@getDayList',

	'admin/meet_temp_insert': 'admin/admin_meet_controller@insertMeetTemp#demo',
	'admin/meet_temp_list': 'admin/admin_meet_controller@getMeetTempList',
	'admin/meet_temp_del': 'admin/admin_meet_controller@delMeetTemp#demo',
	'admin/meet_temp_edit': 'admin/admin_meet_controller@editMeetTemp#demo',

	'admin/join_data_get': 'admin/admin_meet_controller@joinDataGet',
	'admin/join_data_export': 'admin/admin_meet_controller@joinDataExport',
	'admin/join_data_del': 'admin/admin_meet_controller@joinDataDel',



}
