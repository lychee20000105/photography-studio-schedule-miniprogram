# 摄影工作室档期小程序

基于微信云开发的摄影工作室内部经营小程序，覆盖档期、订单、收款、员工业绩提成、工资结算、小程序内管理中心和 AI 小助手配置。

当前本地代码版本：`v2.48`

当前开源稳定基线：`v2.48.0`
最近本地修改时间：`2026-07-04`

## v2.48.0 Release Notes

Make the work pet distinguish a cloud-function fallback from a real upstream model reply. When `work/ai_chat` returns `aiUnavailable`, the front end now shows an explicit real-API-failure notice instead of treating the fallback as a normal assistant answer.

Key changes:
- Detect `data.aiUnavailable` from the cloud AI route.
- Use one explicit failure notice for both returned fallback replies and thrown generic unavailable errors.
- Do not mark the API as working until a real model reply is observed.
- Simulator retest with `API TEST 0704B reply OK0704B` still did not return `OK0704B`; the upstream API remains unverified.

## v2.47.0 Release Notes

Make the work pet report real API failure explicitly when the cloud AI call still returns the old generic unavailable error. Simulator testing still has not verified a successful upstream model response.

Key changes:
- Replace the old generic front-end chat error with an explicit cloud/AI-call failure notice.
- Keep the v2.46 12-second upstream timeout guard.
- Retest with a unique `OK0704` prompt before marking the API as working.

## v2.46.0 Release Notes

Keep the work pet cloud-function call from being killed by the current 20-second cloud timeout before it can return a controlled fallback. The upstream AI API still has not been verified as successfully returning a real model reply in simulator testing.

Key changes:
- Reduce upstream AI HTTP timeout from 45 seconds to 12 seconds.
- Keep the controlled external-AI-unavailable fallback reachable under the current cloud-function timeout.
- Regenerate and deploy the mcloud live patch after verification.

## v2.45.0 Release Notes

Stabilize the work pet agent by disabling the unreliable external stream shortcut, normalizing Agnes model IDs, supporting /responses endpoints, and returning an online fallback reply when the upstream AI provider is unavailable.

Key changes:
- Ignore WORK_PET_STREAM_URL for now so the pet uses the stable work/ai_chat cloud-function path.
- Normalize legacy Agnes model IDs such as agnes-20-flash to agnes-2.0-flash.
- Support OpenAI Responses-style /responses endpoints with input/max_output_tokens and response output parsing.
- Return a local online fallback reply instead of the generic unavailable error when the upstream provider fails.
- Regenerated and incrementally deployed work_ai_service_live_patch.js to mcloud.

## v2.44.0 Version Notes

v2.44.0 修复云屿小猫 Agent 前端发送兜底问题：当本地缓存的流式 HTTP 地址失效或请求失败时，小猫会自动回退到普通 `work/ai_chat` 云函数调用，并释放发送/思考状态，避免聊天面板一直卡在“思考中”或发送按钮永久灰掉。

主要变化：
- 流式请求失败后自动使用普通云函数链路兜底。
- 兜底失败时把错误提示写入当前聊天记录，用户能看到失败原因。
- 90 秒安全超时同步释放 `chatLoading`、`chatSending`、`chatStreaming` 和 `chatThinkPhase`。

本仓库以“云屿摄影”的实际业务小程序作为案例配置，面向小型摄影工作室、活动跟拍团队和本地生活服务团队开源。你可以二次开发为自己的生日跟拍、百日宴、婚礼跟拍、订婚宴、寿宴、乔迁跟拍、写真、外景约拍、活动商拍、艺术肖像等档期与订单协同系统。

## v2.42.0 版本说明

v2.42.0 重点完成 AI 小助手多供应商配置、前端配置页重构、云函数 live patch 同步，以及前端中文编码修复。

主要变化：

- AI 供应商配置从单配置升级为多供应商列表，支持活跃供应商切换和独立编辑。
- 后端支持 `providers[] + activeProviderId` 存储结构，并兼容旧单供应商配置迁移。
- 前端 AI 配置页重构为供应商卡片、列表、内联编辑器和高级设置折叠区。
- 新增 `work/admin_ai_providers_save` 路由，并同步生成 3 个云函数 live patch。
- 修复 AI 配置页 JS/WXML/WXSS 与版本文件的中文编码污染，确保 UTF-8 无 BOM。

## 案例说明

本项目不是只服务某一个品牌的封闭系统，而是一个可复用的小程序案例工程。“云屿摄影”相关名称、业务类目、AppID 和云环境 ID 均来自案例配置，二次使用时可以替换为自己的摄影工作室品牌、服务项目和微信云开发环境。

## 核心功能

