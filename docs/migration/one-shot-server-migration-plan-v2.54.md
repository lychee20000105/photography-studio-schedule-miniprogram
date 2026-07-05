# v2.54 自有服务器一次性完整迁移方案

> 日期：2026-07-05
> 目标：把后端从微信云开发迁到自有服务器，并让正式切换当天尽量表现为一次完整成功。
> 边界：本方案是迁移设计与执行手册，不导出生产数据，不改当前运行链路，不提交正式审核，不写入任何真实密钥。

## 1. 第一性原则

迁移不是“把代码搬到服务器”，而是把用户请求、身份、数据、文件、定时任务、日志、权限和回滚能力搬到一个新的可控运行系统里。

一次性完整迁移成功的本质不是没有风险，而是让风险在正式切换前暴露完：

- 正式切换前，新后端必须已经完整跑过同一套业务请求。
- 正式切换前，新数据库必须已经过多轮全量导入、增量追平和一致性对账。
- 正式切换前，新对象存储必须已经能解析旧 fileID、生成临时 URL、完成新文件上传。
- 正式切换当天，前端只做一个 transport 开关或一版开发版上传，不再现场临时改业务逻辑。
- 正式切换失败时，必须能在 15 分钟内切回微信云开发，并且不丢切换窗口内的数据。

因此，本项目的迁移策略是：

1. 保留现有 `route/controller/service/model` 业务分层。
2. 新建自有服务器兼容网关 `/api/wechat/mcloud`，保持 `{ route, PID, token, params }` 请求形状。
3. 新建数据访问适配层，先兼容当前 Model API，再逐步替换 `wx-server-sdk`。
4. 新建对象存储适配层，先兼容 `fileID -> temp URL`，再切新上传。
5. 正式切换前完成“全量导入 + 增量追平 + 影子读写 + 对账报告”。
6. 正式切换日冻结写入，执行最后增量同步，通过清单后一次切换。

## 2. 当前系统迁移面

当前主链路：

```text
小程序页面
  -> miniprogram/helper/cloud_helper.js
  -> wx.cloud.callFunction({ name: "mcloud" })
  -> cloudfunctions/mcloud/index.js
  -> framework/core/application.js
  -> project/B00/public/route.js
  -> controller
  -> service
  -> model
  -> framework/database/db_util.js
  -> 微信云数据库
```

必须纳入迁移的对象：

| 类型 | 当前位置 | 迁移目标 |
| --- | --- | --- |
| 主业务网关 | `mcloud` 云函数 | 自有服务器 `/api/wechat/mcloud` |
| 前端请求 | `cloud_helper.js` | `cloud/http/dual` transport 开关 |
| 旁路请求 | `content_check_helper.js`、企业微信设置页 | 改为统一网关或独立 HTTPS API |
| 身份 | `cloud.getWXContext().OPENID` | 服务端 `code2Session` + session token |
| 数据库 | `cloud.database()` | PostgreSQL 优先，保留 JSON 字段 |
| 数据模型 | `project/B00/model/*.js` | 保持 Model 类，替换底层 adapter |
| 文件 | `cloud.uploadFile/getTempFileURL/deleteFile` | S3/COS/OSS 兼容对象存储 |
| 导出文件 | `export_util.js` | 服务端临时文件 + 对象存储 |
| 定时任务 | `autoSendDaily` 云函数 | `cron/systemd timer/PM2 cron` |
| 日志 | `cloud.logger()` | 结构化日志 + request id |
| live patch | 云函数启动时热覆盖 | 正常发版流水线，禁止热覆盖上线 |

当前已识别的核心集合：

| 业务域 | 集合 |
| --- | --- |
| 系统与用户 | `bx_setup`、`bx_user`、`bx_admin`、`bx_log` |
| 内容与预约 | `bx_news`、`bx_album`、`bx_product`、`bx_fav`、`bx_day`、`bx_meet`、`bx_join` |
| 工作台基础 | `bx_work_staff`、`bx_work_type`、`bx_work_customer`、`bx_work_order` |
| 工作台日常 | `bx_work_note`、`bx_work_item`、`bx_work_rest`、`bx_work_message` |
| AI Agent | `bx_work_agent_audit`、`bx_work_agent_confirm` |
| 财务与工资 | `bx_work_payment`、`bx_work_commission`、`bx_work_finance_log`、`bx_work_payroll` |

