# v2.53 自有服务器迁移准备

> 日期：2026-07-05
> 范围：迁移准备，不改当前云开发运行链路，不导出生产数据，不变更云端配置。
> 建议路线：先做兼容网关和 AI 小猫后端服务器化，再逐步迁工作台读接口、写接口、文件存储和数据库。

## 1. 当前事实

当前小程序仍以微信云开发为主：

- 前端通过 `miniprogram/helper/cloud_helper.js` 统一调用 `wx.cloud.callFunction({ name: "mcloud" })`。
- 云函数入口是 `cloudfunctions/mcloud/index.js`，启动时先加载 `work_ai_service_live_patch.js`、`work_admin_controller_live_patch.js`、`work_route_live_patch.js`。
- 业务路由集中在 `cloudfunctions/mcloud/project/B00/public/route.js`。
- 当前 `mcloud` 路由总数为 173 条：`work` 56 条，`admin` 88 条，`meet` 12 条，其余为 passport、news、album、product、fav、home。
- 核心数据库集合沿用云数据库集合名，以 `_pid` 区分项目，当前主项目 PID 为 `B00`。
- `autoSendDaily` 是独立云函数，依赖云数据库读取预约集合，并向企业微信机器人发送日报。

## 2. 云开发绑定点

迁移前必须替换或适配这些能力：

| 绑定点 | 当前用法 | 自有服务器替代 |
| --- | --- | --- |
| 云函数调用 | `wx.cloud.callFunction` -> `mcloud` | `wx.request` -> HTTPS API 网关 |
| 微信身份 | `cloud.getWXContext().OPENID` | 服务端 `code2Session` 或登录态 token |
| 云数据库 | `wx-server-sdk` database collection API | MySQL/PostgreSQL/MongoDB + 数据访问层 |
| 云存储 | `cloud.uploadFile/getTempFileURL/deleteFile` | 对象存储或服务器文件服务 |
| 云日志 | `cloud.logger()` | 结构化日志 + 文件/数据库/日志平台 |
| 云函数环境 | `CLOUD_ID`、`TCB_ENV`、`SCF_RUNTIME` | `.env`、进程环境变量、Docker secret |
| 定时任务 | 云函数触发器 | crontab、systemd timer、PM2 cron 或队列任务 |
| live patch | 运行时覆盖云函数源码 | 正常发布流水线，禁止线上热覆盖 |

## 3. 目标架构

建议保留现有 route/controller/service/model 的业务分层，先加一层“兼容网关”，减少前端大改。

```text
微信小程序
  -> cloudHelper transport adapter
  -> HTTPS POST /api/wechat/mcloud
  -> server gateway: { route, PID, token, params }
  -> route.js compatible router
  -> controller
  -> service
  -> data adapter
  -> database / object storage / external API
```

兼容网关请求体建议保持现有云函数入参结构：

```json
{
  "route": "work/ai_chat",
  "PID": "B00",
  "token": "mini-login-token-or-openid-session-token",
  "params": {}
}
```

响应体继续保持当前结构：

```json
{
  "code": 200,
  "msg": "ok",
  "data": {}
}
```

这样前端可以先只改 `cloud_helper.js`，而不是批量改 90 多个页面。

## 4. 推荐迁移阶段

### Phase 0：准备与冻结

- 确认服务器、域名、HTTPS、备案和小程序 request 合法域名。
- 建立 Git 分支、测试环境、回滚策略。
- 只读盘点路由、集合、文件存储和定时任务。
- 不导出生产数据，不切换线上流量。

### Phase 1：自有服务器空壳

- 新建 Node.js 服务，提供 `/health` 和 `/api/wechat/mcloud`。
- 加入请求日志、错误处理、鉴权占位、环境变量校验。
- 兼容当前 `{ route, PID, token, params }` 请求格式。
- 先返回 mock，不连接生产数据库。

### Phase 2：AI 小猫优先迁移

- 优先迁 `work/ai_chat`、AI provider 配置读取、模型调用和 usage 记录。
- API Key 只保存在服务器环境变量或受控配置，不写入小程序和仓库。
- 小程序保留 fallback：服务器失败时仍可回退云函数路径。
- 验收标准：真实 provider/model/usage + 唯一标记回复，不把兜底当成功。

### Phase 3：文件与图片适配

- 设计对象存储接口：上传、临时 URL、删除。
- 替换 `cloud.getTempFileURL`、`cloud.uploadFile`、`cloud.deleteFile`。
- 先处理小猫截图识别和后台图片上传，再迁内容/样片/服务图片。

### Phase 4：工作台读接口迁移

- 先迁只读接口：`work/me`、`work/options`、`work/calendar`、`work/day_list`、`work/order_detail`。
- 数据库先读云开发导出的只读副本或测试库。
- 验收标准：同一日期、同一员工、同一订单的返回字段与云函数一致。

