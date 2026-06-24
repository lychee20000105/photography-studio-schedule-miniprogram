# 版本修改日记


## v1.88 - 2026-06-24 18:36 CST

### 改动级别

小改修复，v1.87 -> v1.88。

### 本次目标

补齐小猫 Agent 审计流水从“后台写入”到“管理员可查看”的闭环。v1.86 已经让 AI 写入动作尝试落 Agent 审计记录，本次在小程序管理中心增加审计入口、筛选列表和云端查询路由，方便后续追踪小猫到底执行过什么动作、由谁触发、风险等级是什么。

### 和 AI 讨论后的需求结论

- HanaAgent 类桌面能力不能直接搬进小程序，但“可审计、可追溯、可控工具边界”必须保留。
- 审计记录不只写入，还要能被管理员看见；否则出了问题只能查数据库，不适合小团队日常管理。
- 审计列表只展示必要摘要，不暴露密钥、Token 或完整隐私内容；审计内容在服务层做长度裁剪。
- 完整 `mcloud` 部署仍可能受本地 `EISDIR` 问题影响，因此继续采用入口 live patch 注入新增路由与服务。

### 主要修改

- 新增 `work_agent_audit_service.js`，封装 Agent 审计流水分页查询、筛选条件和前端字段清洗。
- `work_admin_controller.js` 新增管理中心“AI 审计流水”菜单入口和 `getAgentAuditList` 接口。
- `route.js` 新增 `work/admin_agent_audit_list` 路由。
- `app.json` 注册 `projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit` 页面。
- 新增 `admin_agent_audit` 页面四件套，支持关键词、动作、风险筛选，下拉刷新和触底分页。
- `index.js` 预加载 `work_route_live_patch.js`，新增 live patch 内联最新路由、审计服务和管理控制器。
- 更新 `miniprogram/version.js`、`miniprogram/setting/setting.js`、`CHANGELOG.md`、`README.md` 和本文档到 v1.88。

### 涉及文件

- `cloudfunctions/mcloud/index.js`
- `cloudfunctions/mcloud/work_admin_controller_live_patch.js`
- `cloudfunctions/mcloud/work_route_live_patch.js`
- `cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js`
- `miniprogram/app.json`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.json`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.wxml`
- `miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.wxss`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/public/route.js` 通过。
- `node --check cloudfunctions/mcloud/index.js` 通过。
- `node --check cloudfunctions/mcloud/work_admin_controller_live_patch.js` 通过。
- `node --check cloudfunctions/mcloud/work_route_live_patch.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js` 通过。
- `node --check miniprogram/version.js` 通过。
- `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json`、`admin_agent_audit.json` 与 `project.config.json` JSON 解析通过。
- live patch 加载检查通过；仅出现项目既有 `ws` 依赖提示，不影响本次 patch 注入。
- `git diff --check` 通过，仅有 Windows 换行提示。

### 部署状态

- `mcloud/index.js` 已通过增量部署上传，包体 `370 B`。
- `mcloud/work_admin_controller_live_patch.js` 已通过增量部署上传，包体 `5.1 KB`。
- `mcloud/work_route_live_patch.js` 已通过增量部署上传，包体 `2.8 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.88`，包体 `1.5 MB` / `1,547,955 Byte`。
- 本次未提交审核、未发布上线；完整 `mcloud` 部署仍沿用增量 live patch 方案避开已知 `EISDIR` 问题。

### 未完成风险

- 如果云数据库尚未创建 `bx_work_agent_audit` 集合，历史列表可能为空或依赖 CloudBase 自动建集合行为；写入链路已做失败兜底，不会阻塞小猫原业务动作。
- 本次只补管理端查看入口，尚未做审计详情页、导出、批量复盘或风险统计看板。

## v1.87 - 2026-06-24 18:32 CST

### 改动级别

体验修复，v1.86 -> v1.87。

### 本次目标

修复小李在真实手机上配置 AI API 时遇到的三个问题：API Key 不能方便粘贴，配置页显示不规整，以及测试对话返回 `Param Incorrect` 后无法继续判断配置问题。

### 和 AI 讨论后的需求结论

- 手机端不能只依赖密码输入框长按粘贴；管理员需要一个明确的“粘贴”按钮直接读取剪贴板。
- API Key 属于敏感信息，页面可以显示本次正在输入的内容，但已保存 Key 仍只展示脱敏值。
- 第三方兼容接口返回 `Param Incorrect` 时，不应只把原始英文报错丢给用户；应先自动降级重试，再给出 Base URL、模型 ID、视觉模型兼容性的排查方向。

### 主要修改

- `work_admin_ai.js` 新增剪贴板读取、Key 显示/隐藏、清空输入和粘贴内容清洗逻辑。
- `work_admin_ai.wxml` 将主 Key 与视觉 Key 输入区改成“输入框 + 粘贴/显示/清空”结构。
- `work_admin_ai.wxss` 固定 Key 操作按钮布局，提升手机端输入区稳定性，并避免小猫浮层挡住配置页操作。
- `work_ai_service.js` 在 AI 请求遇到 400/422 或参数兼容错误时，自动用最小 Chat Completions 请求体重试一次。
- `work_ai_service.js` 将参数错误提示改为可执行排查说明，覆盖 Base URL、模型 ID 和视觉模型配置。
- 更新 `miniprogram/version.js`、`miniprogram/setting/setting.js`、`CHANGELOG.md`、`README.md` 和本文档到 v1.87。

### 涉及文件

- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/version.js` 通过。
- `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json` 与 `project.config.json` JSON 解析通过。
- `work_ai_service_live_patch.js` 解压后与 `work_ai_service.js`、`work_ai_agent_registry.js`、`work_ai_agent_memory.js`、`work_agent_audit_model.js` 一致。
- `git diff --check` 通过，仅有 Windows 换行提示。

### 部署状态

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `39.8 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.87`，包体 `1.5 MB` / `1,547,783 Byte`。
- 云函数增量部署前三次遇到微信 Cloud API `getCloudAPISignedHeader failed` / `41002 system error`，最后一次重试成功。

### 未完成风险

- 未验证每一家第三方 APIHub 对最小参数重试的兼容程度；如果模型 ID 本身填错或该接口不是 OpenAI Chat Completions 兼容接口，仍需要管理员更正配置。

## v1.86 - 2026-06-24 03:20 CST

### 改动级别

功能升级，v1.76 -> v1.86。

### 本次目标

参考桌面方案《云屿小猫Agent-HanaAgent迁移完整方案.md》，把小猫 Agent 从“一个大提示词 + 一组硬编码动作”推进到更容易维护的底座：技能注册、工具白名单、轻量记忆、审计流水，以及可自由切换 DeepSeek/Mimo/自定义 API 的配置体验。

### 和 AI 讨论后的需求结论

- HanaAgent 的桌面文件、终端、浏览器能力不能直接搬到小程序；应迁移的是 Agent 分层、工具注册、记忆、审计和安全边界。
- 小程序端优先落地“受控业务 Agent”：动作可以执行，但必须由后台权限和数据校验兜底。
- 长期记忆和知识库要分阶段做；本次先做轻量会话记忆，不自动写长期库，避免生产数据被错误沉淀。
- 手机端 AI 配置页要能真正换 DeepSeek、Mimo 或任意兼容接口；自定义预设不能继续保留 Agnes 的旧 URL 和模型。

### 主要修改

- 新增 `work_ai_agent_registry.js`，按技能声明触发词、提示词和允许动作，覆盖档期查询、订单录入、图片录单、改期纠错、财务、工资审核、小记事项、休息请假、客户跟进和知识问答。
- `work_ai_service.js` 接入技能注册表：本轮对话先选择技能，再生成工具提示词和动作白名单；越界动作不执行，成功幻觉会被改写成未执行提示。
- 新增 `work_ai_agent_memory.js`，把当前员工、页面上下文、订单上下文和本轮客户跟进线索压缩到系统提示词。
- 新增 `work_agent_audit_model.js`，AI 写入动作在团队小记之外额外尝试写 Agent 审计流水，失败不阻塞原业务。
- `work_admin_ai.js` 将 `Mimo` 和 `自定义` 拆成独立预设；选择自定义类预设会清空旧接口和模型，便于直接填新的 Base URL。
- `work_pet.js` 将小猫 Agent 内置版本更新为 `0.3.0 HanaAgent 架构底座`。
- 更新 `miniprogram/version.js`、`miniprogram/setting/setting.js`、`CHANGELOG.md`、`README.md` 和本文档到 v1.86。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_agent_memory.js`
- `cloudfunctions/mcloud/project/B00/model/work_agent_audit_model.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_memory.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/model/work_agent_audit_model.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check cloudfunctions/mcloud/index.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 通过。
- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- `node --check miniprogram/version.js` 通过。
- `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json` 与 `project.config.json` JSON 解析通过。
- 技能白名单样例通过：档期查询只开放 `query_schedule`，收款查询只开放 `query_payments`，改期只开放 `update_order/cancel_order/query_schedule`，工资写入开放工资/审核相关动作。
- `git diff --check` 通过，仅有 Windows 换行提示。

### 部署状态

- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.86`，包体 `1.5 MB` / `1,533,406 Byte`。
- `mcloud` 云函数入口 `index.js` 已通过增量部署上传。
- `work_admin_controller_live_patch.js` 已通过增量部署上传。
- `work_ai_service_live_patch.js` 已改为内联依赖版本，并通过增量部署上传；它会在云端运行时注入 `work_ai_agent_registry.js`、`work_ai_agent_memory.js`、`work_agent_audit_model.js` 和新版 `work_ai_service.js`。
- 完整 `mcloud` 部署仍遇到微信开发者工具已知 `EISDIR` 问题；本次没有继续强行全量部署，避免影响现有云函数包。

### 未完成风险

- 本次只实现轻量会话记忆，尚未启用 `agent_memories` 长期记忆库和后台管理页。
- Agent 审计模型已加入代码，但云数据库如果尚未创建集合，写入会失败并被兜底忽略；后续需要补管理端审计列表和集合初始化。

## v1.76 - 2026-06-24 02:31 CST

### 改动级别

小改，v1.75 -> v1.76。

### 本次目标

修复手机端 AI 小助手配置页“不够自由”和“不规整”的问题：小李需要能直接换 DeepSeek、Mimo 或任意兼容 API，也需要文字模型和图片识别模型分开配置，不能再被“先获取模型列表”的单一流程卡住。

### 和 AI 讨论后的需求结论

- 配置页必须允许手动填写 Base URL 和模型 ID；获取模型列表只能是辅助，不应该成为修改模型的前置条件。
- DeepSeek、Mimo/自定义这类模型不应被固定在 Agnes APIHub 的默认值里；预设只做快捷入口，管理员仍可自由覆盖。
- 图片识别和普通文字对话可以使用不同模型；有图片时优先用视觉模型，没图片时走文本模型。
- 手机端页面要单列分组，避免标签、输入框、按钮和说明文字挤在同一行造成“点修改没反应”的错觉。

### 主要修改

- `work_admin_ai.js` 新增服务商预设、文本模型列表、视觉模型列表、视觉接口地址、视觉 API Key 和手动模型 ID 流程。
- `work_admin_ai.wxml` 将配置页拆成“服务商 / 文本模型 / 图片识别模型 / 小猫行为”四块，保留手动输入作为主路径。
- `work_admin_ai.wxss` 增加手机端优先的单列布局、预设按钮、固定宽度获取按钮和输入框溢出约束。
- `work_admin_controller.js` 支持 `clearVisionKey` 和 `target=vision` 的模型列表请求。
- `work_ai_service.js` 保存视觉配置，并在聊天带图片时优先选择视觉接口、视觉 Key 和视觉模型。
- 更新 `miniprogram/version.js`、`miniprogram/setting/setting.js`、`CHANGELOG.md`、`README.md` 和本文档到 v1.76。

### 涉及文件

- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 通过。
- `node --check cloudfunctions/mcloud/index.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check cloudfunctions/mcloud/work_admin_controller_live_patch.js` 通过。
- `node --check miniprogram/version.js` 通过。
- `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json` 与 `project.config.json` JSON 解析通过。
- `work_ai_service_live_patch.js` 和 `work_admin_controller_live_patch.js` 解压后均与对应源码一致。
- `git diff --check` 通过，仅有 Windows 换行提示。

### 部署状态

- `mcloud` 已增量部署 `work_ai_service_live_patch.js`、`work_admin_controller_live_patch.js` 和 `index.js`。
- 完整 `mcloud` 部署仍遇到微信开发者工具已知 `EISDIR` 问题，本次通过 live patch 让云端加载最新服务与控制器逻辑。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.76`，包体 `1.5 MB` / `1,532,105 Byte`。

## v1.75 - 2026-06-24 02:10 CST

### 改动级别

小改，v1.74 -> v1.75。

### 本次目标

修复小猫助手在截图录单、改档期确认和 AI 超时场景下的误判：页面顶部日期不能被卡片备注覆盖；用户补充“第4张漏了”“1”“无补充”时，应优先进入本地可确定的业务流程，而不是反复调用长耗时 AI。

### 和 AI 讨论后的需求结论

- 每日详情页顶部 `2026.09.11` 是订单档期日期；卡片里的 `9.16摄影` 只能当备注。两者冲突时，应先向用户追问确认，而不是直接覆盖订单日期。
- 多张相似截图不能因为版式相近就合并判断；一张图可能对应一条订单，也可能漏识别，用户指出“第几张漏了”时要只追补那张。
- 小猫回复“已改”必须以真实落库或可执行确认流程为前提；不能模型先承诺成功，后续云函数才超时失败。
- 对“无补充”“只有一个”“1”等短回复，若能从上下文确定意图，应走本地流程快速收口，减少外部模型和 20 秒云函数超时影响。

### 主要修改

- `work_ai_service.js` 加强截图日期规则：页面顶部日期优先，备注日期冲突先追问；多张相似图按图片独立处理。
- `work_ai_service.js` 新增漏图追补解析，识别“第4张漏了”等说法，无法拿到历史图片时明确提示重新上传指定图片。
- `work_pet.js` 前端补齐漏图追补：从历史消息里取指定图片的 `fileID`，只重送该图给云函数。
- `work_pet.js` 前端改期确认补齐关键词和数字选择，支持“爱公馆9.16那个改为9.11”后回复“1”继续保存。
- `work_pet.js` 对“无补充”等确认回复做本地响应，避免再次触发 AI 调用超时。
- `index.js` 预加载 `work_ai_service_live_patch.js`，用于在完整云函数部署受本地目录打包问题影响时，先让云端使用最新小猫逻辑。
- 更新 `miniprogram/version.js`、`miniprogram/setting/setting.js`、`CHANGELOG.md`、`README.md` 和本文档到 v1.75。

### 涉及文件

- `cloudfunctions/mcloud/index.js`
- `cloudfunctions/mcloud/work_ai_service_live_patch.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- `node --check miniprogram/version.js` 通过。
- `node --check miniprogram/setting/setting.js` 通过。
- `git diff --check` 通过；仅保留换行符提示。
- 已下载云端 `mcloud` 函数并核对 `work_ai_service_live_patch.js` 哈希一致。

### 部署状态

- `mcloud` 云函数 live patch 已通过微信开发者工具 CLI 增量部署。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.75`，包体 `1.5 MB` / `1,521,594 Byte`。

## v1.74 - 2026-06-21 18:25 CST

### 改动级别

小改，v1.73 -> v1.74。

### 本次目标

修复小猫助手在“把20号档期改到21号 / 只有一个”场景下仍追问或遇到 AI 服务不可用的问题，并把小猫权限改为基于当前登录账号的真实业务权限。

### 和 AI 讨论后的需求结论

- 小猫不应在提示词层面自我限制“高风险操作都不能做”，而应按当前登录账号权限生成动作，由后端服务做最终权限和数据校验。
- 收款、提成、工资、审核等敏感动作可以由管理员账号触发，但必须保留明确对象、金额、月份、原因和审查流水。
- 对截图和聊天记录要强化误导约束：区分套餐/应收与实收/到账，红包或转账必须确认方向和到账状态。
- “只有一个”属于上一轮改期确认，应能回看历史消息并自动处理；若外部 AI 服务不可用，前端也应能兜底处理唯一订单改期。

### 主要修改

- `work_ai_service.js` 扩展小猫工具动作，新增收款查询/录入/作废、提成查询、工资查询/发放、订单审核，并按普通员工/管理员分别走权限边界。
- `work_ai_service.js` 增加截图、红包、转账、定金、套餐金额等误导约束，避免把套餐价误判成实收。
- `work_pet.js` 新增前端唯一订单改期兜底：先查目标日期当天订单，只有一个则拉取订单详情、改写日期并保存。
- `work_pet.js` 改期后自动刷新日历，并同步写入团队小记审查流水。
- 更新 `miniprogram/version.js`、`miniprogram/setting/setting.js`、`CHANGELOG.md`、`README.md` 和本文档到 v1.74。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/version.js`
- `miniprogram/setting/setting.js`
- `CHANGELOG.md`
- `README.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- `node --check miniprogram/version.js` 通过。
- `node --check miniprogram/setting/setting.js` 通过。
- `git diff --check` 通过。

### 部署状态

- 仅本地代码已修改。
- 需要在微信开发者工具重新编译前端。
- 需要重新部署 `cloudfunctions/mcloud` 云函数后，云端 AI 权限与深度分析能力才完整生效。

## v1.72 - 2026-06-20 小猫助手录单解析与多会话安全修复

### 修改原因

修复 AI 录单金额清洗、跨年日期纠偏、访客客户名识别和多会话异步写入/滚动串线问题。

### 修改内容

- `_amount()` 支持从包含符号、单位或杂字符的金额文本中提取数字，避免金额被静默保存为 0。
- 跨年日期修正改为互斥分支，避免同一日期被二次加减年份。
- 访客模式客户名识别扩展 CJK 范围，并继续拦截金额/来源词误当客户名。
- 小猫多会话异步回复增加线程守卫，避免切换会话后写错聊天记录或强制滚动当前会话。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `node --check miniprogram/helper/guest_helper.js`
- `node --check miniprogram/cmpts/work_pet/work_pet.js`
- 金额清洗与访客客户名回归用例通过

> 记录云屿摄影小程序每次本地代码修改、版本号、讨论结论、涉及文件、验证结果和部署状态。
> 安全规则：密钥、密码、token、客户隐私、订单隐私不写入本文档原文；必要时只记录脱敏描述。

## 版本规则

- 当前版本基线：v1.42。
- 小改：版本号 `+0.01`，例如 v1.42 -> v1.43。
- 大改：版本号 `+0.10`，例如 v1.42 -> v1.52。
- 完全体系升级：版本号 `+1.00`，例如 v1.42 -> v2.42。
- 每次修改后同步更新：
  - `miniprogram/setting/setting.js`
  - `miniprogram/version.js`
- `CHANGELOG.md`
- 本文档

## v1.71 - 2026-06-19 06:52 CST

### 改动级别

小改，v1.70 -> v1.71。

### 本次目标

修复"本周一"在周五等非周一基准日时错误跳转到下周一的问题。

### 和 AI 讨论后的需求结论

