const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');
Page({
	data:{month:'',data:null,rankList:[]},
	onLoad:function(){ProjectBiz.initPage(this,{isLoadSkin:true});let d=new Date();this.setData({month:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});this._loadData();},
	onPullDownRefresh:async function(){await this._loadData();wx.stopPullDownRefresh();},
	_loadData:async function(){let data=await cloudHelper.callCloudData('work/admin_performance_board',{month:this.data.month},{title:'bar'});this.setData({data,rankList:data?(data.rankList||[]):[]});},
	bindMonthChange:async function(e){this.setData({month:e.detail.value});await this._loadData();},
	bindScopeTap:async function(e){let scope=e.currentTarget.dataset.scope;let list=await cloudHelper.callCloudData('work/performance_rank',{month:this.data.month,scope},{title:'bar'});this.setData({rankList:list||[]});}
});
