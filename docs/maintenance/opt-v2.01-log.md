# 云屿摄影小程序 v2.01 优化日志

## Batch 1: 紧急 Bug 修复 (v2.01-b1)
- **时间**: 2026-06-24 23:30 CST
- **分支**: opt/v2.01-b1
- **改动文件**:
  1. `miniprogram/helper/page_helper.js` — 修复 `clearTimer` 中 `clearInterval(null)` 导致定时器永远不清除的 bug，改为传入实际 timer ID 并置 null
  2. `cloudfunctions/mcloud/project/B00/service/work_ai_service.js` — 提升 `getMaxTokensForTask` 各类型 token 上限（chat/explain: 500→800, query: 800→1000, write: 600→800, complex: 800→1000, default: 600→800），改善中文回复截断
  3. `miniprogram/version.js` — 版本号升至 2.01
- **验证结果**: git status clean, 语法正确
- **状态**: completed

## Batch 2: 安全加固 (v2.01-b2)
- **时间**: 2026-06-24 23:50 CST
- **分支**: opt/v2.01-b2
- **改动文件**:
  1. `cloudfunctions/mcloud/project/B00/service/work_ai_service.js` — 新增 `_rateLimitCheck`（每用户每分钟15次限流）和 `_sanitizeUserInput`（prompt injection 过滤），在 `chat()` 入口调用
  2. `miniprogram/setting/setting.js` — `CLIENT_CHECK_CONTENT: false → true`
  3. `cloudfunctions/mcloud/config/config.js` — `CLIENT_CHECK_CONTENT: false → true`, `ADMIN_CHECK_CONTENT: false → true`, `ADMIN_LOGIN_EXPIRE: 86400 → 7200`（统一为2小时）
  4. `miniprogram/cmpts/work_pet/work_pet.js` — `genThreadId` 改用 base36 时间戳 + 双段随机数
  5. `miniprogram/version.js` — 更新版本信息
- **验证结果**: git status clean
- **状态**: completed

## Batch 3: 性能优化 (v2.01-b3)
- **时间**: 2026-06-25 00:10 CST
- **分支**: opt/v2.01-b3
- **改动文件**:
  1. `cloudfunctions/mcloud/project/B00/service/work_service.js` — getCalendar 返回中为每个 order tag 添加 `participantIds` 字段
  2. `miniprogram/projects/B00/pages/work/calendar/work_calendar.js` — 新增 `_isJoinedTag` 本地判断，`_filterCalendarDaysForScope` 改为同步函数消除 N+1 云函数调用；calendarCache 限制为 5 个月
  3. `miniprogram/cmpts/work_pet/work_pet.js` — typewriter 每 3 字符 setData 一次（原逐字符），`wx.chooseImage` → `wx.chooseMedia`
  4. `miniprogram/projects/B00/pages/work/performance/work_performance.js` — onShow 增加 30s 缓存 TTL
  5. `miniprogram/projects/B00/pages/my/index/my_index.js` — onShow 增加 30s 缓存 TTL
  6. `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.js` — `wx.chooseImage` → `wx.chooseMedia`
  7. `miniprogram/version.js` — 更新版本信息
- **验证结果**: git status clean
- **状态**: completed

## Batch 4: 代码清理 (v2.01-b4)
- **时间**: 2026-06-25 00:40 CST
- **分支**: opt/v2.01-b4
- **改动文件**:
  1. `miniprogram/helper/date_helper.js` — 新建，提取 `_today()` 公共函数
  2. `miniprogram/helper/order_helper.js` — 新建，提取 `_formatOrder()` / `_isUndatedOrder()` 公共函数
  3. `miniprogram/projects/B00/pages/work/add/work_add.js` — 引用 date_helper + order_helper
  4. `miniprogram/projects/B00/pages/work/calendar/work_calendar.js` — 引用 date_helper
  5. `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.js` — 引用 date_helper
  6. `miniprogram/projects/B00/pages/admin/meet/export/admin_join_export.js` — 引用 date_helper
  7. `miniprogram/projects/B00/pages/work/performance/work_performance.js` — 引用 order_helper
  8. `miniprogram/helper/content_check_helper.js` — imgTypeCheck 大小写不敏感 + webp 支持
  9. `miniprogram/helper/cloud_helper.js` — 添加 callCloudSubmit / callCloudSubmitAsync 别名
  10. `miniprogram/version.js` — 更新版本信息
- **状态**: completed