- `_extractWeekdayTextDate` 中"本周/这周"前缀的条件分支 `if (offset < 0) offset += 7` 会导致当前周内已过去的日期被推到下周一。
- 例如：用户在周五说"本周一安排拍摄"，期望返回本周一（2026-06-15），但代码返回下周一（2026-06-22）。
- 根因：对于"本周"前缀，用户明确表示"当前这一周"，不应将负 offset 修正为正值。
- 修复策略：移除"本周/这周"前缀分支中的 `if (offset < 0) offset += 7`，让 offset 保持原值，指向当前 ISO 周内对应日期。

### 主要修改

- `work_ai_service.js` 的 `_extractWeekdayTextDate` 中"本周/这周/本星期/这星期/本礼拜/这礼拜"分支移除 `if (offset < 0) offset += 7`。
- 同步更新 `miniprogram/setting/setting.js`、`miniprogram/version.js` 和 `CHANGELOG.md` 的版本记录。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `work_ai_service.js`、`setting.js` 和 `version.js`，通过。
- 星期解析验证 20/20 通过：下周六、本周五、周日、下星期六、下礼拜天、上周一、上周六、上周日、下周一、本周一（修复项）、周三、上上周一、上上周六、下下周三、这周五、周一基准本周一/本周五/本周日、周日基准本周一/本周日。
- 连续第 74 轮无 v1.69/v1.70 回归发现（本次为 v1.71 新增修复）。

### 部署状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.70 - 2026-06-19 04:36:11 CST

### 改动级别

小改，v1.69 -> v1.70。

### 本次目标

修复小猫助手无法识别"上周一""上周六""上星期三"等过去一周星期日期的问题。

### 和 AI 讨论后的需求结论

- `_extractWeekdayTextDate` 正则和条件分支未覆盖"上周"前缀，导致"上周一"从周五基准算被当作"周一"处理，返回下周一而非上周一。
- 这是预已存在的功能缺失，不是 v1.69 引入的回归。
- 修复策略：在正则中添加上上周/上周/上星期/上礼拜前缀，在条件分支中添加对应 offset 偏移。

### 主要修改

- `work_ai_service.js` 的 `_extractWeekdayTextDate` 正则新增 `上上周|上上星期|上上礼拜|上周|上星期|上礼拜` 前缀匹配。
- 条件分支新增 `offset -= 14`（上上周）和 `offset -= 7`（上周）处理。
- 同步更新 `miniprogram/setting/setting.js`、`miniprogram/version.js` 和 `CHANGELOG.md` 的版本记录。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- 已完成本地代码修改。
- `node --check` 已检查 `work_ai_service.js`、`setting.js` 和 `version.js`，通过。
- 星期解析验证 10/10 通过：下周六、本周五、周日、下星期六、下礼拜天、这周五、周一、上周一、上周六、上周日。
- 上周一从周五基准正确换算为 2026-06-08（上周一）。
- 上周六从周五基准正确换算为 2026-06-13（上周六）。
- 尚未在微信开发者工具真机/模拟器复测。

### 部署状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.69 - 2026-06-18 23:15:34 CST

### 改动级别

小改，v1.68 -> v1.69。

### 本次目标

修复两个明确问题：直接添加档期添加不了；小猫助手添加档期遇到星期类日期或动作别名时容易显示格式错误。

### 和 AI 讨论后的需求结论

- `work/add` 不是 tabBar 页面，不能使用 `wx.switchTab` 打开；从日历页和日详情页进入时应使用 `wx.navigateTo`。
- 新增档期页既要能从 URL 参数拿到 `day`，也要保留 `WORK_ADD_DAY` 作为兜底。
- 小猫助手除了今天/明天/后天，也要能把“下周六、本周五、周日”等常见县城门店口语日期转成标准日期。
- 兼容 `create_note` 和既有 `add_note`，避免模型输出同义动作时被系统判成不能执行或格式错误。

### 主要修改

- `work_calendar.js` 的直接新增档期入口从 `wx.switchTab` 改为 `wx.navigateTo`，并携带 `?day=YYYY-MM-DD`。
- `work_day_detail.js` 的直接新增档期入口从 `wx.switchTab` 改为 `wx.navigateTo`，并携带 `?day=YYYY-MM-DD`。
- `work_order_edit.js` 新建态默认设置 `canEdit/canFull` 为 `true`，修复保存按钮和编辑入口被隐藏的问题。
- `work_ai_service.js` 新增星期类日期解析，支持周/星期/礼拜表达，并将 `create_note` 归一到 `add_note`。
- `work_pet.js` 刷新逻辑兼容 `create_note`，确保小猫助手写入后仍能触发页面刷新。
- 同步更新 `miniprogram/setting/setting.js`、`miniprogram/version.js` 和 `CHANGELOG.md` 的版本记录。

### 涉及文件

- `miniprogram/projects/B00/pages/work/calendar/work_calendar.js`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- 已完成本地代码修改。
- `node --check` 已检查 `work_calendar.js`、`work_day_detail.js`、`work_order_edit.js`、`work_pet.js`、`work_ai_service.js`、`setting.js` 和 `version.js`，通过。
- 已检查关键页面均在 `app.json` 注册，且 `.js/.json/.wxml/.wxss` 文件齐全。
- 已检查 `work/order_save`、`work/item_save`、`work/rest_save`、`work/ai_chat`、`work/admin_ai_config_get`、`work/admin_ai_config_save` 路由存在。
- 星期类日期轻量用例通过：`下周六`、`本周五`、`周日`、`下星期六`、`下礼拜天` 均可换算为标准日期。
- 尚未在微信开发者工具真机/模拟器复测。

### 部署状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.68 - 2026-06-12 15:20:57 CST

### 改动级别

小改，v1.67 -> v1.68。

### 本次目标

修复小猫助手记录“今天下午一点，拍摄螺先生视频”时，把今天误识别成 `2026-06-01`，并且只生成AI操作记录、真实档期不显示的问题。

### 和 AI 讨论后的需求结论

- 2026-06-12 当天，用户说“今天”时必须按服务器当前日期解析为 `2026-06-12`，不能完全相信模型返回的日期字段。
- AI写入动作如果涉及“今天/明天/后天”等相对日期，后端必须用用户原话和服务器日期做兜底纠偏。
- AI新增事项不能只写成待审核状态后回复“已新增档期”；如果要回复成功，真实事项必须能在日历和日详情看到。
- AI操作记录应在真实业务记录落库校验通过后再写入，避免“只有AI记录，没有实际档期”的假成功。

### 主要修改

- `work_ai_service.js` 新增用户原话日期纠偏：支持从原话识别单个明确日期，或把“今天/明天/后天/大后天/昨天/前天”按服务器当前日期换算。
- `work_ai_service.js` 的日期清洗新增真实日历校验，避免不存在日期或版本号、小数被误识别成日期。
- `work_ai_service.js` 写入类动作改用新的日期清洗入口；单条订单、事项、休息、小记和查询档期都会优先使用用户原话中的日期线索。
- `work_ai_service.js` 的AI新增事项改为保存后回查 `WorkItemModel`，确认记录存在、日期标题匹配且状态生效后，才写AI操作记录并返回成功。
- `work_service.js` 的 `saveItem` 新增受控 `forceActive` 参数，仅服务端AI调用可让事项直接生效，普通前端保存仍沿用原审核规则。
- 同步更新 `miniprogram/setting/setting.js`、`miniprogram/version.js` 和 `CHANGELOG.md` 的版本记录。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- 已完成本地代码修改。
- `node --check` 已检查 `work_ai_service.js`、`work_service.js`、`miniprogram/version.js` 和 `miniprogram/setting/setting.js`，通过。
- 轻量日期纠偏用例已确认：`今天下午一点` 会从模型错误日期 `2026-06-01` 纠正为 `2026-06-12`，`明天` 会纠正为 `2026-06-13`，`6.15` 会纠正为 `2026-06-15`。
- 轻量非法日期用例已确认：版本号文本 `1.68` 不会被当作日期，`2026-01-68` 会被拦截。
- 本次涉及的已跟踪文件 `git diff --check` 通过；全仓 `git diff --check` 仍命中既有无关空格 `miniprogram/projects/B00/biz/project_biz.js:17`，本次未改动该文件。
- 尚未在微信开发者工具真机/模拟器复测。

### 部署状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.66 - 2026-06-11 20:02:17 CST

### 改动级别

小改，v1.65 -> v1.66。

### 本次目标

修复微信开发者工具上传 `mcloud` 云函数时报错：`请确认 config.json 中包含合法的 triggers 字段`。

### 和 AI 讨论后的需求结论

- 开发者工具错误发生在“上传云函数 mcloud 的触发器”阶段，不是小程序前端编译错误。
- `cloudfunctions/mcloud/config.json` 原本只有 `timeout` 和 `permissions`，缺少 `triggers` 字段。
- `mcloud` 是普通业务云函数，不是定时任务云函数，因此不应新增 timer 触发器。
- 对这类非定时云函数，补合法空数组 `triggers: []` 即可让开发者工具通过触发器配置校验。

### 主要修改

- `cloudfunctions/mcloud/config.json` 新增 `"triggers": []`。
- 规范化 `permissions.openapi` 数组空格。
- 同步更新 `miniprogram/setting/setting.js`、`miniprogram/version.js` 和 `CHANGELOG.md` 的版本记录。

### 涉及文件

