# Round 066 Publish Report

- **Commit hash**: `beaff8e41d873d337410781d7bb0df5d5650a0e9`
- **Branch**: `main`
- **Push result**: Success (701b925..beaff8e main -> origin/main)
- **Version**: v1.71
- **Version source**: `miniprogram/version.js` current = `1.71`, cross-checked with `CHANGELOG.md` (v1.71 小猫助手本周日期解析修复)
- **Release URL**: https://github.com/lychee20000105/photography-studio-schedule-miniprogram/releases/tag/v1.71
- **Release action**: Updated existing v1.71 release — appended Round 066 fixes to release body

## Safety checks

- Secret scan: Passed — no real API keys, tokens, or credentials in staged files
- `.env`/secrets files: None staged
- Deletions: None
- Renames: None
- Line ending warnings: CRLF warnings on existing files (pre-existing, not new issues)

## Files committed (9 files)

| File | Change |
|------|--------|
| `cloudfunctions/mcloud/project/B00/service/work_service.js` | Bug fixes: single-char false match + midnight time fix |
| `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` | Heartbeat log append |
| `docs/maintenance/longrun-20260619-ai-pet/longrun-status.json` | Status update (round 67) |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-state.json` | Publish state update |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round066-claude.log.err` | New: empty log file |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round066-task.md` | New: publish task |
| `docs/maintenance/longrun-20260619-ai-pet/rounds/round066-output.md` | New: round output |
| `docs/maintenance/longrun-20260619-ai-pet/rounds/round066-task.md` | New: round task |
| `docs/maintenance/longrun-20260619-ai-pet/test-results/round066-checks.md` | New: test results |

## Round 066 bug fixes in work_service.js

1. `_isSameOrderTypeName` / `_isSameOrderPlace`: `Math.min(a.length, b.length) < 2` → `a.length < 2 || b.length < 2` — single-char like "地" no longer falsely matches "场地"
2. `_normalizeOrderTimeForCompare`: "下午12点" was wrongly converted to 00:00. Added `isLateNight` flag; only 凌晨/晚上/晚间 trigger `hour=12 → 0`

## Documentation change type

- Append-only: all docs are new files or incremental log/status updates
- work_service.js: incremental bug fixes, no content deletion
