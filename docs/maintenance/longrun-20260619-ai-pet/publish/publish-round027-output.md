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
- 结果：全部为合法代码引用（admin token 处理、jsonwebtoken 包、配置注释），无真实密钥泄露
- `.gitignore` 正确覆盖 `node_modules/`、`.env`、`*.log`、`*.pem`、`*.key`、`project.private.config.json`
- 无敏感文件进入提交

## 已提交文件

Round 027 代码修复随 `7f066db` 提交（包含 Round 027-032 修复），已推送至 `origin/main`。

当前工作区额外变更（Round 033 完成后）：
- `miniprogram/cmpts/work_pet/work_pet.js` — `bindChatClose` 中清理 `_scrollTimer1`/`_scrollTimer2`，修复 scroll timer 泄漏
- `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` — 新增心跳日志
- 新增 `rounds/round033-output.md`、`rounds/round033-task.md`、`test-results/round033-checks.md`
- 新增 `rounds/round034-task.md`

## 发布结果

| 项目 | 状态 |
|------|------|
| Commit | `7f066db` (Round 027-032 code fixes) |
| Push | `0e7514e..7f066db main -> main` 成功 |
| 远程验证 | hash 匹配，本地 HEAD = origin/main |
| GitHub 仓库 | https://github.com/lychee20000105/photography-studio-schedule-miniprogram |

## 本轮追加提交

本轮发布子代理同时提交了 Round 033 的 scroll timer 修复和 longrun 文档更新，commit hash 见下方。

## 剩余风险

- Round 033 代码修复和文档当前在工作区未提交，需要在下一轮发布中一并推送
- 本报告修复了原文件的编码乱码问题（UTF-8 mojibake -> 正确中文）