- `cloudfunctions/mcloud/config.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- JSON 解析已检查 `cloudfunctions/mcloud/config.json`，通过。
- `node --check` 已检查 `miniprogram/setting/setting.js` 和 `miniprogram/version.js`，通过。
- 尚未在微信开发者工具重新点击上传 `mcloud` 云函数。

### 部署状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.65 - 2026-06-11 19:57:52 CST

### 改动级别

小改，v1.64 -> v1.65。

### 本次目标

继续修复上一轮未完成的重复订单 bug：不能只在 AI 录单层做“保存前查重”，还要把核心重复判断下沉到订单保存服务入口，避免普通保存、并发保存或后续新增入口绕过 AI 层继续重复落库。

### 和 AI 讨论后的需求结论

- 重复订单问题的最后一层风险在 `work_service.js` 的 `saveOrder`，该入口原本校验权限、金额和财务状态后直接插入。
- AI 层仍需要给用户友好的“已跳过”提示，但真正防止重复落库应由订单保存服务兜底。
- 判重不能只看同一天或同时间，避免误伤同一天同客户但不同拍摄类型的订单。
- 判重应至少要求同日期、同客户名或有效电话、同拍摄类型；有明确时间时同时间才拦截，缺时间时再结合电话或地点等信息保守拦截。
- 短数字片段不能当作有效手机号匹配，避免 OCR 错识别造成误判。

### 主要修改

- `work_service.js` 新增统一订单重复判断方法，包含客户名、有效电话、时间、拍摄类型和地点归一化比较。
- `saveOrder` 在新增或编辑前执行 `_assertNoDuplicateOrder`，编辑时排除当前订单自身。
- `work_ai_service.js` 的 AI 单条、批量和批量内去重改为复用 `WorkService` 的统一判断，减少两套规则漂移。
- 同步更新 `miniprogram/setting/setting.js`、`miniprogram/version.js` 和 `CHANGELOG.md` 的版本记录。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `work_service.js` 和 `work_ai_service.js`，通过。
- 轻量规则样本验证已确认：同日同客户同类型同时间会判重；同日同客户不同类型不会判重；同日同客户同类型不同时间不会判重。
- 还未运行微信开发者工具或云函数线上验证。

### 部署状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.64 - 2026-06-11 17:47:00 CST

### 改动级别

小改，v1.63 -> v1.64。

### 本次目标

修复 AI 截图/文字录单里最容易让人误判的两类问题：日期写法识别过严导致录单失败或日期错位，以及重复订单判断过松和保存后缺少回查导致“说已登记但实际上没落库”的假成功。

### 和 AI 讨论后的需求结论

- AI 录单日期不能只接受严格 `YYYY-MM-DD`，常见的 `2026/6/13`、`2026年6月13日`、`6.13` 也要能规范成标准日期。
- 重复判断不能只靠“同一天 + 同客户”就跳过新单，至少要看客户、时间、类型等多个关键字段一起匹配。
- 保存完成后要再查一次真实记录，确认真的写进系统后再给“已登记”类回复。

### 主要修改

- `work_ai_service.js` 的 `_cleanDate` 增强了日期格式兼容，保存前统一标准化成 `YYYY-MM-DD`。
- `work_ai_service.js` 的重复判断从“同客户 + 单一字段”收紧为“同客户 + 多个字段同时匹配”。
- `work_ai_service.js` 在 `saveOrder` 后增加落库回查，若写入失败或字段不一致直接报错，不再返回空成功提示。
- 同步更新 `miniprogram/version.js`、`miniprogram/setting/setting.js` 和 `CHANGELOG.md` 的版本记录。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- 代码已完成本地修改并同步版本记录。
- 还未运行微信开发者工具或云函数线上验证。

### 部署状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.63 - 2026-06-11 16:17:18 CST

### 改动级别

小改，v1.62 -> v1.63。

### 本次目标

根据开发者工具截图继续修正小猫助手和业绩页体验：缩小聊天必须有输入框，放大聊天顶部不能占太多空间，日志文案需要规范排版，常用区删除按钮取消，等待文案更贴近小猫语气；业绩页默认展示本人信息，并把订单和业绩都放在同一工作台里。

### 和 AI 讨论后的需求结论

- 小猫助手缩小态不能因为聊天列表高度挤掉输入框。
- 放大态顶部只保留必要信息，说明小字不再展示，避免标题和按钮挤压。
- 清空/删除聊天不应放在 `+` 旁边作为高频按钮，避免误触。
- Agent日志需要分区排版，而不是一整段系统弹窗文字。
- 业绩页默认展示本人业绩和本人排行，其他人/团队排行默认收起。
- 业绩页上半部分放业绩，下半部分放订单，每块都展示一部分摘要，更多信息再点进去。

### 主要修改

- 小猫聊天面板改为固定弹层高度和 flex 布局，保障输入区、快捷问题和附件预览始终可见。
- 小猫全屏头部压缩高度，隐藏说明小字，标题不再换行竖排。
- 小猫头部和侧边栏底部移除清空聊天按钮，仅保留新建、缩放、关闭和设置。
- 等待回复文案改为“小猫正在思考...”。
- Agent信息从 `wx.showModal` 改为自定义弹层，按版本信息、模型信息和更新日志排版。
- 业绩页新增本人排行卡，其他员工/团队排行默认收起。
- 业绩页新增订单概览区，拉取 `work/order_list` 展示本月订单、未定档、未结算、未收合计和最近订单。

### 涉及文件

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/projects/B00/pages/work/performance/work_performance.js`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `work_pet.js`、`work_performance.js`、`version.js` 和 `setting.js`，通过。
- JSON 解析已检查业绩页配置、`app.json` 和 `project.config.json`，通过。
- `git diff --check` 已检查本次涉及文件，未发现空白或补丁格式问题。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。
- 未上传 `mcloud` 云函数。

## v1.62 - 2026-06-11 15:25:36 CST

### 改动级别

小改，v1.61 -> v1.62。

### 本次目标

集中处理订单入口、店内知识、版本识别、AI录单、消息详情、附件预览、小猫助手、员工规则、访客隔离和 Hanako Agent 参考方案等问题。先落地可闭环的本地功能与安全修复，再把流式回复、联网搜索、Skill 化和完整知识权限体系记录为后续路线。

### 和 AI 讨论后的需求结论

- 访客不能看到任何真实档期、订单、小记、业绩、团队或工资数据；访客通过小猫新增的内容只能作为本机临时访客数据，不能同步到登录后的真实账号。
- AI截图录单必须区分订单金额、定金、尾款、已收和未收，不能把“尾款未收”误认为“尾款已收”。
- 多订单截图需要逐条去重和逐条新增，已登记订单应跳过，未登记订单应继续登记。
- 消息中心应像微信消息一样能点开卡片看详情，并能跳转关联订单或反馈。
- 订单附件需要可点击预览，新增附件应转为云文件，不应只停留在本地缓存。
- 原底部“订单”入口改为“知识”，订单工作台迁入业绩页；知识内容后续按权限上传、读取和检索。
- 小猫助手需要更像独立 Agent：有新建对话入口、版本信息、模型信息、受控工具动作和未来 Skill 化能力。
- 员工身份和提成规则应支持管理员用一段话录入，由小猫先规整为结构化规则。

### 主要修改

- 访客模式改为只返回空真实数据和本机临时访客订单；访客小猫新增档期只保存到本机临时缓存，并带过期清理。
- AI录单提示词和执行层补齐已收字段、支付明细构造、重复订单判断和批量录单清单回复。
- 日历、当天详情和员工可见订单数据补齐 `PAID_AMOUNT`、`UNPAID_AMOUNT` 展示逻辑。
- 消息中心新增消息详情弹层、关联内容入口、卡片摘要和单条点击已读。
- 订单审核通知增加订单摘要，便于用户知道是哪一单进入待结算。
- 订单附件图片支持点击 `wx.previewImage` 放大查看，新增上传继续走云文件转换。
- 底部 tabBar 第三项从“订单”改为“知识”，新增 `work_knowledge` 页面；业绩页新增订单工作台入口。
- 版本更新页按运行时版本与环境标记当前版本、研发版本、待发布、版本预告和历史版本。
- 小猫助手新增 Agent 版本日志、顶部新建对话、设置弹窗和 `join_order` 安全动作。
- 订单非完整编辑权限用户点击订单时，可申请把自己加入参与人；Agent 也可通过 `join_order` 一句话加入。加入后会对已有有效收款补跑幂等提成生成，并给本人发送核实提醒；已结算订单不允许自助加入。
- 员工管理新增自然语言输入框，可解析岗位、手机号、百分比/固定提成和不计提成规则。
- 新增 `docs/hanako-agent-adaptation.md`，记录从 Hanako 参考到云屿小猫的可迁移能力与后续实施边界。

### 涉及文件

