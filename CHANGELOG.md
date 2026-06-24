# Changelog

## v2.00 - 2026-06-24

MiMo 极简参数兜底修复版本。本次按小改修复 `+0.01` 从 v1.99 升级为 v2.00，继续处理小猫测试对话返回 `Param Incorrect` 的问题：当 MiMo 拒绝完整 Agent 请求和普通最小重试时，最终兜底请求只保留 `model` 与 `messages` 两个必需字段。

### 修复

- MiMo 文本兜底请求移除 `stream:false`，避免兼容接口对非必需字段过度敏感。
- 继续保留模型 ID 规范化，MiMo 地址下会把常见错误写法回落到 `mimo-v2.5`。
- 错误解析兼容 `message`、`msg` 和字符串型 `error`，方便识别第三方接口返回的参数错误。
- 重新生成 `work_ai_service_live_patch.js`，确保云端 `mcloud` 优先加载新版 AI 服务。

### 安全

- 本次不记录、不提交、不展示任何 API Key 明文。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json` 与 `project.config.json` JSON 解析通过。
- `work_ai_service_live_patch.js` 解压后与当前 `work_ai_service.js` 一致，MiMo 兜底块确认不再包含 `stream` 字段。
- 本轮涉及文件 `git diff --check` 通过，仅有既有 LF/CRLF 提示。
- 敏感信息扫描未发现用户 API Key 片段。

### 部署

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `47.2 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `2.00`，包体 `1.5 MB` / `1,601,017 Byte`。
- 本次未提交审核、未发布上线。

## v1.99 - 2026-06-24

AI确认队列生命周期审计版本。本次按小改修复 `+0.01` 从 v1.98 升级为 v1.99，让小猫高风险确认队列从“能确认执行”进一步补齐为“每一步都能被 AI 审计流水复盘”。

### 新增

- `WorkAgentConfirmService` 在创建待确认记录时同步写入 `agent_confirm_pending` 审计流水。
- 管理员确认执行、驳回或执行失败时，分别写入 `agent_confirm_approved`、`agent_confirm_rejected`、`agent_confirm_failed` 生命周期审计。
- 生命周期审计保存确认记录 ID、原动作、发起人、处理人、关联对象和脱敏参数摘要，方便后续追查高风险动作从发起到处理的全过程。
- AI 审计流水列表和详情页新增确认生命周期动作筛选项。

### 安全

- 生命周期审计统一标记为高风险记录，但只保存脱敏参数摘要，不记录 API Key、Token、openid 明文展示或完整敏感业务数据。
- 确认队列的生命周期审计失败只记录后端错误，不阻塞原确认队列业务流程。

### 验证

- `node --check` 覆盖确认服务、审计服务、审计列表页、审计详情页、版本源、设置文件和两个 live patch，均通过。
- `miniprogram/app.json`、审计列表/详情页 JSON 与 `project.config.json` JSON 解析通过。
- `work_ai_service_live_patch.js` 解压后确认服务等本轮依赖与当前源文件一致，`work_ai_service.js` 使用已提交 HEAD 版本以隔离无关未提交改动；`work_admin_controller_live_patch.js` 解压后与当前源文件一致。
- live patch 实际加载检查通过；仅出现项目既有 `ws` 依赖提示，不影响本轮 patch 注入。
- 本轮涉及文件 `git diff --check` 通过，仅有既有 LF/CRLF 提示。
- 敏感信息扫描未发现新增 API Key、Token 或 Secret。

### 部署

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `47.1 KB`。
- `work_admin_controller_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `12.2 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.99`，包体 `1.5 MB` / `1,600,436 Byte`。
- 本次未提交审核、未发布上线。

## v1.98 - 2026-06-24

小猫 AI 供应商配置页版本。本次按小改修复 `+0.01` 从 v1.97 升级为 v1.98，把后台 AI 配置页改成更接近 CC Switch 的供应商卡片和编辑面板，方便管理员自由切换 DeepSeek、MiMo、自定义兼容接口，以及单独配置文本模型和视觉模型。

### 优化

- 供应商配置区改为卡片列表，展示当前默认、接口地址、模型 ID 和 Key 保存状态。
- 新增“新增 / 编辑供应商”面板，可填写供应商名称、备注、官网、API 请求地址、API Key、文本模型 ID、视觉模型 ID 和视觉接口地址。
- API Key 支持在编辑面板内直接粘贴、显示/隐藏、清空输入，并保留清空当前已保存主 Key 的开关。
- 保存配置成功后立即刷新供应商卡片状态，减少“保存了但界面还像没变”的误判。

### 安全

- API Key 仍只通过云函数配置保存流程提交，不写入源码、日志或版本记录。
- 供应商卡片只展示脱敏 Key 状态，不展示明文 Key。

### 验证

- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json` 与 `project.config.json` JSON 解析通过。
- AI 配置页 WXML `view` 与 `button` 标签数量 sanity check 通过。
- 本轮涉及文件 `git diff --check` 通过，仅有既有 LF/CRLF 提示。
- 敏感信息扫描未发现用户 API Key 片段。

### 部署

- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.98`，包体 `1.5 MB` / `1,599,214 Byte`。
- 本次未提交审核、未发布上线。

## v1.97 - 2026-06-24

小猫高风险确认队列版本。本次按小改修复 `+0.01` 从 v1.96 升级为 v1.97，让小猫识别到收款、取消订单、作废收款、发工资和审核订单等高风险动作时，先生成管理员确认申请，确认后才真实执行。

### 新增

- 新增 `work_agent_confirm_model.js` 与 `work_agent_confirm_service.js`，保存确认动作、发起人、脱敏参数、关联对象、状态、处理人和执行结果。
- 管理中心新增“AI确认队列”入口和 `admin_agent_confirm` 页面，支持按动作、状态、关键词筛选确认申请。
- 新增 `work/admin_agent_confirm_list`、`work/admin_agent_confirm_approve`、`work/admin_agent_confirm_reject` 路由。

### 安全

- 小猫 Agent 对 `cancel_order`、`save_payment`、`void_payment`、`pay_payroll`、`audit_order` 不再直接执行，先进入确认队列。
- 管理员确认时使用当前管理员 openId 和员工身份执行，原 AI 对话人只作为申请发起人留痕。
- 确认队列前端展示脱敏参数摘要，不展示 openid、密钥、Token 或完整敏感字段。

### 验证

- `node --check` 覆盖新增确认模型、确认服务、AI 服务、管理端控制器、路由、确认队列页面 JS、版本源、设置文件和三个 live patch，均通过。
- `miniprogram/app.json`、确认队列页面 JSON 和 `project.config.json` JSON 解析通过，确认队列页面已注册。
- 确认队列页面 WXML view 标签数量 sanity check 通过，未发现异常 `/view>` 闭合。
- live patch 解压后与 `work_ai_service.js`、`work_agent_confirm_model.js`、`work_agent_confirm_service.js`、`work_admin_controller.js`、`route.js` 等源文件一致。
- live patch 实际加载检查通过；仅出现项目既有 `ws` 依赖提示，不影响本次 patch 注入。
- 本轮涉及文件 `git diff --check` 通过，仅有既有 LF/CRLF 提示。
- 敏感信息扫描未发现新增 API Key、Token 或 Secret；字段校验里的 `apiKey: string|max` 属于误报，已排除。

### 部署

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `46.2 KB`。
- `work_admin_controller_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `11.1 KB`。
- `work_route_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `2.8 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.97`，包体 `1.5 MB` / `1,598,534 Byte`。
- 本次未提交审核、未发布上线。

## v1.96 - 2026-06-24

MiMo参数错误兜底修复版本。本次按小改修复 `+0.01` 从 v1.95 升级为 v1.96，针对小米 MiMo 在小猫测试对话里仍返回 `Param Incorrect` 的问题，后端增加模型 ID 规范化和 MiMo 纯文本兜底请求。

### 修复

- 云函数识别小米 MiMo API 时，会把 `mimov2.5` 等常见错误写法自动规范为 `mimo-v2.5`。
- 如果旧配置在 MiMo 地址下仍保存了 `gpt-4o-mini`、`deepseek-chat` 等非 MiMo 模型，后端会回落到 `mimo-v2.5`。
- MiMo 在完整 Agent 提示词请求下返回 `Param Incorrect` 时，会自动再试一次单轮纯文本请求，优先保证测试对话和普通问答可用。
- 继续保留管理员自由修改 Base URL、文本模型、视觉模型和 Key 的能力。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json` 与 `project.config.json` JSON 解析通过。
- `work_ai_service_live_patch.js` 解压后与 `work_ai_service.js`、`work_ai_agent_registry.js`、`work_ai_agent_memory.js`、`work_agent_audit_model.js` 源码一致。
- live patch 实际加载检查通过；仅出现项目既有 `ws` 依赖提示，不影响本次 patch 注入。
- 本轮涉及文件 `git diff --check` 通过，仅有既有 LF/CRLF 提示。
- 敏感信息扫描未发现新增 API Key、Token 或 Secret。

