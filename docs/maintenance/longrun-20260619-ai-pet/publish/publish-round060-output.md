# Publish Round 060 Output

Generated at 2026-06-19T23:20.

## Version Source

- `miniprogram/version.js` current: **v1.71**
- `CHANGELOG.md`: v1.71 小猫助手本周日期解析修复版本
- Tag `v1.71` already existed; release updated with round 060 notes.

## Changes Committed

| File | Status |
|------|--------|
| `miniprogram/helper/guest_helper.js` | Modified (1-line fix) |
| `docs/maintenance/longrun-20260619-ai-pet/rounds/round060-output.md` | Added |
| `docs/maintenance/longrun-20260619-ai-pet/test-results/round060-checks.md` | Added |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round059-output.md` | Added |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round060-claude.log.err` | Added |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round060-task.md` | Added |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-state.json` | Modified |
| `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` | Modified |
| `docs/maintenance/longrun-20260619-ai-pet/longrun-status.json` | Modified |

No files deleted. No secrets detected.

## Commit & Push

- **Commit**: `49e2f86ad14b828678c5e0ecaa30e453594d419e`
- **Message**: `Round 060: v1.71 guest_helper final-calc fix + longrun docs`
- **Push**: `b391186..49e2f86 main -> main` (success)

## GitHub Release

- **URL**: https://github.com/lychee20000105/photography-studio-schedule-miniprogram/releases/tag/v1.71
- **Action**: Updated existing v1.71 release with round 060 fix description.
- **Change type**: Append (release body updated, not overwritten).

## Round 060 Fix Summary

`guest_helper.js:337` — 访客尾款计算忽略定金。当用户说"金额299 定金150 已收100"时：
- 旧代码: `final = 299 - 100 = 199` (错误，与未付余额相同)
- 新代码: `final = 299 - 150 = 149` (正确：定金150 + 尾款149 = 299)

## Blockers

None. Push and release update succeeded.
