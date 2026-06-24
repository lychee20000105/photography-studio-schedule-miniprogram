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
- **说明**: Storage key 未做用户隔离，因微信小程序本机存储与微信账号绑定，单设备单用户，无实际冲突风险
- **验证结果**: git status clean
- **状态**: completed