### 部署

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `41.9 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.96`，包体 `1.5 MB` / `1,569,589 Byte`。
- 本次未提交审核、未发布上线。

## v1.95 - 2026-06-24

AI审计结构化摘要版本。本次按小改修复 `+0.01` 从 v1.94 升级为 v1.95，让新生成的 AI 审计流水除可读文本外，也保存脱敏结构化动作摘要，为后续自动复盘和高风险确认队列打底。

### 新增

- `work_agent_audit_model.js` 新增 `AGENTAUDIT_ACTION_SUMMARY` 对象字段。
- `work_ai_service.js` 在写入 Agent 审计流水时自动生成结构化摘要，包含动作、风险等级、复查建议、关联对象、内容预览、风险标签和关键信号。
- `work_agent_audit_service.js` 详情接口返回结构化摘要；历史流水没有摘要时，会基于现有内容生成兼容摘要。
- AI 审计详情页新增“结构化摘要”区块，展示复查建议、安全决策、关联对象、内容预览、信号和标签。

### 安全

- 结构化摘要只保存脱敏预览和有限信号，不保存 API Key、Token、openid、原始模型全文或完整图片内容。

### 验证

- `node --check` 覆盖本轮触达的审计模型、AI 服务、审计服务、live patch、审计详情页 JS、版本源和设置文件，均通过。
- `miniprogram/app.json`、审计详情页 JSON 和 `project.config.json` JSON 解析通过，版本源确认当前为 `1.95`。
- AI 审计详情页 WXML view 标签数量 sanity check 通过，未发现异常 `/view>` 闭合。
- `work_ai_service_live_patch.js` 与 `work_admin_controller_live_patch.js` 解压后与源文件一致，实际加载检查通过。
- 本轮涉及文件 `git diff --check` 通过，仅有既有 LF/CRLF 提示。
- 敏感信息扫描未发现新增 API Key、Token 或 Secret。

### 部署

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `41.2 KB`。
- `work_admin_controller_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `7.1 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.95`，包体 `1.5 MB` / `1,568,838 Byte`。
- 本次未提交审核、未发布上线。

## v1.94 - 2026-06-24

AI审计详情页版本。本次按小改修复 `+0.01` 从 v1.93 升级为 v1.94，让管理员可以从 AI 审计流水列表点开单条记录，查看完整审计内容、关联对象和安全复盘摘要。

### 新增

- `work_agent_audit_service.js` 新增 `getAuditDetail`，按审计记录 ID 返回单条有效记录。
- `work_admin_controller.js` 新增 `getAgentAuditDetail`，继续要求小程序管理员权限。
- `route.js` 新增 `work/admin_agent_audit_detail` 只读路由。
- 新增 `admin_agent_audit_detail` 页面，支持从列表卡片进入详情、下拉刷新、查看基础信息、完整审计内容和安全复盘。

### 修复

- 修正 AI 审计流水统计区域异常闭合标签，减少小程序编译和渲染风险。

### 验证

- `node --check` 覆盖本轮触达的云端服务、控制器、路由、live patch、审计页面 JS、版本源和设置文件，均通过。
- `miniprogram/app.json`、审计列表/详情页 JSON 和 `project.config.json` JSON 解析通过，AI 审计详情页已注册。
- AI 审计列表页和详情页 WXML view 标签数量 sanity check 通过，未发现异常 `/view>` 闭合。
- `work_admin_controller_live_patch.js` 与 `work_route_live_patch.js` 解压后与源文件一致，实际加载检查通过。
- 本轮涉及文件 `git diff --check` 通过，仅有既有 LF/CRLF 提示。
- 敏感信息扫描未发现新增 API Key、Token 或 Secret。

### 部署

- `work_admin_controller_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `6.5 KB`。
- `work_route_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `2.8 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.94`，包体 `1.5 MB` / `1,566,038 Byte`。
- 本次未提交审核、未发布上线。


## v1.93 - 2026-06-24

AI审计统计摘要版本。本次按小改修复 `+0.01` 从 v1.92 升级为 v1.93，让 AI 审计流水页从“只能翻列表”升级为“先看统计再追记录”，方便管理员快速发现高风险、财务相关和高频使用动作。

### 新增

- `work_agent_audit_service.js` 随审计列表返回 `stats` 摘要，统计当前筛选条件下的总数、高风险、财务相关和普通记录。
- 审计统计基于最近 `500` 条匹配记录生成动作 Top 和员工 Top，避免一次性扫描过多历史数据。
- AI 审计流水页新增统计面板，展示筛选总数、高风险、财务相关、普通、最近操作、最多动作和最多员工。
- 统计面板只读展示，不修改订单、收款、工资或审计流水。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js` 通过。
- `node --check cloudfunctions/mcloud/work_admin_controller_live_patch.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `work_admin_controller_live_patch.js` 解压后与 `work_agent_audit_service.js`、`work_agent_audit_model.js`、`work_admin_controller.js` 源码一致。
- `work_admin_agent_audit.json`、`miniprogram/app.json` 和 `project.config.json` JSON 解析通过。
- 本轮涉及文件 `git diff --check` 通过；全仓检查仍受既有无关脏文件 trailing whitespace 影响。
- 敏感信息扫描未发现新增 API Key、Token 或 Secret。

### 部署

- `work_admin_controller_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `5.6 KB`；首次部署命令超时无结果，重试成功。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.93`，包体 `1.5 MB` / `1,558,739 Byte`。
- 本次未提交审核、未发布上线。


## v1.92 - 2026-06-24

小猫Agent能力目录后端闭环版本。本次按小改修复 `+0.01` 从 v1.91 升级为 v1.92，把 AI 配置页已有的“Agent 能力边界”展示接到后端技能注册表，让管理员看到的技能、动作、写入数量和高风险数量来自真实注册表，而不是前端空壳。

### 新增

- `work_ai_agent_registry.js` 新增脱敏能力目录导出，按技能、动作、写入动作和高风险动作生成只读摘要。
- `work_ai_service.js` 在管理员 AI 配置接口返回 `agentCatalog`，不包含触发正则、内部提示词、Key 或会话内容。
- AI 配置页默认数据结构补齐 `agentCatalog`，避免旧接口或弱网情况下能力目录为空时报错。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json`、`work_admin_ai.json` 和 `project.config.json` JSON 解析通过。
- Agent 能力目录导出检查通过：当前展示 `10` 个技能、`17` 个动作、`12` 个写入动作和 `5` 个高风险动作。
- `work_ai_service_live_patch.js` 解压后与 `work_ai_service.js`、`work_ai_agent_registry.js`、`work_ai_agent_memory.js`、`work_agent_audit_model.js` 源码一致。
- 本轮涉及文件 `git diff --check` 通过；全仓库检查仍受既有无关脏文件 trailing whitespace 影响。
- 敏感信息扫描未发现新增 API Key、Token 或 Secret。