- `miniprogram/helper/guest_helper.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.js`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.wxml`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.js`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.wxml`
- `miniprogram/projects/B00/pages/work/messages/work_messages.js`
- `miniprogram/projects/B00/pages/work/messages/work_messages.wxml`
- `miniprogram/projects/B00/pages/work/messages/work_messages.wxss`
- `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.js`
- `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/projects/B00/pages/work/knowledge/work_knowledge.js`
- `miniprogram/projects/B00/pages/work/knowledge/work_knowledge.json`
- `miniprogram/projects/B00/pages/work/knowledge/work_knowledge.wxml`
- `miniprogram/projects/B00/pages/work/knowledge/work_knowledge.wxss`
- `miniprogram/projects/B00/pages/work/version/work_version.js`
- `miniprogram/projects/B00/pages/work/version/work_version.wxml`
- `miniprogram/projects/B00/pages/work/version/work_version.wxss`
- `miniprogram/projects/B00/pages/work/admin_staff/work_admin_staff.js`
- `miniprogram/projects/B00/pages/work/admin_staff/work_admin_staff.wxml`
- `miniprogram/projects/B00/pages/work/admin_staff/work_admin_staff.wxss`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `cloudfunctions/mcloud/project/B00/service/admin/admin_work_service.js`
- `cloudfunctions/mcloud/project/B00/controller/work_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `miniprogram/app.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `docs/hanako-agent-adaptation.md`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查访客隔离、小猫助手、日历、当天详情、消息、订单编辑、店内知识、业绩、版本、员工管理、AI服务、订单服务、通知服务、控制器、路由、版本配置 JS，全部通过。
- JSON 解析已检查 `app.json`、店内知识页、版本页、消息页、日历、当天详情、订单编辑、业绩、员工管理和 `project.config.json`，通过；确认底部 `知识` tab 已注册。
- `git diff --check` 已检查本次涉及的已跟踪文件，未发现空白或补丁格式问题。
- 新增未跟踪文件已单独扫描尾随空格，未发现问题。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。
- 未上传 `mcloud` 云函数。

## v1.61 - 2026-06-11 09:50:02 CST

### 改动级别

小改，v1.60 -> v1.61。

### 本次目标

优化小记、版本和消息体验：AI 操作记录单独分板块显示，普通小记自动规整成条理清晰的“小猫整理”格式；我的页新增版本更新入口；消息中心实现未读数量、未读提醒和一键已读。

### 和 AI 讨论后的需求结论

- AI 操作流水不应混在“全部/团队/个人”普通小记里，应有单独“AI记录”板块。
- 普通小记展示时应自动整理为清晰要点，但不改写原始小记正文，避免破坏历史内容。
- 我的页需要能查看当前版本号和各版本更新内容。
- 消息中心需要类似微信的未读数量提示，并支持一键全部已读。

### 主要修改

- 小记页新增“AI记录”分栏。
- 小记列表前端自动识别 `AI操作记录` 标题，普通分栏过滤 AI 记录，AI 分栏只看操作流水。
- 普通小记卡片新增“小猫整理”要点展示，自动拆分原正文为清晰条目。
- 后端 `work/note_list` 同步支持 AI 操作记录过滤，上传云函数后数据层也会分离。
- 我的页“消息中心”入口新增未读数量角标。
- 我的页新增“版本更新”入口和当前版本胶囊。
- 新增 `work_version` 页面，读取 `version.js` 展示当前版本和历史更新内容。
- 消息中心新增未读数量、未读红点、单条点击已读和一键已读按钮。
- 后端新增 `work/message_summary` 和 `work/message_read_all` 路由。
- 同步版本号到 v1.61，并在 `version.js` 写入版本历史列表。

### 涉及文件

- `miniprogram/projects/B00/pages/work/note/work_note.js`
- `miniprogram/projects/B00/pages/work/note/work_note.wxml`
- `miniprogram/projects/B00/pages/work/note/work_note.wxss`
- `miniprogram/projects/B00/pages/work/messages/work_messages.js`
- `miniprogram/projects/B00/pages/work/messages/work_messages.wxml`
- `miniprogram/projects/B00/pages/work/messages/work_messages.wxss`
- `miniprogram/projects/B00/pages/work/my/work_my.js`
- `miniprogram/projects/B00/pages/work/my/work_my.wxml`
- `miniprogram/projects/B00/pages/work/my/work_my.wxss`
- `miniprogram/projects/B00/pages/work/version/work_version.js`
- `miniprogram/projects/B00/pages/work/version/work_version.json`
- `miniprogram/projects/B00/pages/work/version/work_version.wxml`
- `miniprogram/projects/B00/pages/work/version/work_version.wxss`
- `miniprogram/app.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `cloudfunctions/mcloud/project/B00/controller/work_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查小记、消息、我的、版本页 JS，以及 `version.js`、`setting.js`、`work_service.js`、`work_controller.js`、`route.js`，通过。
- JSON 解析已检查 `app.json`、`work_version.json`、`messages.json`、`note.json`、`project.config.json`，通过；确认版本页已注册到 `app.json`。
- `git diff --check` 已检查本次涉及文件，未发现空白或补丁格式问题。
- 微信开发者工具已触发热重载；云函数未上传前，新增后端路由需部署 `mcloud` 后在云端生效。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。
- 未上传 `mcloud` 云函数。

## v1.60 - 2026-06-11 09:38:22 CST

### 改动级别

小改，v1.59 -> v1.60。

### 本次目标

修复小猫全屏侧栏展开后的收起交互，并调整业绩页排行展示方式：默认收起排行，用户点击展开后再查看；其他员工条目不再出现“仅排名/仅展示排名”文案。

### 和 AI 讨论后的需求结论

- 小猫全屏侧栏展开时，右侧空白应作为收起热区，点击后只收起侧栏，不关闭整个对话。
- 业绩排行默认应折叠，避免一进页面就露出完整排行。
- 员工/团队切换只需要在展开状态展示。
- 对于无金额权限的其他员工，保留姓名和名次即可，不需要额外写“仅排名”。

### 主要修改

- 小猫聊天体内新增 `chat-sidebar-scrim`，全屏侧栏展开时覆盖右侧空白区域。
- 新增 `bindHideSidebar`，点击右侧空白时收起侧栏。
- 业绩页新增 `rankExpanded` 状态，默认 `false`。
- 业绩排行头部新增“展开/收起”按钮，展开后才渲染排行列表和员工/团队切换。
- 切换月份后排行恢复折叠状态。
- 删除非本人排行条目的“仅展示排名”和“仅排名”展示。
- 同步版本号到 v1.60。

### 涉及文件

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/projects/B00/pages/work/performance/work_performance.js`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `work_pet.js` 和 `work_performance.js`，通过。
- `node --check` 已检查 `setting.js` 和 `version.js`，通过。
- `app.json`、`project.config.json` JSON 解析通过。
- 本次涉及文件 `git diff --check` 通过。
- `miniprogram/projects/B00/pages/work/performance` 内已无“仅排名/仅展示排名”展示文案。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。
- 未上传 `mcloud` 云函数。

## v1.59 - 2026-06-11 09:27:41 CST

### 改动级别

小改，v1.58 -> v1.59。

### 本次目标

修复小猫 AI 放大聊天的交互问题，并提升截图录单的批量识别能力：放大态默认不显示侧边栏，聊天内容可以上下滚动，上传多张截图或一张图内有多个订单时不再只记录一条。

### 和 AI 讨论后的需求结论

- 放大聊天时侧边栏应默认隐藏，用户需要时再手动展开。
- 放大聊天内容区必须支持上下翻页，不能被遮罩层或 flex 高度限制卡住。
- 截图识别不能假设一张图只有一个订单；多张图、多张订单卡片都应逐条提取。
- 后端不能只依赖提示词，应新增批量动作协议和执行层兜底。

### 主要修改

- 进入放大聊天时强制默认收起侧边栏，关闭或重新打开聊天恢复普通态。
- 聊天 `scroll-view` 开启 flex 支持，父级补齐 `height:0`、`flex:1`、`overflow:hidden`，避免全屏态不可滚动。
- 遮罩层不再截获所有 `touchmove`，避免影响内部聊天列表滚动。
- 截图录单快捷提示改为逐张识别并记录所有可确认订单。
- 后端 AI 动作协议新增 `create_orders`，支持一次新增多条订单档期。
- 后端兼容 `create_order.data.orders`，即使模型返回多订单数组但动作名仍是单条，也会按批量处理。
- 批量新增订单会返回已新增清单；识别到但缺少日期或客户名称的条目会单独说明。
- 同步版本号到 v1.59。

### 涉及文件

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `work_ai_service.js` 和 `work_pet.js`，通过。
- `node --check` 已检查 `setting.js` 和 `version.js`，通过。
- `app.json`、`project.config.json` JSON 解析通过。
- 本次涉及的已跟踪文件 `git diff --check` 通过；新增未跟踪文件已单独做 JS 语法检查。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。
- 未上传 `mcloud` 云函数。

## v1.58 - 2026-06-11 20:10:00 CST

### 改动级别

小改，v1.57 -> v1.58。

### 本次目标

参考豆包移动端侧边栏样式，优化小猫 AI 全屏聊天的会话侧边栏，并把放大/缩小等文字操作改为简约图标按钮。

### 和 AI 讨论后的需求结论

- 侧边栏应更像左侧抽屉，而不是窄列表。
- 侧边栏需要有搜索占位、功能入口、会话列表和底部工具栏。
- 会话项应更像聊天应用列表：圆形标识、标题、上下文信息、轻量删除入口。
- 全屏聊天顶部的“放大/缩小/关闭”等不应使用文字按钮，应改成简约图标。

### 主要修改

- 全屏聊天头部新增菜单图标。
- 放大/缩小、清空、关闭改为圆形图标按钮。
- 侧边栏宽度和视觉层级调整为抽屉式。
- 侧边栏新增搜索占位、云屿小猫卡片、快捷入口、会话列表和底部工具栏。
- 会话项新增彩色圆点和选中态。
- 同步版本号到 v1.58。

### 涉及文件

- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查小猫组件和版本文件，均通过。
- `app.json` JSON 解析通过。
- 本次涉及文件 `git diff --check` 通过。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。

## v1.57 - 2026-06-10 21:24:00 CST

### 改动级别

小改，v1.56 -> v1.57。

### 本次目标

让版本更新通告排版更清晰，改动内容按 `1. 2. 3.` 分行展示，避免系统弹窗一整段文字难读。

### 和 AI 讨论后的需求结论

- 系统 `wx.showModal` 的内容排版能力有限，不适合展示多条更新说明。
- 更新通告应改为自定义弹窗。
- 内容应分为标题、版本名称、编号清单、更新时间和按钮区。
- “关闭”只关闭本次；“不再提醒”仍记录当前版本。
- 由于小程序没有全局 `app.wxml`，由页面内的小猫组件托管更新通告弹窗。

### 主要修改

- `app.js` 不再直接使用 `wx.showModal` 展示更新通告。
- `app.js` 启动后查找当前页面 `#workPet` 组件并传入版本通告数据。
- 小猫组件新增版本通告弹窗状态、关闭和不再提醒事件。
- 小猫组件新增清单式更新通告 WXML/WXSS。
- 同步版本号到 v1.57。

