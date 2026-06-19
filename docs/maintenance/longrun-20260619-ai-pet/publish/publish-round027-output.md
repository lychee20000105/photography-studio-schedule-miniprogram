# Round 027 发布报告

## Skill 读取确认

- 已读取 `publish-github-open-source` skill v0.3.2
- 遵循历史文案保留、安全检查、append-only 发布规则

## Round 027 内容摘要

**代码修复（已随 `7f066db` 提交）：**
1. `work_ai_service.js` — `_extractSpecificTextDate` 新增量词守卫 `(?![张条位个名组批次套件])` 防止"3月"开头误匹配；全日期分支新增 year 1990-2099 范围校验；月-日分支新增 month/day 范围校验。
2. `work_ai_service.js` — `_extractWeekdayTextDate` 与 `_resolveWeekdayFromText` 提取共享方法 `_computeWeekdayOffset(text, maxLen, requireContext)`，消除重复逻辑。

**验证：** 文件语法检查通过；9 组功能测试全部通过（3 组 `_extractSpecificTextDate` + 6 组 `_computeWeekdayOffset`）。

## 安全/密钥检查

- 扫描 `api_key|secret|token|password|private_key|AKIA|ghp_|sk-` 等模式
- 结果：全部为合法代码引用（AI token 计数函数 `estimateTokens`、`total_tokens` 等），无真实密钥泄露
- `.gitignore` 正确覆盖 `node_modules/`、`.env`、`*.log`、`*.pem`、`*.key`、`project.private.config.json`
- 无敏感文件进入提交

## 已提交文件

Round 027 代码修复随 `7f066db` 提交（包含 Round 027-032 修复），已推送至 `origin/main`。

## 本轮工作区变更（Round 033-034）

本轮发布同时包含 Round 033 和 Round 034 的工作区变更：

- `miniprogram/cmpts/work_pet/work_pet.js` — `bindChatClose` 中清理 `_scrollTimer1`/`_scrollTimer2`，修复 scroll timer 泄漏（Round 033）；新增 `bindClearAttachments()` 批量清空附件方法（Round 034）
- `miniprogram/cmpts/work_pet/work_pet.wxml` — 新增"清空"按钮，2+ 张图片时显示，一键清空所有附件（Round 034）
- `miniprogram/cmpts/work_pet/work_pet.wxss` — `.attach-clear-all` 红色样式（Round 034）
- `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` — 新增 3 条心跳日志
- 新增 `rounds/round034-output.md`、`test-results/round034-checks.md`
- `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round027-output.md` — 修复编码乱码，重写为正确 UTF-8 中文

## 发布结果

| 项目 | 状态 |
|------|------|
| GitHub 仓库 | https://github.com/lychee20000105/photography-studio-schedule-miniprogram |
| Commit | `ff4fc0c` — `Update longrun Round 033-034 code fixes and docs, fix publish-round027 mojibake` |
| Push | `66793e4..ff4fc0c main -> main` 成功 |
| 远程验证 | hash 匹配（`ff4fc0cde31994a7e239fdf8573a2658976c7cfb`） |
| 文件变更 | 8 files changed, +97 -15 |
| 删除/重命名 | 无 |

## 剩余风险

- 无。所有工作区变更已提交并推送。