### 部署

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `40.3 KB`；首次部署遇到一次 `ECONNRESET`，重试成功。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.92`，包体 `1.5 MB` / `1,555,760 Byte`。
- 本次未提交审核、未发布上线。


## v1.91 - 2026-06-24

AI配置体验与Agent能力目录版本。本次按小改修复 `+0.01` 从 v1.90 升级为 v1.91，重点处理小猫助手配置页在手机端被浮动小猫遮挡、字段标签挤压和 Key 操作按钮不够规整的问题，并补齐管理员可见的小猫 Agent 技能/动作边界；Mimo 默认接口和模型继续保留，且仍可自由修改。

### 修复

- AI 配置页移除浮动小猫组件，避免遮挡保存、测试、模型选择和 Key 粘贴区域。
- 标签统一为块级显示，减少“模型 / API Key”等短标签在窄屏下挤成竖排。
- Key 操作按钮保持三等分整行布局，粘贴、显示、清空入口更容易点中。
- AI 配置页新增“Agent 能力边界”区块，展示小猫内置技能、受控动作、写入动作和高风险动作数量。
- 后端从 `work_ai_agent_registry.js` 导出脱敏能力目录，只展示标题、动作和风险标签，不暴露触发规则、内部提示词或密钥。
- 继续保留 v1.90 的 Mimo 默认：`https://api.xiaomimimo.com/v1` + `mimo-v2.5`，管理员仍可改成 DeepSeek、其他 Base URL 或视觉模型。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json`、`work_admin_ai.json` 和 `project.config.json` JSON 解析通过。
- Agent 能力目录导出检查通过：当前展示 `10` 个技能、`17` 个动作、`12` 个写入动作和 `5` 个高风险动作。
- `work_ai_service_live_patch.js` 解压后与 `work_ai_service.js`、`work_ai_agent_registry.js`、`work_ai_agent_memory.js`、`work_agent_audit_model.js` 源码一致。
- 本轮涉及文件 `git diff --check` 通过；全仓库检查仍受既有无关脏文件 trailing whitespace 影响。
- 敏感信息扫描未发现新增 API Key、Token 或 Secret。

### 部署

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `40.3 KB`；首次部署遇到一次 `ECONNRESET`，重试成功。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.91`，包体 `1.5 MB` / `1,555,366 Byte`。
- 本次未提交审核、未发布上线。


## v1.90 - 2026-06-24

Mimo默认模型配置版本。本次按小改修复 `+0.01` 从 v1.89 升级为 v1.90，将小猫助手默认服务商切换到小米 MiMo OpenAI 兼容接口，默认模型使用 `mimo-v2.5`。默认值只作为新配置和快捷预设，不限制管理员继续修改 Base URL、模型或 Key。

### 修复

- AI 配置页默认服务商改为 `Mimo`，默认 Base URL 改为小米 MiMo OpenAI 兼容地址。
- `Mimo` 预设从空白自定义项改为快捷填充 `mimo-v2.5`，点击后仍可手动修改。
- 云函数默认 AI 配置同步切换为 `Mimo + mimo-v2.5`，新环境或空配置时优先使用该组合。
- 本地已用用户提供的 Key 验证 `mimo-v2.5` 文本接口返回 200 和中文回复；Key 未写入源码、日志或提交。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 通过。
- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json` 与 `project.config.json` JSON 解析通过。
- `work_ai_service_live_patch.js` 解压后与 `work_ai_service.js`、Agent 注册表、轻量记忆和审计模型源码一致。
- 敏感信息扫描通过，用户提供的 Key 未写入仓库文件。
- 本地直连小米 MiMo 接口验证 `mimo-v2.5` 返回 200 和中文回复。
- live patch 加载检查通过；仅出现项目既有 `ws` 依赖提示，不影响本次 patch 注入。
- `git diff --check` 通过，仅有 Windows 换行提示。

### 部署

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `40.1 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.90`，包体 `1.5 MB` / `1,550,460 Byte`。
- 本次未提交审核、未发布上线。

## v1.89 - 2026-06-24

小猫 Agent 管理员长期记忆版本。本次按小改修复 `+0.01` 从 v1.88 升级为 v1.89，重点补齐 Hanako 迁移方案里的“记忆层”：先做管理员手动维护、可开关、不会自动污染生产数据的长期记忆片段。

### 新增

- AI 配置页新增“长期记忆”开关和记忆文本，管理员可维护店内稳定规则、报价口径、团队默认习惯和客户跟进原则。
- `work_ai_service.js` 保存 `memoryEnabled` 与 `memoryText`，并在构建小猫提示词时按开关注入管理员维护的长期记忆。
- 长期记忆注入时追加安全边界：只作为回答和追问参考，不等于数据库事实；订单、金额、收款、工资、审核仍以后台校验为准。
- 小猫 Agent 信息弹层更新为 `0.4.0 管理员长期记忆`。

### 验证

- 已随 v1.90 本地校验一并通过：后端 AI 服务、AI 配置页、小猫组件、版本源、设置文件、JSON 配置和 live patch 一致性均通过。

### 部署

- 已随 v1.90 开发版和 `work_ai_service_live_patch.js` 增量部署一并上传；未单独上传 v1.89 开发版。

## v1.88 - 2026-06-24

小猫 Agent 审计流水后台版本。本次按小改修复 `+0.01` 从 v1.87 升级为 v1.88，重点补齐 v1.86 已写入的 Agent 审计记录在管理中心可查看、可筛选、可追溯的闭环。

### 新增

- 管理中心新增“AI 审计流水”入口，管理员可查看小猫执行过的写入动作、风险等级、操作者、关联业务和审查内容。
- 新增 `work_agent_audit_service.js`，封装审计流水分页查询、筛选和字段清洗，避免前端直接接触模型细节。
- 新增 `work/admin_agent_audit_list` 云函数路由，支持按动作、风险等级、员工和关键词筛选。
- 新增 `admin_agent_audit` 小程序页面，支持关键词搜索、动作/风险筛选、下拉刷新和分页加载。
- 新增 `work_route_live_patch.js` 并在 `mcloud/index.js` 中预加载，用于完整部署遇到 `EISDIR` 时仍能注入最新路由。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_agent_audit_service.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/controller/work_admin_controller.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/public/route.js` 通过。
- `node --check cloudfunctions/mcloud/index.js` 通过。
- `node --check cloudfunctions/mcloud/work_admin_controller_live_patch.js` 通过。
- `node --check cloudfunctions/mcloud/work_route_live_patch.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/admin_agent_audit/work_admin_agent_audit.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json`、`admin_agent_audit.json` 与 `project.config.json` JSON 解析通过。
- live patch 加载检查通过；仅出现项目既有 `ws` 依赖提示，不影响本次 patch 注入。
- `git diff --check` 通过，仅有 Windows 换行提示。

### 部署

- `mcloud/index.js` 已通过增量部署上传，包体 `370 B`。
- `mcloud/work_admin_controller_live_patch.js` 已通过增量部署上传，包体 `5.1 KB`。
- `mcloud/work_route_live_patch.js` 已通过增量部署上传，包体 `2.8 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.88`，包体 `1.5 MB` / `1,547,955 Byte`。
- 本次未提交审核、未发布上线；完整 `mcloud` 部署仍沿用增量 live patch 方案避开已知 `EISDIR` 问题。

## v1.87 - 2026-06-24

AI配置粘贴与接口兼容修复版本。本次按体验修复 `+0.01` 从 v1.86 升级为 v1.87，重点处理手机端 API Key 不好粘贴、配置页按钮/输入框不够规整，以及部分 OpenAI 兼容接口返回 `Param Incorrect` 后无法继续测试的问题。

### 修复

- AI 配置页主 API Key 和视觉 API Key 新增 `粘贴 / 显示 / 清空` 操作；粘贴直接读取剪贴板，并自动清理换行和空格。
- Key 输入框改为整行宽度，操作按钮固定三等分排列，减少手机端标签、输入框和按钮互相挤压造成的误触。
- AI 请求遇到 `Param Incorrect` 或 400/422 参数兼容错误时，自动用最小 Chat Completions 参数重试一次，兼容部分聚合接口不支持 `temperature`、`max_tokens` 等参数的情况。
- 接口参数错误提示改为指向 Base URL、模型 ID 和视觉模型兼容性，避免只显示一行不明确的 `Param Incorrect`。

### 验证

- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json` 与 `project.config.json` JSON 解析通过。
- `work_ai_service_live_patch.js` 解压后与 `work_ai_service.js`、Agent 注册表、轻量记忆和审计模型源码一致。
- `git diff --check` 通过，仅有 Windows 换行提示。

### 部署