## 3. 目标架构

```text
微信小程序
  -> cloud_helper transport adapter
    -> cloud: wx.cloud.callFunction(mcloud)
    -> http: wx.request(https://api.example.com/api/wechat/mcloud)
    -> dual: 主请求走 cloud，影子请求走 http，只记录差异

自有服务器
  -> nginx / HTTPS / WAF
  -> Node.js API
  -> request logger / auth / rate limit
  -> mcloud-compatible gateway
  -> existing route/controller/service
  -> data adapter
  -> PostgreSQL
  -> object storage adapter
  -> S3/COS/OSS
  -> cron jobs
```

正式切换后，请求体继续保持：

```json
{
  "route": "work/ai_chat",
  "PID": "B00",
  "token": "mini-session-token",
  "params": {}
}
```

响应体继续保持：

```json
{
  "code": 200,
  "msg": "ok",
  "data": {}
}
```

## 4. 服务器技术选型

建议选型：

- 运行时：Node.js LTS。
- API 框架：Express 或 Fastify，优先 Fastify。
- 进程：Docker Compose + systemd，或 PM2 + systemd。
- 数据库：PostgreSQL。
- 对象存储：腾讯云 COS、阿里 OSS 或 S3 兼容存储。
- 反向代理：nginx。
- 日志：JSON line 文件 + 每日轮转，后续可接 Loki。
- 备份：PostgreSQL 每日全量 + WAL/增量；对象存储开启版本控制或回收站。

PostgreSQL 的理由：

- 业务里有大量结构化订单、工资、收款、提成和审计数据，关系型更适合对账。
- 当前云数据库文档字段可以落为 `jsonb`，不必一次性把所有历史字段拆平。
- 财务、工资、审计需要事务、唯一约束、幂等键和锁，PostgreSQL 更稳。

## 5. 分层改造方案

### 5.1 前端 transport

`cloud_helper.js` 增加三种模式：

```js
const API_TRANSPORT = 'cloud'; // cloud | http | dual
```

- `cloud`：当前线上默认，继续走微信云函数。
- `http`：正式切换后，走自有服务器。
- `dual`：迁移演练期，用户主请求仍走云函数，后台异步把同样请求发到自有服务器做影子校验。

必须额外处理的旁路：

- `content_check_helper.js` 的内容安全检测。
- `admin_setup_wecom.js` 的企业微信配置/测试调用。
- `wx.cloud.uploadFile` 上传链路。

### 5.2 服务端兼容网关

新增 `server/`，保留当前云函数业务结构：

```text
server/
  src/
    app.js
    routes/wechat-mcloud.js
    adapters/
      auth-adapter.js
      db-adapter.js
      storage-adapter.js
      logger-adapter.js
      content-security-adapter.js
    legacy/
      route.js
      controller/
      service/
      model/
```

兼容网关职责：

1. 校验 HTTPS、域名、来源和请求大小。
2. 解析 `{ route, PID, token, params }`。
3. 用 token 换 openid/session/staff。
4. 调用当前 route/controller/service。
5. 统一返回 `code/msg/data`。
6. 记录 `requestId/route/openidHash/duration/status`。

### 5.3 身份迁移

云开发自动给 `OPENID`，自有服务器必须显式登录。

新链路：

```text
小程序 wx.login()
  -> POST /api/wechat/session
  -> 服务端 code2Session
  -> 写入 session 表
  -> 返回 mini-session-token
  -> cloud_helper 后续请求携带 token
```

要求：

- 不把 AppSecret 写入仓库。
- token 必须有过期时间和刷新策略。
- `STAFF_OPENID`、`USER_MINI_OPENID` 继续作为身份绑定字段。
- token 丢失时返回与当前登录失效兼容的错误码。

### 5.4 数据库适配层

不要在业务代码里到处改 SQL。正确路线是先替换 `db_util.js` 的能力。

必须实现的能力：

- `insert / insertBatch`
- `edit / del / count`
- `getOne / getAll / getAllBig`
- `getList / getListJoin / getListByArray`
- `sum / groupSum / groupCount / distinct`
- `inc / mul`
- `where` 条件兼容：`= / != / <> / in / not in / > / >= / < / <= / like / regex`
- `orderBy / skip / limit`

表设计原则：

