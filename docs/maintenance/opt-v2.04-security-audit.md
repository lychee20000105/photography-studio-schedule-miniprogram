# 云屿摄影小程序 v2.04 后端安全审计报告（补充）

**审计时间**: 2026-06-25  
**审计范围**: cloudfunctions/mcloud 全量 — framework / controller / service / model / config / live patch  
**审计方法**: 5 轮并行 agent 深度扫描  

---

## 发现总览

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| Critical | 3 | Live Patch 混淆注入, AI Agent 财务操作, TEST_MODE 认证绕过 |
| High | 6 | 工资竞态, Object 注入, Token 暴力破解, 收款非原子, whereEx 注入, clear 无防护 |
| Medium | 8 | ID 验证, 时间伪造, 内容审核可关闭, 死代码, PII 脱敏, 多租户, checkImg 硬编码 |
| Low | 5 | 硬编码云环境, console.log, 依赖项, 路径遍历, 堆栈泄露 |

---

## Critical

### C-01: Live Patch 用 base64+gzip 混淆在运行时注入任意代码
- **文件**: `index.js`, `*_live_patch.js` (3 个)
- **影响**: 压缩代码无法静态审计, 供应链攻击风险
- **建议**: 迁入源文件 + 完整性校验

### C-02: AI Agent 可通过 Tool Calling 执行财务操作
- **文件**: `work_ai_service_live_patch.js`, `work_ai_agent_registry.js`
- **影响**: save_payment/pay_payroll/cancel_order 可被 AI 调用
- **建议**: 注册表层强制确认队列 + 金额阈值

### C-03: TEST_MODE 可绕过所有认证
- **文件**: `base_controller.js:24-26`, `config/config.js:10-11`
- **影响**: 生产误启 → 全员认证绕过
- **建议**: 启动断言 + 移除生产配置

---

## High

### H-01: 工资发放竞态条件 (Double-Pay)
- **文件**: `work_payroll_service.js`, `admin_work_controller.js`
- **修复**: 唯一索引 + 分布式锁

### H-02: Object 直接传入缺乏字段白名单
- **文件**: 多个 controller 的 save 方法
- **修复**: service 层白名单过滤 + 状态字段忽略

### H-03: 管理员 Token 无防暴力破解
- **文件**: `base_admin_service.js`
- **修复**: 失败追踪 + 账户锁定 + token 轮换

### H-04: 收款操作缺少事务保护
- **文件**: `work_payment_service.js`
- **修复**: db.runTransaction + 补偿机制

### H-05: whereEx 参数允许注入任意查询条件
- **文件**: 多个 admin controller
- **修复**: 移除或字段白名单

### H-06: 数据库 clear 操作无安全防护
- **文件**: `db_util.js:218-222`
- **修复**: 权限守卫 + 审计日志 + 重命名

---

## Medium

| # | 问题 | 文件 |
|---|------|------|
| M-01 | checkId 正则被注释 | data_check.js |
| M-02 | ORDER_EDIT_TIME 可伪造 | work_admin_controller.js |
| M-03 | TEST_MODE 残留风险 | base_controller.js |
| M-04 | 内容审核可配置关闭 | content_check.js |
| M-05 | 验证模块死代码 | data_check.js |
| M-06 | PII 脱敏边界情况 | work_finance_log_service.js |
| M-07 | mustPID=false 绕过数据隔离 | multi_model.js |
| M-08 | checkImg 硬编码 jpg | check_controller.js |

---

## Low

| # | 问题 | 文件 |
|---|------|------|
| L-01 | 硬编码云环境 ID | config.js |
| L-02 | 大量 console.log | framework 多处 |
| L-03 | 依赖项可能有漏洞 | package.json |
| L-04 | 数据导出路径遍历 | config.js |
| L-05 | 错误堆栈泄露 | application.js |

---

## 正面发现

1. **双账本财务系统** — 整数分计算, float 仅展示
2. **MultiModel _pid 过滤** — 自动数据隔离
3. **正则转义** — fmtRegexKeyword() 特殊字符转义
4. **lock key 机制** — 工资发放乐观锁
5. **微信内容审核集成** — imgSecCheck + msgSecCheck
6. **payroll previewHash** — SHA-256 防 TOCTOU
7. **财务审计日志** — 完整 PII 脱敏 + diff
8. **无 SQL 注入风险** — 参数化查询