- `work_ai_service_live_patch.js` 已通过微信开发者工具 CLI 增量部署到 `mcloud`，包体 `39.8 KB`。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.87`，包体 `1.5 MB` / `1,547,783 Byte`。

## v1.86 - 2026-06-24

小猫 Agent Hana 架构底座升级版本。参考桌面方案里的 HanaAgent 分层思路，先落地小程序可承受的后端 Agent 基础：技能注册、动作白名单、轻量会话记忆、审计流水和自由模型配置修复。本次按功能升级 `+0.10` 从 v1.76 升级为 v1.86。

### 新增

- 新增 `work_ai_agent_registry.js`：把档期查询、订单录入、图片录单、改期纠错、财务、工资审核、小记事项等拆成内置技能，并为每个技能声明允许动作。
- 新增 `work_ai_agent_memory.js`：把当前员工、页面上下文和本轮客户跟进线索压缩进提示词；暂不自动写长期记忆库，避免污染生产数据。
- 新增 `work_agent_audit_model.js`：AI 写入动作除团队小记外，额外尝试写 Agent 审计流水，便于后续管理端审查。

### 修复

- `work_ai_service.js` 改为按本轮技能生成工具提示词和动作白名单；模型返回越界动作时不会执行，也不会把未执行结果展示成“已完成”。
- AI 配置页拆出 `Mimo` 和 `自定义` 预设；选择自定义类预设会清空旧 Base URL、文本模型和视觉模型，避免仍停留在 Agnes 默认值。
- 小猫 Agent 版本弹层更新为 `0.3.0 HanaAgent 架构底座`。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_registry.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_agent_memory.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/model/work_agent_audit_model.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 通过。
- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- `node --check miniprogram/version.js` 与 `node --check miniprogram/setting/setting.js` 通过。
- `miniprogram/app.json` 与 `project.config.json` JSON 解析通过。
- 技能白名单样例通过：档期查询只开放 `query_schedule`，收款查询只开放 `query_payments`，改期只开放 `update_order/cancel_order/query_schedule`，工资写入开放工资/审核相关动作。
- `git diff --check` 通过，仅有 Windows 换行提示。

### 部署

- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.86`，包体 `1.5 MB` / `1,533,406 Byte`。
- `mcloud` 云函数入口 `index.js`、`work_admin_controller_live_patch.js` 和内联版 `work_ai_service_live_patch.js` 已通过增量部署上传。
- 完整 `mcloud` 部署仍遇到微信开发者工具已知 `EISDIR` 问题；本次通过内联 live patch 把新增 Agent 依赖一并注入云端运行时。

## v1.76 - 2026-06-24

AI配置自由模型与视觉模型修复版本。管理中心 AI 小助手配置页支持服务商预设、任意兼容 Base URL、文本模型与图片识别模型分开配置，并重排手机端表单，解决模型不可自由更换、获取模型按钮依赖过强和移动端 UI 挤压问题。本次按小改 `+0.01` 升级为 v1.76。

### 修复

- AI 配置页新增 Agnes、DeepSeek、OpenAI、Mimo/自定义预设；选择预设只快捷填充，服务名、Base URL 和模型 ID 仍可手动修改。
- 文本模型和图片识别模型分开保存：普通文字聊天走文本模型，带图片时优先调用视觉模型。
- 视觉接口地址和视觉 API Key 改为可选项，留空时沿用主接口和主 Key，兼容同一 APIHub 或单独视觉服务。
- 获取模型列表不再卡住配置流程；平台不开放 `/models` 时，仍可直接手动填写 DeepSeek、Mimo 或任意兼容模型 ID。
- 手机端表单改为分组单列布局，修复服务名、模型、API Key、按钮和说明文字在窄屏互相挤压导致点击不明显的问题。

### 验证

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

### 部署

- `mcloud` 已增量部署 `work_ai_service_live_patch.js`、`work_admin_controller_live_patch.js` 和 `index.js`。
- 完整 `mcloud` 部署仍遇到微信开发者工具已知 `EISDIR` 问题，本次通过 live patch 让云端加载最新服务与控制器逻辑。
- 小程序开发版已通过微信开发者工具 CLI 上传，版本号 `1.76`，包体 `1.5 MB` / `1,532,105 Byte`。

## v1.75 - 2026-06-24

小猫识图改期与超时兜底修复版本。修复每日详情页截图识别时备注日期覆盖订单档期日期、漏图追补、改期二次确认和 AI 超时兜底问题。本次按小改 `+0.01` 升级为 v1.75。

### 修复

- 截图识别订单时，页面顶部的每日详情日期优先作为订单档期日期；卡片备注里的“9.16摄影”等文字只当备注，冲突时先追问用户确认。
- 多张相似截图按图片独立识别，支持用户说“第4张漏了”后只重送历史消息里的指定图片，避免重复识别整批图片。
- 改期二次确认支持关键词和数字选择，例如“爱公馆9.16那个改为9.11”后回复“1”，进入真实保存流程。
- “无补充”等确认回复改为本地收口提示，不再误触发长耗时 AI 调用导致 20 秒超时。
- `mcloud` 入口加载小猫 live patch，云端优先使用最新识图、改期和超时兜底逻辑。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/work_ai_service_live_patch.js` 通过。
- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- `node --check miniprogram/version.js` 通过。
- `node --check miniprogram/setting/setting.js` 通过。

## v1.74 - 2026-06-21

小猫权限与改期兜底修复版本。小猫助手按当前登录账号权限处理业务动作，补齐收款/提成/工资/审核工具边界、截图误导约束，以及 AI 服务不可用时的唯一订单改期前端兜底。本次按小改 `+0.01` 升级为 v1.74。

### 修复

- 小猫权限边界改为跟随当前登录员工账号：普通员工查询个人收款/提成/工资，管理员可使用管理端收款、作废、工资发放和订单审核等能力。
- 扩展受控工具动作：新增 `query_payments`、`save_payment`、`void_payment`、`query_commissions`、`query_payroll`、`pay_payroll`、`audit_order`。
- 强化截图/聊天误导约束：区分套餐应收与实际到账，红包/转账必须确认领取或到账，金额、订单、付款方向不唯一时先追问。
- 前端新增唯一订单改期兜底：AI 服务不可用时，“把20号档期改到21号”“只有一个”可直接查当天唯一订单并保存改期。
- 改期后自动刷新日历并写入团队小记审查流水；小猫欢迎语和 Agent 信息页同步更新。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- `git diff --check -- cloudfunctions/mcloud/project/B00/service/work_ai_service.js miniprogram/cmpts/work_pet/work_pet.js` 通过。

## v1.73 - 2026-06-20

小猫助手免费优先智能升级版本。动态提示词分层节省60% token、智能模型路由降成本、打字机效果提升感知体验、知识库关键词检索注入。本次按功能升级 `+0.1` 升级为 v1.73。

### 新增

- 动态提示词分层：按查询类型（闲聊/查询/写入/图片识别）裁剪系统提示词，闲聊场景 token 减少 60%。
- 员工/类型列表压缩：JSON 数组改为紧凑文本格式，节省约 1500 tokens/次。
- 智能模型路由：按任务复杂度动态选择模型和 maxTokens，支持 429/5xx 自动降级重试。
- 打字机效果：AI 回复逐字显示，标点感知停顿，感知等待时间降低 60-80%。
- 知识库关键词检索：12 条摄影业务知识条目自动匹配用户查询并注入提示词。
- 新增 `work_ai_knowledge.js` 云函数知识库服务和 `knowledge_helper.js` 前端知识助手。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_knowledge.js` 通过。
- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- `node --check miniprogram/helper/knowledge_helper.js` 通过。

## v1.72 - 2026-06-20

小猫助手录单解析与多会话安全修复版本。修复 AI 录单金额清洗、跨年日期纠偏、访客客户名识别和多会话异步写入/滚动串线问题。本次按小改 `+0.01` 升级为 v1.72。

### 修复

- `_amount()` 支持从包含符号、单位或杂字符的金额文本中提取数字，避免金额被静默保存为 0。
- 跨年日期修正改为互斥分支，避免同一日期被二次加减年份。
- 访客模式客户名识别扩展 CJK 范围，并继续拦截金额/来源词误当客户名。
- 小猫多会话异步回复增加线程守卫，避免切换会话后写错聊天记录或强制滚动当前会话。

### 验证