### 涉及文件

- `miniprogram/app.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `app.js`、小猫组件和版本文件，均通过。
- `app.json` JSON 解析通过。
- 本次涉及文件 `git diff --check` 通过。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。

## v1.56 - 2026-06-10 21:16:00 CST

### 改动级别

小改，v1.55 -> v1.56。

### 本次目标

解决小猫 AI 聊天中用户发送图片后只能看到“已附加1张图片”，无法回看图片内容的问题。

### 和 AI 讨论后的需求结论

- 图片仍然上传到云存储，继续用于 AI 多模态识别和订单附件。
- 聊天窗口展示不依赖再次请求云端图片，优先使用小程序本地缓存路径。
- 用户发送后的消息气泡应显示图片缩略图。
- 点击缩略图应可打开图片预览。
- 待发送附件栏也应显示缩略图，方便发送前确认。

### 主要修改

- 小猫组件新增图片本地缓存目录处理。
- 图片上传时同时复制到本地文件缓存。
- 聊天消息新增 `images` 字段，保存本地预览路径、文件名和 fileID。
- 聊天气泡支持图片缩略图展示和点击预览。
- 待发送附件栏支持图片小缩略图。
- 同步版本号到 v1.56。

### 涉及文件

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查小猫组件和版本文件，均通过。
- `app.json` JSON 解析通过。
- 本次涉及文件 `git diff --check` 通过。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。
- 未上传云函数。

## v1.55 - 2026-06-10 21:06:00 CST

### 改动级别

小改，v1.54 -> v1.55。

### 本次目标

参考 GitHub 上 Hanako 类人格化 agent 的设计思路，结合本地知识库和当前小程序实际功能，让云屿小猫更像贴合摄影工作室业务的 agent，而不是普通聊天框。

### 和 AI 讨论后的需求结论

- 小猫应具备可配置性格，而不是只有固定语气。
- 小猫应知道本小程序的真实功能边界：档期、订单、事项、休息、小记、消息、反馈、业绩、工资、管理中心、收款、提成、审核、AI 配置。
- 小猫应结合云屿知识库提炼出的项目定位：这是摄影工作室档期、订单、员工业绩提成与工资结算小程序，云屿摄影是案例配置和真实业务样本。
- 小猫可以继续直接写入低风险业务数据，但所有写入都要保留团队小记审查流水。
- 高风险动作仍不允许由 AI 直接执行，包括删除、作废、收款、退款、发工资、改提成、审核通过、批量修改。

### 主要修改

- AI 配置页新增“小猫性格”选择。
- 后端新增 4 种性格模板：值班小猫、温柔小猫、审查小猫、成交小猫。
- 后端 agent 系统提示词注入性格、本地知识库摘要和小程序实际功能清单。
- AI 工具动作新增 `create_rest`，支持新增休息/请假申请。
- AI 新增休息/请假申请后自动写入团队小记审查流水。
- 小猫默认开场白与快捷问题改为更贴合实际工作台。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 AI 服务、AI 配置页、小猫组件和版本文件，均通过。
- `app.json` JSON 解析通过。
- 本次涉及文件 `git diff --check` 通过。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。
- 未上传云函数。

## v1.54 - 2026-06-10 20:50:00 CST

### 改动级别

小改，v1.53 -> v1.54。

### 本次目标

让 AI 小猫聊天窗口可以放大为整屏聊天工作台，支持像 Codex 一样管理多个对话，并显示当前对话的上下文占用。

### 和 AI 讨论后的需求结论

- 普通聊天窗口保留，增加“放大”入口。
- 放大后应铺满当前小程序界面，便于长对话和识图录单。
- 左侧增加会话侧边栏，可新建、切换、删除对话。
- 删除对话只删除本机聊天记录，不影响订单、档期和小记。
- 上下文圈显示当前会话估算 token 占用；模型上下文窗口优先按服务端返回，缺省按模型名估算。
- 本次仍只做本地代码实现，不上传、不部署。

### 主要修改

- 小猫组件新增全屏模式、会话侧边栏和本地多会话缓存。
- 旧单会话缓存自动迁移为第一个会话。
- 聊天头部新增上下文占用圈。
- `work_ai_service` 返回模型名、usage 和预估上下文窗口。
- AI 配置页显示当前模型预估上下文窗口。
- 同步版本号到 v1.54。

### 涉及文件

- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxml`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查小猫组件、AI 服务、AI 配置页、版本文件，均通过。
- `app.json` JSON 解析通过。
- 本次涉及文件 `git diff --check` 通过。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。
- 未上传云函数。

## v1.53 - 2026-06-10 20:36:00 CST

### 改动级别

小改，v1.52 -> v1.53。

### 本次目标

每次小程序版本更新后，用户打开小程序时应看到更新通告弹窗，并可选择关闭或不再提醒。

### 和 AI 讨论后的需求结论

- 更新通告应在小程序启动时统一触发。
- 使用当前版本号作为提醒判断依据。
- “关闭”只关闭本次；“不再提醒”记录当前版本，后续同版本不再弹。
- 下次版本号变化后自动重新弹出。

### 主要修改

- `app.js` 引入 `version.js`。
- 新增 `showVersionNotice`，读取当前版本、名称、摘要和日期。
- 使用本地缓存 `YUNYU_VERSION_NOTICE_CLOSED` 记录已关闭提醒的版本号。
- 同步版本号到 v1.53。

### 涉及文件

- `miniprogram/app.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `app.js`、`setting.js`、`version.js`，通过。
- `app.json` JSON 解析通过。
- 本次涉及文件 `git diff --check` 通过。

### 部署状态

- 仅本地代码已修改。
- 未执行微信开发者工具上传。

## v1.52 - 2026-06-10 20:22:00 CST

### 改动级别

小改，v1.51 -> v1.52。

### 本次目标

实现 AI 小猫聊天框的图片入口和多模态识别链路：用户可直接上传截图，让 AI 识别截图里的档期/订单信息并记录，同时将截图保存为订单附件。

### 和 AI 讨论后的需求结论

- 用户反馈 AI 仍回答“无法识别图片”，并且聊天窗口没有添加文件或图片入口。
- 输入框左侧应增加 `+`，支持添加图片或文件。
- 当前第一版聚焦图片和聊天图片文件；普通非图片文件暂不进入识别链路。
- 使用 Agnes APIHub 的多模态模型时，后端应按 OpenAI Chat Completions 的 `image_url` 格式传图。
- 若 AI 根据截图新增订单，原截图应写入 `ORDER_ATTACHMENTS`。
- 本次仍只做本地实现，不上传。

### 主要修改

- 小猫组件新增 `chatAttachments` 和 `uploadingAttachment` 状态。
- 聊天输入框新增 `+` 按钮。
- 新增选择图片、选择聊天图片文件、上传云存储、移除附件等前端逻辑。
- `work/ai_chat` 控制器接收 `attachments` 参数。
- `WorkAiService.chat` 支持图片附件。
- 后端使用 `cloudUtil.getTempFileURLOne` 将 fileID 换成临时 URL。
- 多模态请求中将最后一条用户消息改为 `[{type:'text'}, {type:'image_url'}]`。
- AI 新增订单时，将附件 fileID 写入订单 `ORDER_ATTACHMENTS`。
- 同步版本号到 v1.52。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/controller/work_controller.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查相关 JS 文件，通过。
- `app.json` JSON 解析通过。
- 页面完整性检查通过。
- 本次涉及文件 `git diff --check` 通过。

### 部署状态

- 仅本地代码已修改。
- 未上传 `mcloud` 云函数。
- 未执行微信开发者工具上传。

## v1.51 - 2026-06-10 20:08:00 CST

### 改动级别

小改，v1.50 -> v1.51。

### 本次目标

修复 AI 智能体实际使用闭环：误添加后需要删除入口、AI 新增后当前页面需要自动刷新、询问“明天要干什么”时需要综合档期和小记一起整理。

### 和 AI 讨论后的需求结论

- 用户反馈 AI 添加错误后不能手动删除，应在再次点入时有删除入口。
- 用户反馈 AI 新增档期后页面没有自动更新，需要手动刷新才出现。
- 用户要求“我明天要干些什么”这类问题不只查档期，也要调用小记等信息后综合回答。
- 本次仍只做本地实现，不上传。

### 主要修改

- 订单编辑页底部新增“取消/删除订单”按钮，复用已有 `work/order_cancel` 能力。
- 日详情页事项卡片新增“删除”按钮。
- 后端新增 `WorkService.cancelItem`、`WorkController.cancelItem` 和 `work/item_cancel` 路由。
- 日详情页增加 `onShow` 自动刷新。
- 小猫组件收到 AI 写入动作 `create_order/create_item/add_note` 后，自动调用当前页面的 `_loadDay`、`_loadCalendar` 或 `_loadList`。
- AI `query_schedule` 查询结果合并对应日期的小记，回答中一起呈现订单、事项、休息和小记。
- 同步版本号到 v1.51。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `cloudfunctions/mcloud/project/B00/service/work_service.js`
- `cloudfunctions/mcloud/project/B00/controller/work_controller.js`
- `cloudfunctions/mcloud/project/B00/public/route.js`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.js`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.wxml`
- `miniprogram/projects/B00/pages/work/day_detail/work_day_detail.wxss`
- `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.wxml`
- `miniprogram/projects/B00/pages/work/order_edit/work_order_edit.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查相关 JS 文件，通过。
- `app.json` JSON 解析通过。
- `node` 已扫描 `app.json` 注册页面完整性，通过。
- 本次涉及文件 `git diff --check` 通过。

### 部署状态

- 仅本地代码已修改。
- 未上传 `mcloud` 云函数。
- 未执行微信开发者工具上传。