- 每个集合对应一张表。
- `_id` 保持为主键文本，兼容历史记录引用。
- `_pid` 建索引。
- 高频筛选字段建索引，例如日期、员工、状态、月份、订单 ID。
- 复杂快照字段用 `jsonb`。
- 金额字段统一保留分字段，例如 `*_AMOUNT_CENT`。

### 5.5 文件与对象存储

文件迁移不能只迁数据库字段，必须解决旧 fileID。

建议设计：

```text
file_ref
  id
  old_file_id
  new_object_key
  bucket
  size
  sha256
  mime
  status
  migrated_at
```

迁移过程：

1. 从数据库扫描所有可能的 fileID 字段。
2. 用云开发生成临时 URL 下载原文件。
3. 上传到对象存储。
4. 记录 `old_file_id -> new_object_key` 映射。
5. 服务端 `getTempFileURL` 兼容旧 fileID，先查映射再生成新临时 URL。
6. 正式切换后，新上传直接进对象存储。

验收要求：

- 随机抽样 100 个图片/导出文件可打开。
- 小猫图片识别、后台封面上传、富文本图片、导出 Excel 都通过。
- 删除动作先做软删除或回收站，不做永久删除。

## 6. 一次性迁移的阶段设计

### 阶段 A：空壳与兼容层

目标：新服务器能接请求，但不承载生产。

交付：

- `/health`
- `/api/wechat/mcloud`
- `/api/wechat/session`
- 日志、错误处理、限流、CORS/来源校验
- 数据库连接与迁移脚本框架
- 对象存储连接与签名 URL

验收：

- 健康检查稳定。
- `work/ai_chat` mock 返回结构与云函数一致。
- 所有错误都返回 `code/msg/data`，不直接把堆栈暴露给前端。

### 阶段 B：全量数据迁移演练

目标：反复导入真实结构的只读副本，直到脚本可重复。

交付：

- `export-cloud-data` 只读导出脚本。
- `import-postgres` 导入脚本。
- `verify-counts` 数量校验。
- `verify-hash` 字段 hash 校验。
- `verify-relations` 关系校验。

校验维度：

- 每个集合记录数一致。
- 每张表 `_id` 唯一。
- `_pid` 分布一致。
- 订单与收款、提成、工资引用关系一致。
- 最近 30 天档期、订单、收款、工资预览结果一致。

### 阶段 C：业务影子校验

目标：新后端在不影响用户的情况下跑真实请求。

做法：

- 前端 `dual` 模式：主请求走云函数，影子请求走自有服务器。
- 只影子读接口和低风险接口。
- 写接口影子执行时必须 dry-run，不落生产库。
- 每次对比 `code`、关键字段、列表数量、金额、日期、权限结果。

影子优先级：

1. `home/setup_get`
2. `passport/my_detail`
3. `work/me`
4. `work/options`
5. `work/calendar`
6. `work/day_list`
7. `work/order_detail`
8. `work/messages`
9. `work/admin_home`
10. `work/admin_payment_list`
11. `work/admin_payroll_preview`
12. `work/ai_chat`

通过标准：

- 连续 3 天核心读接口差异为 0。
- 财务金额类差异为 0。
- 权限判断差异为 0。
- 小猫 AI 至少 10 次真实模型回复成功，记录 provider/model/usage。

### 阶段 D：增量同步与冻结准备

目标：正式切换前，新库和云库只差最后一个冻结窗口。

需要做：

- 云数据库导出增量脚本。
- 按 `*_ADD_TIME`、`*_EDIT_TIME` 或 `_updateTime` 追平。
- 无更新时间的集合用全量 hash 比对。
- 写接口建立幂等键，防止重复导入。
- 正式切换前一天执行一次完整演练。

冻结窗口建议：

- 选择凌晨或业务低峰。
- 小程序前端临时提示“系统维护 10-30 分钟”。
- 冻结写入，不冻结只读。
- 最后增量同步完成后再开新后端。

### 阶段 E：正式一次切换

切换当天只允许做已经演练过的动作。

执行顺序：

1. 确认云开发当前版本、Git commit、数据库快照、对象存储映射快照。
2. 开启维护模式，阻止新写入。
3. 执行最后增量导出。
4. 导入 PostgreSQL。
5. 运行 count/hash/relation/finance 校验。
6. 运行对象存储缺口校验。
7. 启动新服务器生产进程。
8. 运行 smoke test。
9. 上传小程序开发版/体验版，transport 改为 `http`。
10. 在真实手机上验证核心流程。
11. 解除维护模式。
12. 监控 2 小时。