- `node --check cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 通过。
- `node --check miniprogram/helper/guest_helper.js` 通过。
- `node --check miniprogram/cmpts/work_pet/work_pet.js` 通过。
- 金额清洗与访客客户名回归用例通过。

## v1.71 - 2026-06-19

小猫助手本周日期解析修复版本。修复"本周一"在周五等非周一基准日时错误跳转到下周一的问题。根因是 `_extractWeekdayTextDate` 中"本周/这周"前缀的条件分支执行了 `if (offset < 0) offset += 7`，导致当前周内已过去的日期被错误推到下周。移除该修正后，"本周X"始终指向当前 ISO 周内对应日期。本次按小改 `+0.01` 升级为 v1.71。

### 修复

- `_extractWeekdayTextDate` 中"本周/这周/本星期/这星期/本礼拜/这礼拜"前缀不再执行 `offset += 7` 修正。
- "本周一"在周五基准下现在正确返回 `2026-06-15`（本周一），而非 `2026-06-22`（下周一）。
- "这周五"在周五基准下仍正确返回当天 `2026-06-19`。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.70 - 2026-06-19

小猫助手上周日期解析修复版本。修复小猫助手无法识别"上周一""上周六""上星期三"等过去一周星期日期的问题，补齐上上周/上周/上星期/上礼拜前缀支持。本次按小改 `+0.01` 升级为 v1.70。

### 修复

- `_extractWeekdayTextDate` 正则新增 `上上周|上上星期|上上礼拜|上周|上星期|上礼拜` 前缀匹配。
- 条件分支新增 `offset -= 14`（上上周）和 `offset -= 7`（上周）处理。
- "上周一""上周六""上周日""上星期三"等说法可正确换算为对应历史日期。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.69 - 2026-06-18

直接添加档期与小猫日期格式修复版本。修复日历和日详情直接添加档期入口误用 `switchTab` 导致无法打开非 tabBar 新增页的问题，并补强小猫助手对星期类日期与小记动作别名的兼容。本次按小改 `+0.01` 升级为 v1.69。

### 修复

- 日历页和日详情页打开新增档期页改用 `wx.navigateTo`，并把当前选中日期通过 `day` 参数传入，保留 `WORK_ADD_DAY` 作为兜底。
- 新建订单页在无订单ID的新建态默认开放 `canEdit/canFull`，避免保存按钮、添加收款、添加参与人和上传附件入口被隐藏。
- 小猫助手后端新增周/星期/礼拜日期识别，支持“下周六”“本周五”“周日”等常见档期说法，统一转成 `YYYY-MM-DD` 后再保存。
- 小猫助手兼容 `create_note` 动作别名，前后端统一按 `add_note` 处理和刷新页面，减少泛泛“格式错误”。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.68 - 2026-06-12

AI相对日期与事项落库校验修复版本。小猫助手记录“今天/明天/后天”等相对日期时，后端按服务器当前日期兜底纠偏；AI新增事项保存后必须真实生效并通过回查。本次按小改 `+0.01` 升级为 v1.68。

### 修复

- 修复用户说“今天下午一点”时，模型可能把日期误识别为当月1号，导致回复和AI记录里出现错误日期的问题。
- AI日期清洗新增真实日历校验，避免不存在的日期或版本号、小数被误当作档期日期。
- 修复AI新增事项对非管理员走待审核状态，日历和日详情不显示，但小猫仍回复“已新增事项档期”的问题。
- AI新增事项保存后新增落库回查：只有真实事项记录存在、日期标题匹配且状态为生效，才写入AI操作记录并返回成功。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.67 - 2026-06-12

非参与人权限放开与自助加入参与人版本。非参与人可直接查看档期脱敏内容，订单详情页新增自助加入参与人身份入口。本次按小改 `+0.01` 升级为 v1.67。

### 修复

- 日历页和日详情页移除非参与人点击弹窗拦截，非参与人可直接跳转到订单详情页查看脱敏内容。
- 订单详情页根据服务端返回的 `canFull`/`canEdit` 权限标记，控制显示添加收款、参与人、附件、保存等操作按钮，非参与人只能只读查看基础信息。
- 订单详情页参与人区块新增"加入参与人"按钮，非参与人可自助添加参与身份，加入后自动刷新为完整视图。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.66 - 2026-06-11

mcloud 触发器配置修复版本。修复微信开发者工具上传 `mcloud` 云函数时提示 `请确认 config.json 中包含合法的 triggers 字段` 的问题。本次按小改 `+0.01` 升级为 v1.66。

### 修复

- `cloudfunctions/mcloud/config.json` 新增合法空触发器数组 `triggers: []`。
- `mcloud` 是普通业务云函数，不需要定时触发器，因此只补空数组通过开发者工具配置校验。
- 顺手规范化 `permissions.openapi` 数组的空格格式。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.65 - 2026-06-11

订单服务层重复落库防护版本。把订单重复判断从 AI 录单前置校验下沉到 `saveOrder` 保存入口，AI、人工和其他调用方共用同一套“同日同客户同类型”判断。本次按小改 `+0.01` 升级为 v1.65。

### 修复

- 修复仅 AI 层查重时，普通保存入口、并发保存或后续新增入口仍可能绕过查重直接重复落库的问题。
- 修复 AI 录单批量内去重与数据库查重规则可能漂移的问题，改为复用 `WorkService` 的统一判断。
- 手机号归一化增加有效长度保护，避免 OCR 识别到短数字片段时被当成同一手机号。

### 调整

- `saveOrder` 新增/编辑前会排除当前订单自身后检查重复订单。
- 重复判断要求同日期、同客户名或有效电话、同拍摄类型；时间相同时拦截，时间缺失时再结合电话或地点等信息保守拦截。
- AI 单条录单、批量录单和批量内去重统一调用订单服务层查重方法。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.64 - 2026-06-11

AI 录单日期与落库校验修复版本。放宽 AI 识别日期格式，收紧重复订单判断，并在保存后增加落库回查，避免“看起来已登记、实际上没写进去”或误把新单当重复单。本次按小改 `+0.01` 升级为 v1.64。

### 修复

- 修复 AI 录单只接受严格 `YYYY-MM-DD`，导致 `2026/6/13`、`2026年6月13日`、`6.13` 这类常见日期写法容易失败的问题。
- 修复重复订单判断过松，可能因为同客户同日期但只有时间或类型之一相同就被误跳过的问题。
- 修复保存后直接返回成功、但未确认落库结果时可能误报“已登记”的问题。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.63 - 2026-06-11

小猫聊天布局与业绩订单工作台版本。小猫助手精简头部，修复小窗输入区被挤掉、全屏头部占位过大和日志弹窗排版混乱的问题；业绩页改为上半部分业绩、下半部分订单的工作台结构。本次按小改 `+0.01` 升级为 v1.63。

### 修复

- 修复小猫助手缩小状态下输入框可能被挤出视野的问题。
- 修复放大聊天头部元素过多，标题被挤压成竖排的问题。
- 将等待回复文案从“思考中...”改为“小猫正在思考...”。
- 小猫助手常用操作区移除清空/删除按钮，避免误触。

### 调整

- 小猫助手头部去掉说明小字，保留标题、上下文、缩放和关闭等必要操作。
- Agent版本日志改为自定义弹层，按版本、服务商、模型、上下文和更新日志分区展示。
- 业绩页默认展示本人业绩和本人排行，其他员工/团队排行默认收起。
- 业绩页改为“业绩概览 + 订单概览”：上半部分展示业绩、提成、最近收款/提成；下半部分展示订单摘要和最近订单。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.62 - 2026-06-11

访客隔离、AI录单与店内知识入口版本。访客模式不再读取或展示真实业务数据；AI截图录单修正实收金额与重复订单判断；订单工作台迁入业绩页，底部原“订单”入口改为“知识”；消息、附件、小猫助手和员工规则录入同步增强。本次按小改 `+0.01` 升级为 v1.62。

### 新增

- 新增店内知识底部导航入口，预留按员工/角色/管理员权限读取知识的页面结构。
- 业绩页新增订单工作台入口，原订单页仍作为工作台页面保留。
- 小猫助手新增顶部新建对话入口，侧边栏新建对话按钮改为 `＋`。
- 小猫助手设置入口可查看 Agent 版本、模型、供应商和上下文信息。
- 小猫 Agent 新增 `join_order` 受控动作，支持一句话把当前员工加入当前订单参与人，并自动补算已有收款下的本人提成。
- 员工管理新增一段话识别岗位和提成规则入口，自动规整为结构化身份与规则。
- 新增 Hanako Agent 迁移说明，记录后续流式回复、联网搜索、Skill 配置和可抽离 Agent 的路线。

### 修复

- 修复访客进入后仍能看到真实档期、订单、小记、业绩等业务数据的问题。
- 修复访客通过小猫助手新增档期会进入登录后真实数据的问题，访客新增仅保存为本机临时记录并带过期清理。
- 修复 AI 截图录单把未收尾款误计入实收的问题。
- 修复多订单截图中已登记订单可能重复登记、未登记订单反而漏记的问题。
- 修复消息中心消息不能点开查看详情、关联订单不能跳转的问题。
- 修复订单附件图片不能点击放大预览的问题。

### 调整

- AI批量录单回复改为按“已新增 / 已跳过 / 待补充”清单展示。
- 消息中心卡片增加基础简述、未读状态和关联内容入口。
- 订单审核通知增加日期、时间、类型、客户和金额等摘要。
- 日历和当天详情的订单金额展示优先使用实际已收与未收字段。
- 版本更新页按运行环境区分当前版本、研发版本、待发布、版本预告和历史版本。
- 自助加入参与人后会给本人发送提成核实提醒；已结算订单不允许自助加入，需要联系管理员调整。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.61 - 2026-06-11

小记整理、版本入口与消息未读版本。小记页把 AI 操作记录单独分板块展示，普通小记自动规整成“小猫整理”要点；我的页新增版本更新入口；消息中心新增未读数量、未读红点和一键已读。本次按小改 `+0.01` 升级为 v1.61。

### 新增

- 小记页新增“AI记录”分栏。
- 普通小记卡片新增“小猫整理”要点展示。
- 我的页新增“版本更新”入口，并显示当前版本号。
- 新增版本更新页，展示当前版本和历史更新内容。
- 消息中心新增未读数量、未读红点、单条点击已读和一键已读。
- 我的页“消息中心”入口新增未读数量角标。

### 调整

- “全部 / 团队 / 个人”小记列表不再显示 AI 操作记录。
- AI 操作记录仅作为审查流水展示，不进入普通编辑流程。
- 后端 `work/note_list` 同步支持 AI 操作记录过滤。
- 后端新增 `work/message_summary` 和 `work/message_read_all`。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.60 - 2026-06-11

AI 侧栏收起与业绩排行折叠版本。小猫全屏侧栏展开后，点击右侧空白可直接收起；业绩排行默认折叠，点击展开后才显示列表；其他员工条目不再显示“仅排名/仅展示排名”。本次按小改 `+0.01` 升级为 v1.60。

### 修复

- 小猫全屏侧栏右侧空白点击不再无响应，会收起侧边栏。
- 业绩排行默认不直接露出排行列表。
- 非本人排行条目不再展示“仅排名”或“仅展示排名”文案。

### 调整

- 业绩排行头部新增“展开/收起”开关。
- 只有展开后才显示员工/团队切换和排行列表。
- 切换月份后排行恢复默认折叠状态。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.59 - 2026-06-11

AI 批量截图录单与全屏滚动修复版本。放大聊天默认不展示侧边栏，聊天列表恢复上下滚动；截图识别支持一次整理并新增多条订单档期。本次按小改 `+0.01` 升级为 v1.59。

### 修复

- 放大聊天时默认收起左侧会话侧边栏。
- 修复放大聊天状态下聊天内容不能上下滚动的问题。
- 修复 AI 截图识别只新增一条订单的问题，服务端新增 `create_orders` 批量动作。

### 调整

- 截图录单快捷提示改为逐张识别、逐条提取。
- 服务端兼容 `create_order.data.orders`，避免模型返回多个订单时被单条动作吞掉。
- 批量新增订单后返回已新增清单，并说明信息不足而未记录的条目。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.58 - 2026-06-11

AI 全屏侧边栏优化版本。参考豆包侧边栏的抽屉式展示，全屏聊天的会话侧边栏改为更宽、更清晰的左侧面板；顶部操作从文字改为简约图标按钮。本次按小改 `+0.01` 升级为 v1.58。

### 新增

- 全屏聊天头部新增简约菜单图标。
- 放大/缩小、清空、关闭改为图标按钮。
- 左侧侧边栏改为抽屉式展示。
- 侧边栏新增搜索占位、工作台入口、会话列表和底部工具栏。
- 会话列表增加彩色圆点、当前选中态和轻量删除按钮。

### 状态

- 仅本地代码已修改。
- 未上传小程序。

## v1.57 - 2026-06-10

更新通告清单排版版本。启动更新通告不再使用系统弹窗的一整段文字，改为小猫组件托管的自定义弹窗，更新内容按编号逐条换行展示。本次按小改 `+0.01` 升级为 v1.57。

### 新增

- 更新通告改为自定义弹窗。
- 改动摘要按 `1. 2. 3.` 清单展示。
- 支持版本标题、版本名称、更新时间分区展示。
- 保留“关闭”和“不再提醒”两个动作。
- “不再提醒”仍只对当前版本生效。

### 状态

- 仅本地代码已修改。
- 未上传小程序。

## v1.56 - 2026-06-10

AI 聊天图片本地预览版本。小猫 AI 聊天发送图片后，不再只显示“已附加1张图片”，而是在用户消息气泡内显示本地缓存缩略图，并支持点击打开图片预览。本次按小改 `+0.01` 升级为 v1.56。

### 新增

- 图片上传后同步缓存一份到小程序本地文件目录。
- 聊天消息结构新增 `images` 字段，保存图片本地路径、文件名和云存储 fileID。
- 用户发送图片后的聊天气泡显示缩略图。
- 点击聊天气泡里的图片可使用 `wx.previewImage` 预览。
- 待发送附件栏也显示图片小缩略图，便于发送前确认。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传云函数。

## v1.55 - 2026-06-10

小猫 Agent 性格与业务知识版本。参考 Hanako 这类人格化 agent 的设计思路，将小猫从“可聊天助手”进一步优化为“有性格、有业务知识、有受控工具边界的摄影工作台 agent”。本次按小改 `+0.01` 升级为 v1.55。

### 新增

- AI 配置页新增“小猫性格”选择。
- 内置 4 种性格：值班小猫、温柔小猫、审查小猫、成交小猫。
- 后端 agent 提示词注入小猫性格设定。
- 后端 agent 提示词注入本地知识库提炼出的项目定位：摄影工作室档期、订单、业绩提成与工资结算小程序，云屿摄影为案例配置。
- 后端 agent 提示词注入当前小程序实际功能清单：档期、订单、事项、休息、小记、消息、反馈、业绩、工资、管理中心、收款、提成、审核、AI 配置。
- 新增 `create_rest` 工具动作，支持 AI 直接新增休息/请假申请。
- AI 新增休息/请假申请后，自动写入全体可见团队小记作为审查流水。
- 小猫默认开场白和快捷问题更贴近摄影工作台。

### 安全边界

- AI 仍禁止直接执行删除、作废、收款、退款、工资、提成、审核通过、批量修改等高风险动作。
- 本次未写入密钥、密码或 token。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.54 - 2026-06-10

AI 多会话全屏聊天版本。小猫 AI 聊天窗口新增放大入口，可铺满当前小程序界面；全屏模式左侧提供会话侧边栏，支持新建、切换、删除本机对话；聊天头部新增类似 Codex 的上下文占用圈，并按模型名估算上下文窗口。本次按小改 `+0.01` 升级为 v1.54。

### 新增

- 小猫聊天头部新增“放大/缩小”入口。
- 全屏模式新增左侧会话栏。
- 支持新建对话、切换对话、删除本机聊天记录。
- 旧版单会话聊天记录会自动迁移为第一个会话。
- 聊天头部新增上下文占用圈，显示当前会话估算 token 占用。
- 后端 `work/ai_chat` 返回模型名、用量和预估上下文窗口。
- AI 配置页显示当前模型的预估上下文窗口。

### 状态

- 仅本地代码已修改。
- 未上传小程序。
- 未上传 `mcloud` 云函数。

## v1.53 - 2026-06-10

版本更新通告弹窗版本。小程序启动时会根据当前 `version.js` / `setting.js` 版本信息弹出更新通告；用户可点“关闭”只关闭本次，也可点“不再提醒”对当前版本永久关闭。本次按小改 `+0.01` 升级为 v1.53。

### 新增

- `app.js` 启动时读取 `version.js` 当前版本、名称和摘要。
- 新版本首次打开时弹出“更新通告 vX.XX”。
- 弹窗支持“关闭”和“不再提醒”。
- “不再提醒”仅对当前版本生效；下次版本号变化后会重新提醒。

### 状态

- 仅本地代码已修改。
- 未上传小程序。

## v1.52 - 2026-06-10

AI 截图识别本地实现版本。小猫聊天框输入区新增 `+` 附件入口，支持选择图片/聊天图片文件；后端将图片云存储 fileID 转为临时 URL，以 OpenAI 兼容多模态格式传给 Agnes APIHub，AI 可识别截图并生成订单档期，原截图会作为订单附件保存。本次按小改 `+0.01` 升级为 v1.52。

### 新增

- 小猫聊天输入框左侧新增 `+` 按钮。
- 支持选择相册/拍照图片，也支持从聊天文件选择图片。
- 图片上传到云存储 `work/ai/` 后作为 AI 聊天附件发送。
- `work/ai_chat` 支持 `attachments` 参数。
- 后端将图片 fileID 换取临时 URL，并组装为 `text + image_url` 多模态消息。
- AI 新增订单时，会将上传截图 fileID 写入 `ORDER_ATTACHMENTS`。
- 用户只上传图片不输入文字时，默认按“识别截图并记录档期/订单”处理。

### 状态

- 仅本地代码已修改。
- 未上传 `mcloud` 云函数。
- 未写入云数据库。

## v1.51 - 2026-06-10

AI 档期闭环本地修复版本。补齐 AI 新增后的页面自动刷新、误添加后的删除入口，以及“明天要干什么”这类问题需要综合档期和小记整理的能力。本次按小改 `+0.01` 升级为 v1.51。

### 修复

- 订单编辑页新增明显的“取消/删除订单”入口，误添加订单可再次点入后取消。
- 日详情页事项卡片新增“删除”入口，并新增 `work/item_cancel` 后端路由。
- 日详情页 `onShow` 自动刷新，订单取消后返回可立即更新。
- 小猫 AI 成功新增订单、事项或小记后，会自动刷新当前页面的档期/日详情/小记列表。
- AI 查询档期时同时读取当天或日期范围内的小记，回答“明天要干什么”时会综合订单档期、事项、休息和小记。

### 状态

- 仅本地代码已修改。
- 未上传 `mcloud` 云函数。
- 未写入云数据库。

## v1.50 - 2026-06-10

AI 档期查询智能体本地修复版本。针对开发者工具内 AI 仍回复“无法查看实时订单或档期数据”的问题，补齐 `query_schedule` 工具动作，让 AI 能通过云函数读取当前登录账号权限内的真实档期数据。本次按小改 `+0.01` 升级为 v1.50。

### 修复

- AI 工具动作新增 `query_schedule`，支持查询今天、明天、未来一周或指定日期范围的档期。
- `query_schedule` 复用 `WorkService.getDayList`，按当前登录员工权限返回订单档期、事项档期和休息记录。
- 单次 AI 查询限制为最多 14 天，避免一次性拉取过多业务数据。
- 更新系统提示：用户问“明天档期”“未来一周档期”等问题时必须调用查询工具，不再回复“无法查看”。
- 查询结果会返回日期、时间、类型、客户简称/姓名、地点、事项和休息信息。

### 状态

- 仅本地代码已修改。
- 未上传 `mcloud` 云函数。
- 未写入云数据库。
- 未外发真实 AI 请求。

## v1.49 - 2026-06-10

AI 执行型智能体本地实现版本。按用户确认方案，将 AI 小助手从纯对话扩展为受控业务智能体：可直接新增订单档期、事项档期和小记；每次成功写入后，自动在全体可见的小记中追加一条 AI 操作审查流水。本次按小改 `+0.01` 升级为 v1.49。

### 新增

- `work_ai_service` 增加受控动作解析：`create_order`、`create_item`、`add_note`、`none`。
- AI 对话现在会让模型在明确写入意图时返回结构化动作 JSON，由云函数服务层执行。
- 新增订单档期时，复用现有 `WorkService.saveOrder`，保留员工绑定、订单字段、参与人、客户沉淀等既有业务规则。
- 新增事项档期时，复用现有 `WorkService.saveItem`，保留原有审核状态规则。
- 新增小记时，复用现有 `WorkService.saveNote`。
- 每次 AI 写入订单、事项或小记成功后，自动新增 `team` 类型小记，记录操作人、动作摘要和记录 ID，方便全员审查。

### 限制

- 当前只开放新增类动作，不开放删除、作废、收款、退款、工资、提成、审核通过、批量修改等高风险动作。
- 本次只做本地代码实现和静态验证，不上传云函数、不写入云数据库、不外发真实 AI 请求。

### 验证

- `node --check` 已检查 `work_ai_service.js`、`work_admin_ai.js`、`setting.js`、`version.js`，通过。
- `app.json` JSON 解析通过。
- `app.json` 注册页面完整性检查通过，86 个页面均具备 `js/json/wxml/wxss` 文件。
- 本次涉及文件 `git diff --check` 通过。

### 版本

- `miniprogram/setting/setting.js` 版本号同步为 `v1.49`。
- `miniprogram/version.js` 当前版本同步为 `1.49`。

## v1.48 - 2026-06-10

AI 模型列表识别修复版本。修复管理中心“AI 小助手”获取模型后，前端只识别单一返回结构，导致服务商实际返回模型但 picker 下拉仍为空的问题。本次按小改 `+0.01` 升级为 v1.48。

### 修复

- `admin_ai` 前端新增模型列表统一解析，兼容云函数返回的 `{models}`、`{data:{models}}`、`{data:{data:[...]}}`、`{result:{models}}` 等结构。
- 模型列表支持字符串数组和对象数组，兼容 `id`、`name`、`modelId`、`model_id`、`model_name`、`model` 等字段。
- 后端 `work_ai_service` 解析模型对象时补充嵌套 `model.id/model.name` 兜底，并避免把对象误识别为模型名。
- 当前没有识别到模型时，前端改为提示可手动填写模型 ID，不再误提示“已获取模型”。

### 验证

- `node --check` 已检查 `work_admin_ai.js`、`work_ai_service.js`、`setting.js`、`version.js`，通过。
- `app.json` JSON 解析通过。
- `app.json` 注册页面完整性检查通过，86 个页面均具备 `js/json/wxml/wxss` 文件。
- 本次涉及文件 `git diff --check` 通过。
- 未上传云函数、未写入云数据库、未外发请求；真实模型接口仍需在微信开发者工具内带 API Key 点击“获取模型”确认。

### 版本

- `miniprogram/setting/setting.js` 版本号同步为 `v1.48`。
- `miniprogram/version.js` 当前版本同步为 `1.48`。

## v1.47 - 2026-06-10

原生栏位暖纸补色版本。修复 v1.46 仅调整页面主体 WXSS 后，微信原生顶部导航栏和底部 tabBar 仍显示白色的问题。本次按小改 `+0.01` 升级为 v1.47。

### 调整

- 将全局 `window.backgroundColor` 调整为暖纸色，统一下拉和页面外露背景。
- 将原生 `navigationBarBackgroundColor` 从白色调整为暖纸色。
- 将原生 tabBar 背景从近白色调整为暖纸色，并统一底部未选中文字色和选中青蓝色。
- 将 tabBar 边框设置为浅色，减少底部白色断层感。
- 修复桌宠组件 WXSS 中的组件禁用选择器写法，减少开发者工具样式警告。

### 验证

- `node --check` 已检查版本文件，通过。
- `app.json` JSON 解析通过。
- `app.json` 注册页面完整性检查通过，86 个页面均具备 `js/json/wxml/wxss` 文件。
- 本次涉及文件 `git diff --check` 通过。
- `work_pet.wxss` 已检查不再包含组件禁用的 tag/attribute 选择器。
- 全仓 `git diff --check` 仍受既有未关联文件 `miniprogram/projects/B00/biz/project_biz.js` 尾随空格影响。
- 当前沙箱无法通过微信开发者工具 CLI 清理编译缓存，CLI 报 `listen EPERM 127.0.0.1:3799`。
- 待在微信开发者工具中手动点击“编译”后目视检查顶部导航栏、底部 tabBar 和主体页面是否连续。

### 版本

- `miniprogram/setting/setting.js` 版本号同步为 `v1.47`。
- `miniprogram/version.js` 当前版本同步为 `1.47`。

## v1.46 - 2026-06-10

暖纸书页界面优化版本。参考开源项目 OpenHanako 的暖纸主题前端思路，将云屿摄影工作台从偏后台工具的灰底高饱和视觉，调整为更接近真实纸页的暖色低对比界面。本次按小改 `+0.01` 升级为 v1.46。

### 调整

- 新增全局暖纸背景、纸页卡片和细边框视觉基调。
- 将工作台主页面的灰底、深色块和高饱和粉色按钮，统一收敛为暖纸底、墨色文字和青蓝主色。
- 优化档期、业绩、订单、我的、小记、管理中心、AI 小助手配置页的卡片、分段控件、空状态和按钮观感。
- 优化桌宠聊天面板，使其与纸页背景、低对比卡片和青蓝气泡一致。

### 参考

- 参考项目：`https://github.com/liliMozi/openhanako`
- 参考方向：`warm-paper` / `new-warm-paper` 主题中的纸色背景、低饱和文字、细边框、轻阴影和克制主色。