## v1.50 - 2026-06-10 19:55:00 CST

### 改动级别

小改，v1.49 -> v1.50。

### 本次目标

修复开发者工具中 AI 小助手询问“明天档期”“未来一周档期”时仍回复无法查看实时数据的问题，让 AI 真正具备按当前登录账号权限查询档期的能力。

### 和 AI 讨论后的需求结论

- 用户截图显示 AI 仍在回答“无法直接访问系统内实时订单数据”，说明只有新增写入动作还不够。
- 用户期望的是智能体能力，应同时能查能写。
- 本次继续遵守“不上传，就本地实现，我自己上传”，只改本地代码并验证。

### 主要修改

- AI 工具动作新增 `query_schedule`。
- 更新工具系统提示：用户询问今天、明天、未来一周或指定日期档期时，模型必须返回 `query_schedule` 动作。
- `query_schedule` 复用 `WorkService.getDayList` 查询真实订单档期、事项档期和休息记录。
- 查询结果按日期汇总，返回时间、类型、客户、地点、事项和休息摘要。
- 单次查询最多 14 天，避免过宽范围读取。
- 同步版本号到 v1.50。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `work_ai_service.js`、`work_admin_ai.js`、`setting.js`、`version.js`，通过。
- `app.json` JSON 解析通过。
- `node` 已扫描 `app.json` 注册的 86 个页面，均存在 `js/json/wxml/wxss` 文件。
- 本次涉及文件 `git diff --check` 通过。
- 未上传云函数、未写入云数据库、未外发真实 AI 请求。

### 部署状态

- 仅本地代码已修改。
- 未上传 `mcloud` 云函数。
- 未执行微信开发者工具上传。
- 未重新提交微信审核。
- 用户需要自行上传 `mcloud` 后再在开发者工具/真机中测试“查明天档期”“未来一周档期”和新增订单。

## v1.49 - 2026-06-10 19:38:00 CST

### 改动级别

小改，v1.48 -> v1.49。

### 本次目标

将 AI 小助手本地实现为受控执行型智能体：用户在聊天中明确要求新增档期、订单或小记时，AI 可以直接写入系统，并自动在全体小记中留下公开审查记录。

### 和 AI 讨论后的需求结论

- 用户确认不需要草稿确认流程，希望 AI 可以直接生成档期或订单。
- 用户要求每次使用这种能力后，在全体小记里自动添加简单操作明细，方便所有人看到和审查。
- 用户随后明确“不上传，就本地实现，我自己上传”，因此本次只做本地代码修改和验证，不执行云函数上传或小程序上传。
- 当前版本只开放新增订单档期、新增事项档期、新增小记，不开放删除、财务、工资、提成、审核、批量修改等高风险能力。

### 主要修改

- `WorkAiService.chat` 改为支持受控动作识别与执行。
- 新增 AI 工具系统提示，要求模型在写入意图明确时返回结构化 JSON 动作。
- 支持动作：`create_order`、`create_item`、`add_note`、`none`。
- 新增员工、拍摄类型上下文，AI 可根据员工姓名和拍摄类型名称生成更贴近业务的数据。
- 新增订单档期执行复用 `WorkService.saveOrder`。
- 新增事项档期执行复用 `WorkService.saveItem`。
- 新增小记执行复用 `WorkService.saveNote`。
- 每次写入成功后，自动调用 `saveNote` 新增 `team` 类型小记，标题为 `AI操作记录：...`，内容包含操作人、动作摘要和记录 ID。
- 同步版本号到 v1.49。

### 涉及文件

- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `work_ai_service.js`、`work_admin_ai.js`、`setting.js`、`version.js`，通过。
- `app.json` JSON 解析通过。
- `node` 已扫描 `app.json` 注册的 86 个页面，均存在 `js/json/wxml/wxss` 文件。
- 本次涉及文件 `git diff --check` 通过。
- 未上传云函数、未写入云数据库、未外发真实 AI 请求。

### 部署状态

- 仅本地代码已修改。
- 未上传 `mcloud` 云函数。
- 未执行微信开发者工具上传。
- 未重新提交微信审核。
- 后续需要用户自行上传云函数后，真机或开发者工具内测试 AI 新增订单/档期/小记。

## v1.48 - 2026-06-10 18:08:00 CST

### 改动级别

小改，v1.47 -> v1.48。

### 本次目标

修复管理中心“AI 小助手”获取模型后，前端不能识别服务商返回的模型列表，导致模型 picker 下拉为空或只能手动填写的问题。

### 和 AI 讨论后的需求结论

- 用户反馈“之前不能识别模型”，当前应优先跑通 AI 配置链路里的模型列表识别。
- 不执行云端部署、不写数据库、不外发真实 API 请求；本次只做本地代码兼容和静态验证。
- 需要同时保留手动填写模型 ID 的兜底，避免服务商不提供 `/models` 时阻断配置。
- 需要兼容云函数 helper 可能返回 `ret.data`，也可能已经解包为业务对象的情况。

### 主要修改

- 前端 `admin_ai` 页面新增 `_parseModelsResult`，统一兼容多层返回结构。
- 前端模型解析支持字符串模型数组、对象模型数组和多种常见字段名。
- 前端在模型列表为空时显示明确提示，不再误报“已获取模型”。
- 后端 `work_ai_service` 模型解析兼容嵌套 `model.id/model.name`，并避免将对象转换成 `[object Object]`。
- 同步版本号到 v1.48。

### 涉及文件

- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `work_admin_ai.js`、`work_ai_service.js`、`setting.js`、`version.js`，通过。
- `app.json` JSON 解析通过。
- `node` 已扫描 `app.json` 注册的 86 个页面，均存在 `js/json/wxml/wxss` 文件。
- 本次涉及文件 `git diff --check` 通过。
- 未上传云函数、未写入云数据库、未外发真实 AI 请求。
- 仍需在微信开发者工具内重新编译，并在“AI 小助手”页面填入或使用已保存 API Key 后点击“获取模型”目视确认。

### 部署状态

- 本地代码已修改。
- 尚未上传 `mcloud` 云函数。
- 尚未执行微信开发者工具上传。
- 尚未重新提交微信审核。

## v1.47 - 2026-06-10 17:43:02 CST

### 改动级别

小改，v1.46 -> v1.47。

### 本次目标

修复暖纸书页界面优化后，微信原生顶部导航栏和底部 tabBar 仍然显示白色的问题。

### 和 AI 讨论后的需求结论

- 用户在微信开发者工具截图中指出“顶部和底部还是白色的”。
- 检查确认页面主体已经应用暖纸色，但 `app.json` 的原生 `navigationBarBackgroundColor` 仍为 `#ffffff`，原生 tabBar 背景仍为 `#fefefe`。
- 本次应优先修正微信原生栏位配置，而不是继续叠加页面 WXSS。
- 本次不改业务逻辑、不改云函数、不改数据结构。

### 主要修改

- 全局 `window.backgroundColor` 改为暖纸色 `#f5efe4`。
- 全局 `navigationBarBackgroundColor` 改为暖纸色 `#f5efe4`。
- 原生 tabBar 背景改为暖纸色 `#f5efe4`。
- 原生 tabBar 未选中文字色改为低饱和墨色，选中色改为青蓝主色。
- 原生 tabBar 增加浅色边框配置，弱化底部白色断层。
- 将桌宠聊天组件中的 `text`、`input`、`button`、`[disabled]` 样式选择器改为显式 class，避免组件 WXSS 选择器警告。
- 同步版本号到 v1.47。

### 涉及文件

- `miniprogram/app.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.wxss`

### 验证结果

- `node --check` 已检查 `miniprogram/version.js`、`miniprogram/setting/setting.js`，通过。
- `app.json` JSON 解析通过。
- `node` 已扫描 `app.json` 注册的 86 个页面，均存在 `js/json/wxml/wxss` 文件。
- 本次涉及文件 `git diff --check` 通过。
- `work_pet.wxss` 已检查不再包含组件禁用的 tag/attribute 选择器。
- 全仓 `git diff --check` 仍受既有未关联文件 `miniprogram/projects/B00/biz/project_biz.js` 尾随空格影响，本次未改该文件。
- 当前沙箱无法通过微信开发者工具 CLI 清理编译缓存，CLI 报 `listen EPERM 127.0.0.1:3799`。
- 待在微信开发者工具中手动点击“编译”后目视确认顶部、底部与主体背景连续。

### 部署状态

- 本地代码已修改。
- 尚未执行微信开发者工具上传。
- 尚未重新提交微信审核。

## v1.46 - 2026-06-10 17:19:23 CST

### 改动级别

小改，v1.45 -> v1.46。

### 本次目标

优化小程序前端界面，使工作台观感更接近用户提供截图中的真实书页、暖纸、轻窗口风格。

### 和 AI 讨论后的需求结论

- 用户希望参考抖音中 OpenHanako 类似观感：真实书页、暖色纸面、轻量窗口、低对比内容区域。
- 用户说明该项目是开源的，可以去 GitHub 学习前端思路后应用到当前小程序。
- 本次只借鉴设计原则，不复制大段源码。
- 参考项目为 `https://github.com/liliMozi/openhanako`，重点查看 `warm-paper` 与 `new-warm-paper` 主题。
- 可迁移到微信小程序的视觉要点：暖纸背景、纸页卡片、细边框、低饱和墨色文字、青蓝主色、轻阴影、少用高饱和渐变。
- 当前改动限定为前端 WXSS，不改业务数据、云函数接口和页面逻辑。

### 主要修改