### Phase 5：低风险写接口迁移

- 迁 `note_save`、`item_save`、`rest_save` 等低风险写入。
- 每个写入都要有审计日志、幂等键、失败回滚说明。
- 不先迁收款、工资、审核。

### Phase 6：财务/工资/审核迁移

- 迁 `payment`、`commission`、`payroll`、`audit` 前必须先做数据一致性方案。
- 需要快照、对账脚本、双写或灰度、回滚脚本。
- 没有对账通过之前，不允许切生产写流量。

### Phase 7：admin、预约、内容、样片和服务

- 最后迁 `admin/*`、`meet/*`、`news/*`、`album/*`、`product/*`。
- 传统后台和小程序内管理中心要重新梳理权限模型。
- 预约、内容、样片、服务牵涉图片和导出，需要和对象存储迁移同步。

## 5. 数据集合迁移清单

优先级建议：

| 优先级 | 集合 | 说明 |
| --- | --- | --- |
| P0 | `bx_setup` | AI 配置、企业微信配置等系统配置；必须脱敏迁移 |
| P0 | `bx_work_staff` | 员工、openid 绑定、管理员身份 |
| P0 | `bx_work_order` | 档期和订单主体 |
| P0 | `bx_work_note` / `bx_work_item` / `bx_work_rest` | 工作台日常记录 |
| P0 | `bx_work_agent_audit` / `bx_work_agent_confirm` | AI 审计和确认队列 |
| P1 | `bx_work_payment` / `bx_work_commission` / `bx_work_finance_log` | 财务账本，需对账 |
| P1 | `bx_work_payroll` | 工资，需锁和预览 hash 迁移 |
| P2 | `bx_user` / `bx_admin` / `bx_log` | 用户、传统后台管理员、后台日志 |
| P2 | `bx_meet` / `bx_join` | 预约和报名 |
| P2 | `bx_news` / `bx_album` / `bx_product` / `bx_fav` / `bx_day` | 内容、样片、服务、收藏、日历辅助 |

## 6. 服务器准备清单

- 域名：已备案，并能配置到小程序后台 request 合法域名。
- HTTPS：证书自动续期，禁用明文 HTTP 生产访问。
- 运行环境：Node.js LTS，建议 Docker + systemd 或 PM2。
- 数据库：优先 PostgreSQL 或 MySQL；如果想保留文档结构，可考虑 MongoDB。
- 对象存储：优先 COS/OSS/S3 兼容存储，避免把客户图片只放服务器本地磁盘。
- 密钥：使用 `.env` 或 secret 管理，不写进 Git。
- 日志：请求 ID、route、openid/session、耗时、错误码、脱敏错误。
- 备份：数据库每日备份，对象存储生命周期和回收站策略。
- 监控：健康检查、错误率、响应时间、磁盘、内存、数据库连接数。
- 回滚：前端 transport 可一键切回云函数。

## 7. 前端改造准备

第一版只建议改 `cloud_helper.js`，增加 transport 开关：

```js
const API_TRANSPORT = 'cloud'; // cloud | http
```

后续当 `API_TRANSPORT === 'http'` 时：

- `callCloud(route, params, options)` 改为 `wx.request`。
- 请求体仍传 `{ route, PID, token, params }`。
- 错误码继续兼容 `CODE.SUCC / LOGIC / DATA / ADMIN_ERROR / MINI_ADMIN_ERROR`。
- 文件上传暂时保留云开发，等 Phase 3 再迁。

## 8. 不建议现在做的事

- 不要直接全量替换 `wx.cloud.callFunction`。
- 不要马上迁财务、工资、审核写接口。
- 不要把云数据库直接导入生产服务器后立刻切流量。
- 不要把 API Key、AppSecret、企业微信 webhook 写进仓库。
- 不要移除 live patch 机制后立刻上线；应先有服务器发布流水线和回滚方案。

## 9. 下一步可执行任务

1. 建立 `server/` 服务骨架，只提供 `/health` 和 `/api/wechat/mcloud` mock。
2. 在 `cloud_helper.js` 加 transport 开关，默认仍为 `cloud`。
3. 先迁 `work/ai_chat` 到服务器，并保留云函数回退。
4. 建立数据导出只读脚本和对账规则，但暂不导出生产数据。
5. 服务器通过真实 MiMo 回复、微信登录态、日志脱敏后，再进入工作台读接口迁移。

## 10. 本轮结论

本轮只完成迁移准备，不改变运行环境。

- 当前云开发版本仍可用。
- 推荐迁移路线已明确。
- 第一阶段最小改动点是 `cloud_helper.js` + 服务器兼容网关。
- 优先迁 AI 小猫后端，不优先迁财务和工资。