### 验证

- `node --check` 通过。
- `app.json` 注册页面完整性检查通过。
- `git diff --check` 通过。
- 已通过微信开发者工具 CLI 清理 `compile` 编译缓存并重新打开当前项目。

### 版本

- `miniprogram/setting/setting.js` 版本号同步为 `v1.46`。
- `miniprogram/version.js` 当前版本同步为 `1.46`。

## v1.45 - 2026-06-10

AI 小助手配置页调试修复版本。微信开发者工具曾显示 `./projects/B00/pages/work/admin_ai/work_admin_ai.wxml not found`，但本地页面文件和 `app.json` 注册均存在。本次按小改 `+0.01` 升级为 v1.45。

### 调整

- 在 `project.config.json` 增加“AI小助手配置”编译场景，便于开发者工具直接识别并刷新新建页面。
- 保持 `admin_ai` 页面路径为 `/projects/B00/pages/work/admin_ai/work_admin_ai`，不调整业务路由。

### 验证

- 已检查 `admin_ai` 四个页面文件存在。
- 已检查 `app.json` 注册的 86 个页面均具备 `js/json/wxml/wxss` 文件。
- `miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js` 语法检查通过。
- 已通过微信开发者工具 CLI 清理 `compile` 编译缓存并重新打开当前项目。