smoke test 必须覆盖：

- 登录与员工绑定状态。
- 档期日历。
- 订单详情。
- 新建/编辑订单。
- 备注、任务、休息。
- 收款列表和收款保存。
- 工资预览。
- 管理员首页。
- 小猫 AI 真实回复。
- 图片上传和预览。
- 企业微信日报或测试消息。

## 7. 回滚设计

一次性切换成功必须有回滚，不然就是硬赌。

回滚开关：

- 小程序 transport 从 `http` 切回 `cloud`。
- 服务器保留切换窗口内的写入日志。
- 如果新后端已经产生写入，必须能把写入补回云数据库，或者在回滚前冻结并人工确认。

回滚触发条件：

- 登录失败率超过 5% 且 10 分钟内无法定位。
- 核心接口 500 错误率超过 2%。
- 财务金额或工资预览出现任意不一致。
- 图片上传/预览大面积失败。
- 小猫 AI 不影响主业务，但如果连带拖垮服务器，也触发回滚。

回滚流程：

1. 开启维护模式。
2. 导出新服务器切换窗口写入日志。
3. transport 切回 `cloud`。
4. 验证云函数核心流程恢复。
5. 评估是否把新服务器窗口写入补回云库。
6. 记录事故报告，不继续二次裸切。

## 8. 验收标准

正式切换前必须全部满足：

- 新服务器 `/health` 连续 7 天稳定。
- 全量导入至少成功 3 次。
- 增量追平至少成功 3 次。
- 核心读接口影子校验连续 3 天差异为 0。
- 财务、工资、审计对账差异为 0。
- 文件迁移映射覆盖率 100%，抽样可访问。
- `work/ai_chat` 真实 API 可用，不把 fallback 当成功。
- 正式切换脚本在测试环境跑通。
- 回滚演练至少成功 1 次。
- 小程序合法 request 域名、HTTPS、证书和备案已完成。

## 9. 风险清单

| 风险 | 影响 | 控制方式 |
| --- | --- | --- |
| `OPENID` 获取方式变化 | 登录、员工绑定、权限失效 | `code2Session` + session 表 + 兼容 token |
| 云数据库查询语义差异 | 列表、筛选、统计不一致 | db adapter 单元测试 + 影子对比 |
| 财务金额不一致 | 账本错误 | 分字段金额、hash 对账、冻结后切换 |
| 文件 fileID 失效 | 图片打不开 | file_ref 映射 + 签名 URL |
| 旁路云调用遗漏 | 局部功能仍依赖云开发 | 全仓扫描 + 旁路清单 |
| live patch 遗漏 | 云端与源码不同 | 迁移前解压 live patch 作为真实源码基线 |
| 切换后写入无法回滚 | 数据分叉 | 写入日志 + 冻结窗口 + 补偿脚本 |
| 小程序域名未配置 | http 请求失败 | 提前配置合法域名并真机验证 |

## 10. 推荐执行排期

保守排期：

| 周期 | 目标 |
| --- | --- |
| 第 1 周 | 服务器空壳、网关、登录、db/storage/logger adapter |
| 第 2 周 | 数据导出/导入/对账脚本，全量演练 |
| 第 3 周 | 路由接入、读接口影子校验、小猫 AI 接入 |
| 第 4 周 | 写接口、文件迁移、定时任务、企业微信 |
| 第 5 周 | 财务/工资/审计对账、全量彩排、回滚演练 |
| 切换日 | 冻结、最后增量、一次切换、监控 |

如果必须加速，最短也应保留：

- 3 次全量导入。
- 3 次增量追平。
- 1 次完整回滚演练。
- 1 个低峰冻结窗口。

## 11. 本轮结论

可以迁，但不能用“直接把云函数搬到服务器然后改前端地址”的方式迁。

最稳的一次性完整迁移路线是：

1. 先建自有服务器兼容网关。
2. 再建数据库、身份、文件、日志四个 adapter。
3. 用导入和影子校验把问题提前打完。
4. 切换当天只做冻结、最后增量、校验和 transport 开关。
5. 保留云开发回滚窗口，等新后端稳定后再逐步下线云依赖。

这样正式切换看起来是“一次完成”，但真正的风险已经在切换前通过演练消化掉。