- 全局 `app.wxss` 增加暖纸背景、纸页卡片基础视觉。
- 档期页改为暖纸背景、纸页日历、青蓝选中态和低对比日期网格。
- 业绩页改为纸页英雄卡、青蓝强调线、暖纸指标卡和低饱和排行卡。
- 订单页改为纸页头图、暖纸筛选、纸页订单卡和青蓝按钮。
- 我的页改为纸页资料卡、暖纸宠物面板、青蓝操作按钮和墨色文字层级。
- 小记页改为暖纸分段、纸页笔记卡、青蓝悬浮新增按钮。
- 管理中心和 AI 小助手配置页统一为纸页卡片、细边框和青蓝主按钮。
- 桌宠聊天面板改为暖纸弹层、纸页 AI 气泡和青蓝用户气泡。
- 同步版本号到 v1.46。

### 涉及文件

- `miniprogram/app.wxss`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.wxss`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/projects/B00/pages/work/add/work_add.wxss`
- `miniprogram/projects/B00/pages/work/my/work_my.wxss`
- `miniprogram/projects/B00/pages/work/note/work_note.wxss`
- `miniprogram/projects/B00/pages/work/admin_home/work_admin_home.wxss`
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.wxss`
- `miniprogram/cmpts/work_pet/work_pet.wxss`
- `miniprogram/cmpts/tech_footer/tech_footer.wxss`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查本次相关小程序 JS、版本文件，通过。
- `node` 已检查 `project.config.json`、`app.json` 可解析，并扫描 `app.json` 注册的 86 个页面均存在 `js/json/wxml/wxss` 文件。
- `git diff --check` 已检查本次相关样式和版本文档，通过。
- 已检查本次样式和版本文档未写入 API Key 明文。
- 已通过微信开发者工具 CLI 清理 `compile` 编译缓存并重新打开当前项目。
- 仍需在微信开发者工具中编译并目视检查主要页面观感。

### 部署状态

- 本地代码已修改。
- 尚未执行微信开发者工具上传。
- 尚未重新提交微信审核。

## v1.45 - 2026-06-10 17:00:02 CST

### 改动级别

小改，v1.44 -> v1.45。

### 本次目标

修复微信开发者工具里点击“AI 小助手”后页面区域显示 `./projects/B00/pages/work/admin_ai/work_admin_ai.wxml not found` 的问题。

### 和 AI 讨论后的需求结论

- 用户反馈“AI小助手点进去是乱码”，截图显示实际异常为 `work_admin_ai.wxml not found`。
- 本地检查确认 `work_admin_ai.js/json/wxml/wxss` 四个页面文件存在。
- 本地检查确认 `app.json` 已注册 `projects/B00/pages/work/admin_ai/work_admin_ai`。
- 本地检查确认 `project.config.json` 的小程序根目录为 `miniprogram/`，页面路径相对关系正确。
- 判断该问题更可能是开发者工具没有刷新到新建页面文件，或当前编译场景仍指向旧缓存。
- 修复策略：在项目配置里增加 AI 小助手配置页的显式编译场景，便于开发者工具直接重新编译该页面。

### 主要修改

- `project.config.json` 新增“AI小助手配置”编译场景。
- 同步版本号到 v1.45。

### 涉及文件

- `project.config.json`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js`、`miniprogram/app.js`、`miniprogram/helper/share_helper.js`，通过。
- `node` 已检查 `app.json`、`work_admin_ai.json`、`project.config.json`、`version.js` 可解析，通过。
- `node` 已扫描 `app.json` 注册的 86 个页面，均存在 `js/json/wxml/wxss` 文件。
- 已通过微信开发者工具 CLI 清理 `compile` 编译缓存并重新打开当前项目。
- 仍需在微信开发者工具界面点击“AI 小助手”目视确认 `work_admin_ai.wxml not found` 不再出现。

### 部署状态

- 本地代码已修改。
- 尚未执行微信开发者工具上传。
- 尚未重新提交微信审核。

## v1.44 - 2026-06-10 16:44:32 CST

### 改动级别

小改，v1.43 -> v1.44。

### 本次目标

修复微信开发者工具无法编译的问题。控制台报错 `module 'helper/share_helper.js' is not defined, require args is './helper/share_helper.js'`，导致 `app.js` 初始化失败，首页 `projects/B00/pages/work/calendar/work_calendar` 未注册。

### 和 AI 讨论后的需求结论

- 用户反馈“现在编译不了”，并提供微信开发者工具控制台截图。
- 错误根因定位为：`app.js` 启动阶段依赖 `./helper/share_helper.js`，开发者工具运行时没有正确识别该模块，导致整个 App 初始化中断。
- 修复策略：不再让 App 启动依赖该外部 helper，把分享默认逻辑内联到 `app.js`，降低启动期依赖风险。
- 该改动不改变业务数据、不涉及云函数、不需要保存任何敏感信息。

### 主要修改

- 移除 `app.js` 顶部 `require('./helper/share_helper.js')`。
- 在 `app.js` 内新增默认分享标题、路径、分享图和朋友圈 query 的规范化函数。
- 保留全局 `Page` 分享补丁能力，页面仍可继承默认分享配置。
- 同步版本号到 v1.44。

### 涉及文件

- `miniprogram/app.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`

### 验证结果

- `node --check` 已检查 `miniprogram/app.js`、`miniprogram/setting/setting.js`、`miniprogram/version.js`，通过。
- `git diff --check` 已检查本次相关改动，通过。
- 仍需在微信开发者工具内点击“编译/刷新”确认控制台不再出现 `share_helper.js is not defined`。

### 部署状态

- 本地代码已修改。
- 尚未执行微信开发者工具上传。
- 尚未重新提交微信审核。

## v1.43 - 2026-06-10 16:32:15 CST

### 改动级别

小改，v1.42 -> v1.43。

### 本次目标

修复微信小程序 1.3 提审失败中的“体验受限/登录受限”问题。审核员没有绑定员工账号时，也能进入小程序查看核心功能结构，但不能读取或修改真实登录后的数据。

### 和 AI 讨论后的需求结论

- 微信审核失败原因是：小程序流程涉及账号登录或环境配置要求，审核员暂无法完整体验功能。
- 用户确认可以在登录/绑定页面新增“访客进入”。
- 访客进入后可以体验主要功能，但不能看到登录后的真实数据。
- 访客模式应使用本地演示数据，不调用真实员工、订单、工资、客户等云端数据接口。
- 访客模式下的新增、编辑、真实详情、真实 AI 对话等动作应被拦截，并提示绑定员工后使用。
- 重新提审时需要在审核备注里说明访客入口路径。

### 主要修改

- 新增访客模式状态：通过本地缓存 `WORK_GUEST_MODE` 标记是否处于访客体验。
- 新增本地演示数据：档期、订单、业绩排行、小记均由本地 helper 生成。
- “我的”页新增“访客进入，先体验功能”按钮，并支持退出访客模式。
- 档期页支持访客演示档期，不再因未绑定员工直接卡住。
- 业绩页支持匿名演示排行，不展示真实金额和真实业绩。
- 订单页支持演示订单列表，新增和编辑入口在访客模式下被拦截。
- 小记页支持演示团队/个人小记，真实内容和编辑入口在访客模式下被拦截。
- 猫咪 AI 在访客模式下只返回本地说明，不调用真实 AI 接口。
- 项目版本信息同步到 v1.43。
- 新增版本动态机制：后续本地代码修改默认同步版本号、`CHANGELOG.md` 和本文档。
- 本机 Codex 工作规则已加入版本动态要求，避免以后只改代码不写版本记录。

### 涉及文件

- `README.md`
- `CHANGELOG.md`
- `docs/version-change-diary.md`
- `miniprogram/helper/guest_helper.js`
- `miniprogram/setting/setting.js`
- `miniprogram/version.js`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.js`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.wxml`
- `miniprogram/projects/B00/pages/work/calendar/work_calendar.wxss`
- `miniprogram/projects/B00/pages/work/my/work_my.js`
- `miniprogram/projects/B00/pages/work/my/work_my.wxml`
- `miniprogram/projects/B00/pages/work/my/work_my.wxss`
- `miniprogram/projects/B00/pages/work/performance/work_performance.js`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxml`
- `miniprogram/projects/B00/pages/work/performance/work_performance.wxss`
- `miniprogram/projects/B00/pages/work/add/work_add.js`
- `miniprogram/projects/B00/pages/work/add/work_add.wxml`
- `miniprogram/projects/B00/pages/work/add/work_add.wxss`
- `miniprogram/projects/B00/pages/work/note/work_note.js`
- `miniprogram/projects/B00/pages/work/note/work_note.wxml`
- `miniprogram/projects/B00/pages/work/note/work_note.wxss`
- `miniprogram/cmpts/work_pet/work_pet.js`
- `/Users/Admin/Documents/Codex/AGENTS.md`
- `/Users/Admin/.codex/private-evolution/index.md`

### 验证结果

- `node --check` 已检查新增和修改的 JS 文件，通过。
- `git diff --check` 已检查本次相关改动，通过。

### 提审备注建议

```text
如审核员未绑定员工账号，可进入底部“我的”页面，点击“访客进入，先体验功能”。访客模式仅展示演示数据，不读取真实员工、订单、工资、客户资料，也不能提交新增或编辑。
```

### 部署状态

- 本地代码已修改。
- 尚未执行微信开发者工具上传。
- 尚未重新提交微信审核。

## v1.42 - 2026-06-10

### 版本基线说明

用户确认当前项目版本为 v1.42。本次开始执行版本动态规则，后续每次代码修改都需要同步版本号和修改日记。

### 已讨论但不写入敏感原文的事项

- 用户曾要求配置 AI API 默认接口。代码已支持默认 APIHub Base URL，但密钥不写入代码、文档或本地规则。
- 用户要求小程序支持分享能力，已在前序工作中增加默认分享处理。
- 用户要求宠物猫贴近底部导航、优化外观和拖拽交互，已在前序工作中迭代相关组件。
