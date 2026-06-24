# v2.10-b20 维护日志: 长列表优化

- 分支: opt/v2.10-b20
- 日期: 2026-06-25
- 范围: 前端 miniprogram/helper、admin/work/audit、work/admin_payment

## 改动清单

### 新增文件
- `miniprogram/helper/list_helper.js` — 通用触底加载分页工具，提供 initPage / loadMore / refresh 三个静态方法，支持任意页面和列表 key。

### 修改文件
- `miniprogram/projects/B00/pages/admin/work/audit/admin_work_audit.js`
  - 引入 ListHelper，onLoad 和 onPullDownRefresh 调用 initPage
  - 新增 onReachBottom 调用 ListHelper.loadMore
  - _loadData 改为传入 page/size 参数，数据>=20条时启用分页模式，不足时退化为一次性加载
  - data 新增 listLoadingMore / listNoMore 字段

- `miniprogram/projects/B00/pages/admin/work/audit/admin_work_audit.wxml`
  - 休息审核区块后新增"加载中..."/"没有更多了" list-footer 视图

- `miniprogram/projects/B00/pages/admin/work/audit/admin_work_audit.wxss`
  - 新增 .list-footer 样式

- `miniprogram/projects/B00/pages/work/admin_payment/work_admin_payment.js`
  - 引入 ListHelper，onLoad 调用 initPage
  - 新增 onReachBottom 调用 ListHelper.loadMore
  - _loadList 改为调用 ListHelper.refresh
  - 新增 _loadMorePayments 分页加载函数，支持 page/size 参数
  - bindMonthChange 切换月份时重置分页

- `miniprogram/projects/B00/pages/work/admin_payment/work_admin_payment.wxml`
  - 收款列表后新增"加载中..."/"没有更多了" list-footer 视图

- `miniprogram/projects/B00/pages/work/admin_payment/work_admin_payment.wxss`
  - 新增 .list-footer 样式

- `miniprogram/version.js`
  - current 更新为 '2.10'，history 开头新增 v2.10-b20 条目

## 约束遵守
- 未修改 cloudfunctions/ 后端
- 未修改 cmpts/work_pet/
- 未引入 npm 包，使用原生触底加载方案
- 现有列表功能不变，只增强加载体验
