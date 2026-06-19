# Publish Round 065 Output

## 版本

- **版本号**: v1.71
- **版本来源**: `miniprogram/version.js` current = `1.71`，与 `CHANGELOG.md` 一致

## Commit

- **Hash**: `32e4ef5`
- **Message**: Round 065: v1.71 cross-year date fix + JSON brace matching + customer name match fix

## 文件变更

| 文件 | 变更类型 |
|------|----------|
| `cloudfunctions/mcloud/project/B00/service/work_ai_service.js` | 修改 |
| `cloudfunctions/mcloud/project/B00/service/work_service.js` | 修改 |
| `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` | 修改 |
| `docs/maintenance/longrun-20260619-ai-pet/longrun-status.json` | 修改 |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-state.json` | 修改 |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round064-output.md` | 新增 |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round065-claude.log.err` | 新增 |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round065-task.md` | 新增 |
| `docs/maintenance/longrun-20260619-ai-pet/rounds/round065-output.md` | 新增 |
| `docs/maintenance/longrun-20260619-ai-pet/test-results/round065-checks.md` | 新增 |

## Push

- **结果**: 成功
- **目标**: `origin/main` → `https://github.com/lychee20000105/photography-studio-schedule-miniprogram`
- **远程 hash**: `32e4ef538cd25c946e6be8b15c2bfa30944004c2`

## GitHub Release

- **Tag**: v1.71（已存在，已追加 Round 065 内容）
- **URL**: https://github.com/lychee20000105/photography-studio-schedule-miniprogram/releases/tag/v1.71
- **操作**: 追加 Round 065 修复说明到现有 release 正文

## 安全检查

- Secret scan: 通过（均为已有文件的误报，无新增敏感内容）
- 无文件删除、无重命名
- `.gitignore` 覆盖 `.env`、`node_modules`、`project.private.config.json` 等

## 本次代码变更摘要

1. **work_ai_service.js**: JSON 提取从 `lastIndexOf('}')` 改为深度匹配花括号解析器，支持嵌套 JSON；新增跨年边界日期逻辑（12月→1月 / 1月→12月 在约60天内自动调整年份）
2. **work_service.js**: 客户名子串匹配从 `Math.min(a.length, b.length) < 2` 改为 `a.length < 2 || b.length < 2`，避免短名被长名包含时误判
