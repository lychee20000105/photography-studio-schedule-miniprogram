# opt/v2.05 安全加固日志

## B13: Security Hardening (2026-06-25)

### 修复清单

| ID | 严重度 | 描述 | 文件 | 状态 |
|----|--------|------|------|------|
| C-03 | Critical | TEST_MODE 生产断言防护 | config/config.js | Done |
| H-06 | High | 数据库 clear 操作防护 | framework/database/db_util.js | Done |
| H-05 | High | whereEx 查询注入防护 | framework/database/db_util.js | Done |
| M-08 | Medium | checkImg mime 硬编码 | project/B00/controller/check_controller.js | Done |
| M-05 | Medium | data_check.js CHECK_SOURCE 死代码清理 | framework/validate/data_check.js | Done |
| L-03 | Low | 移除未使用的 mysql 依赖 | package.json | Done |
| M-02 | Medium | ORDER_EDIT_TIME 防伪造 | project/B00/controller/work_admin_controller.js | Done |

### 详细说明

#### C-03: TEST_MODE 生产断言防护
- config.js 改为 `const config = module.exports = {...}` 模式，启动时检查 TEST_MODE/IS_DEMO
- TEST_MODE 在云环境（TCB_ENV/SCF_RUNTIME）下直接抛异常阻断启动
- IS_DEMO 启用时打印 console.error 警告

#### H-06: 数据库 clear 操作防护
- `clear()` 重命名为 `dangerousClearAll(collectionName, force=false)`
- 必须显式 `force=true` 才执行，否则打印警告并返回 0
- 保留 `clear` 向后兼容别名
- 增加返回值（删除记录数）

#### H-05: whereEx 查询注入防护
- 新增 `sanitizeWhereEx(whereEx)` 函数
- 只允许 string/number/boolean 类型的简单键值对
- 禁止 `$` 开头的 MongoDB 操作符键
- 禁止嵌套路径（含 `.` 的键名）
- 新增 `_isSafeFieldKey(key)` 辅助函数
- 作为纵深防御导出，供控制器/服务层在需要时调用

#### M-08: checkImg mime 修复
- 不再硬编码 `'jpg'`，改为使用客户端传入的 `mine` 参数
- 白名单校验：`['jpg', 'jpeg', 'png', 'gif', 'webp']`
- 非白名单值回落为 `'jpg'`
- 移除 rules 中的 `must` 约束（允许缺省）

#### M-05: data_check.js 死代码清理
- 移除 `CHECK_SOURCE` 变量和所有 `CHECK_SOURCE == 'client'` 分支
- `_showError` 简化为统一抛出 `AppError`
- 移除客户端 `wx.showModal`、`pageHelper.anchor`、`setData Focus` 死代码路径
- `formName` 和 `fromStep` 改为硬编码服务端值

#### L-03: 移除 mysql 依赖
- package.json dependencies 中移除 `"mysql": "^2.18.1"`
- 项目使用微信云数据库，不使用 MySQL

#### M-02: ORDER_EDIT_TIME 防伪造
- `work_admin_controller.auditOrder` 移除 `orderEditTime` 验证规则和传参
- 发现 `admin_work_service.auditOrder` 函数签名只接受 5 个参数，`orderEditTime` 实为死代码（从未被使用）
- 服务层无需修改，仅在控制器层清理入口即可

### 遗留项（不在本批次范围）
- C-01/C-02: live_patch 迁移，工作量大，单独处理
