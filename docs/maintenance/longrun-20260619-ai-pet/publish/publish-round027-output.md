# Round 027 发布报告

## Skill 读取确认

- 已读取 `publish-github-open-source` skill v0.3.2
- 遵循历史文案保留、安全检查、append-only 发布规则

## 安全/密钥检查

- 扫描 `api_key|secret|token|password|private_key|AKIA|ghp_|gho_|sk-` 等模式
- 匹配文件均为合法代码引用，无真实密钥泄露
- `.gitignore` 正确覆盖 `node_modules/`、`.env`、`*.log`、`*.pem`、`*.key`、`project.private.config.json`
- 已忽略文件（日志、缓存、私有配置）均未进入提交
- 无敏感文件进入提交

## 本轮提交内容

本轮发布包含 longrun 维护期间的工作区变更：

- `miniprogram/helper/guest_helper.js` — 尾款计算逻辑优化：`_parseAmount` 移除 '未收'/'待收' 误匹配关键词，新增 `amount - deposit - paid` 自动计算兜底
- `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` — 新增心跳日志条目
- `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round027-output.md` — 修复编码乱码（mojibake），从 HEAD 恢复正确 UTF-8 版本
- 新增 `docs/maintenance/longrun-20260619-ai-pet/rounds/round036-task.md` — Round 036 任务文件
- 新增 `docs/maintenance/longrun-20260619-ai-pet/rounds/round036-output.md`
- 新增 `docs/maintenance/longrun-20260619-ai-pet/test-results/round036-checks.md`
- 新增 `docs/maintenance/longrun-20260619-ai-pet/rounds/round037-task.md`

## 发布结果

| 项目 | 状态 |
|------|------|
| GitHub 仓库 | https://github.com/lychee20000105/photography-studio-schedule-miniprogram |
| Commit | `47bc558` — Update longrun Round 036 code fix and docs, fix publish-round027 mojibake |
| Push | `268ff56..47bc558 main -> main` 成功 |
| 远程验证 | hash 匹配（`47bc5589556631c0b6d0ccc54e428724d3cfd36e`） |
| 文件变更 | 7 files changed, +127 -14 |
| 删除/重命名 | 无 |

## 剩余风险

- publish-round027-output.md 曾反复出现编码乱码，后续提交时需注意文件编码一致性（UTF-8 without BOM）。