### 版本

- `miniprogram/setting/setting.js` 版本号同步为 `v1.45`。
- `miniprogram/version.js` 当前版本同步为 `1.45`。

## v1.44 - 2026-06-10

编译阻断修复版本。v1.43 修复后，微信开发者工具报错 `module 'helper/share_helper.js' is not defined`，导致 `app.js` 初始化失败、首页页面未注册。本次按小改 `+0.01` 升级为 v1.44。

### 修复

- 移除 `app.js` 启动期对 `helper/share_helper.js` 的外部依赖。
- 将默认分享标题、路径、分享图规范化逻辑内联到 `app.js`。
- 保留页面分享能力，同时避免单个 helper 模块未被开发者工具识别时阻断整个小程序启动。

### 版本

- `miniprogram/setting/setting.js` 版本号同步为 `v1.44`。
- `miniprogram/version.js` 当前版本同步为 `1.44`。

## v1.43 - 2026-06-10

审核体验受限修复版本。当前版本基线由用户确认为 v1.42，本次按小改 `+0.01` 升级为 v1.43。

### 新增

- 新增访客体验模式，未绑定员工的审核员可从“我的”页点击“访客进入，先体验功能”。
- 新增本地演示数据层，访客模式下展示演示档期、订单、业绩排行和小记。
- 新增 `miniprogram/helper/guest_helper.js` 统一管理访客状态和演示数据。
- 新增 `miniprogram/version.js`，记录当前业务版本元数据。
- 新增 [版本修改日记](docs/version-change-diary.md)，后续每次代码修改同步记录版本动态、讨论结论、涉及文件和验证结果。