- 内部档期：支持月历彩色标签、全店/我的筛选、订单档期、事项档期、休息日期。
- 订单记录：可记录客户、电话、地点、来源、订单金额、定金、尾款、后期加选/产品金额、参与人和附件截图。
- 收款管理：按实际收款月份记录收款、退款和作废，支撑净业绩统计。
- 员工提成：员工按手机号绑定，可按员工+岗位设置提成规则；提成事件支持先发、冻结、释放、退款扣回和调整。
- 工资结算：从提成事件汇总工资，管理员可预览并确认发放，已发工资不重复计算。
- 团队查看：非参与员工只看脱敏档期，参与员工可看订单金额但不可看其他员工提成。
- 业绩看板：员工端和管理端分别展示净业绩、收款、退款、排行和提成概览。
- 小程序内管理中心：管理员可在小程序内管理收款、提成、冻结余额、工资、订单审核和员工信息。
- AI 小助手：支持云端代理调用、供应商切换、模型配置和测试对话。
- 样片展示：展示跟拍纪实、艺术肖像、写真作品、外景约拍、活动商拍等作品分类。
- 拍摄服务：维护服务价格、亮点、服务内容、行程安排和交付说明。
- 后台管理：支持预约名单、核销、导出、内容、样片、服务、管理员、员工、订单类型、审核和工资结算维护。
- 企业微信群提醒：支持通过云函数每天推送当日档期摘要到企业微信群。
- 企业微信配置：上线后可在后台“企业微信机器人”页面填写 Webhook，并测试发送。

## 技术说明

- 微信小程序云开发：小程序端、云函数、云数据库、云存储。
- 云函数：`cloudfunctions/mcloud`、`cloudfunctions/autoSendDaily`。
- 案例 AppID：`wx16193bf2c2e4c22b`。
- 案例云开发环境 ID：`yunyukeji-d4g7waei5d5d6cdeb`。
- 技术由云屿科技支撑。

二次部署时请把 `project.config.json` 与 `cloudfunctions/mcloud/config/config.js` 中的 AppID、云环境 ID 替换为自己的微信小程序配置，并按自己的品牌修改页面文案、服务分类和初始化数据。

## 后台账号

后台超级管理员初始账号：`admin`

首次初始化不再内置默认密码。部署前请在云函数环境变量中配置 `B00_ADMIN_INIT_PASSWORD`（或 `ADMIN_INIT_PASSWORD`），要求 12-30 位并至少包含大小写字母、数字、符号中的 3 类。

如未配置环境变量，系统会生成不可预测临时密码并写入数据库，但不会在日志中输出明文；请通过安全渠道重置后再交付使用，并按员工职责创建普通管理员。

## 快速开始

1. 使用微信开发者工具导入项目根目录。
2. 确认 `project.config.json` 中的 AppID。
3. 确认 `cloudfunctions/mcloud/config/config.js` 中的 `CLOUD_ID`。
4. 在云开发控制台创建或绑定对应云环境。
5. 上传并部署 `mcloud` 云函数。若开发者工具在打包 `node_modules` 时出现 `EISDIR`，可先运行 `scripts/deploy-mcloud-clean.sh` 查看干净部署命令。
6. 上传并部署 `autoSendDaily` 云函数。
7. 初始化后台数据后配置员工、订单类型、档期、样片、拍摄服务和企业微信机器人。
8. 管理员可从小程序“我的”页进入“管理中心”，维护员工、收款、提成和工资结算。

## 项目结构

```text
.
├── cloudfunctions/       # 微信云函数
├── demo/                 # 演示截图
├── docs/                 # 架构文档与版本说明
├── miniprogram/          # 小程序端源码
├── scripts/              # 本地辅助脚本
├── tools/                # 本地编码与 live patch 验证脚本
├── project.config.json   # 微信开发者工具项目配置
└── README.md
```

## 发布记录

详见 [CHANGELOG.md](CHANGELOG.md)。

详细版本修改日记见 [docs/version-change-diary.md](docs/version-change-diary.md)。

## 安全说明

- 仓库不提交 `node_modules`、`project.private.config.json`、`.env`、日志、导出文件和私钥文件。
- 企业微信机器人 Webhook、后台初始化密码、AI 供应商 Key 等敏感配置应通过后台页面、云函数环境变量或受控配置写入，不要写入公开源码。
- 发布副本中的 `TEST_TOKEN_ID` 已替换为占位值，仅用于本地测试配置说明。

## License

[MIT](LICENSE)

## 版本档案 / Release History

本项目后续更新默认保留历史文案，不覆盖原始上传内容。每个有意义的版本都会优先通过以下位置叠加记录：

- GitHub Releases：https://github.com/lychee20000105/photography-studio-schedule-miniprogram/releases
- CHANGELOG.md
- docs/releases/

README 只保留当前版本入口和必要说明；历史版本细节按版本向上叠加，方便像 release 页面一样查看完整演进记录。