### 调整

- 档期、业绩、订单、小记、我的 5 个底部主入口支持访客体验。
- 访客模式下禁止新增、编辑、查看真实详情和调用真实 AI 对话，只展示本地演示内容。
- 猫咪 AI 在访客模式下返回本地说明，不访问真实云端 AI 接口。
- `miniprogram/setting/setting.js` 版本号同步为 `v1.43`。

### 验证

- `node --check` 通过。
- `git diff --check` 通过。


## v0.1.0 - 2026-06-19

- Initialized GitHub Releases / docs/releases/ as the public version archive.
- Added append-only documentation policy: future project copy should stack by version instead of replacing original upload content.
- Documentation-only update; source code was not intentionally changed.
## v1.2.0 - 2026-06-08

业绩、收款、提成、工资结算和小程序内管理中心正式版本。

### 新增

- 新增“业绩”底部导航入口，展示员工本月净业绩、排名、最近收款和提成事件。
- 新增 `bx_work_payment` 收款账本，支持按实际收款月份统计净业绩。
- 新增 `bx_work_commission` 提成事件账本，支持先发、冻结、释放、退款扣回和调整项。
- 新增小程序内管理中心，管理员从“我的”页基于 openid 免密码进入。
- 新增管理端业绩看板、收款明细、员工提成、待释放提成、工资结算和订单审核页面。
- 新增小程序内员工管理页面，支持新增员工、维护岗位、管理员身份、状态和提成规则。
- 新增 `scripts/deploy-mcloud-clean.sh`，用于干净部署 `mcloud` 云函数，避开本地依赖目录导致的开发者工具打包异常。

### 调整

- 工资结算从订单参与人一次性计算改为从提成事件汇总。
- 管理接口统一基于 `openid + STAFF_IS_ADMIN` 做后端二次校验。
- 订单编辑、收款、审核和工资发放流程增加金额精度、幂等和审计处理。
- 管理中心相关页面从旧后台密码入口迁移到小程序内部工作台入口。

### 文档

- 更新 README 为 v1.2.0 正式中文项目说明。
- 保留 [v1.2.0 更新预告](docs/architecture/v1.2.0-update-preview.md) 作为历史规划资料。
- 新增 [v1.2.0 架构说明与分析](docs/architecture/v1.2.0-analysis.md)。
- 新增 [v1.2.0 完整架构方案](docs/architecture/v1.2.0-architecture-plan.md)。

## v1.1.0 - 2026-05-25

内部档期工作台版本。发布日期依据本地源码最后一批 1.1 业务文件时间标注，不使用 GitHub 同步当天日期。

### 新增

- 新增内部工作台入口：档期、小记、新增、消息、我的。
- 新增员工手机号和绑定码绑定流程。
- 新增订单档期、事项档期、休息日期、小记、消息等工作台数据模型。
- 新增订单参与人、岗位、提成方式、尾款、后期加选/产品金额和附件字段。
- 新增工资预计、审核、驳回、待结算和已结算流程。
- 新增后台员工与提成、订单类型、工作台审核、工资结算和取消订单页面。

### 调整

- 非参与员工只查看脱敏档期信息。
- 参与员工可查看订单金额、定金、尾款和后期金额，但不可查看其他员工提成。
- 后台初始化密码改为环境变量配置，不再内置默认密码。

## v1.0.0 - 2026-05-23

1.0 审核版。发布日期依据本地备份目录 `完整源码_1.0审核版_20260523_153714` 标注。

### 主要内容

- 完成云屿摄影品牌和业务类目改造。
- 支持按拍摄类型、日期、时段维护档期。
- 支持客户预约记录、后台订单管理、核销、取消和导出。
- 支持样片展示、拍摄服务展示和后台内容维护。
- 新增企业微信群每日档期推送云函数 `autoSendDaily`。
