# Publish Round 027 Report

- **Date**: 2026-06-19
- **Skill**: publish-github-open-source v0.3.2

## Skill Read Confirmation

Read and followed `C:\Users\Administrator\.codex\skills\publish-github-open-source\SKILL.md` (v0.3.2).

## Safety/Secret Checks Performed

1. **Secret scan on `work_ai_service.js`**: Found `process.env.B00_WORK_AI_API_KEY` / `process.env.WORK_AI_API_KEY` references — these are env var reads, not hardcoded secrets. **Safe.**
2. **Secret scan on `docs/maintenance/` files**: All non-ignored files scanned for `api_key|secret|token|password|private_key|ghp_|sk-|AKIA|cookie`. No real secrets found. **Safe.**
3. **`.gitignore` verification**: `*.log` correctly excludes all `round*-claude.log`, `supervisor-logs/`, `publish-*-claude.log`, and `publish-watcher.log`. Only non-log docs (`*.md`, `*.err`) are trackable. **Correct.**
4. **`node --check`**: `cloudfunctions/mcloud/project/B00/service/work_ai_service.js` passes syntax check. **OK.**
5. **Binary files (demo PNG)**: All 24 demo PNG files show same byte sizes before/after — no content injection, likely git re-stat. **Safe.**
6. **No `.env`, `node_modules`, `project.private.config.json`, or database files in staging.** **Safe.**

## Files Committed

| File | Action | Notes |
|------|--------|-------|
| `cloudfunctions/mcloud/project/B00/service/work_ai_service.js` | Modified | Round 027 bug fixes: `_extractSpecificTextDate` quantifier guard + year range; `_computeWeekdayOffset` shared method extraction |
| `demo/*.png` (24 files) | Modified (binary) | Demo screenshots, same sizes — git re-tracking |
| `docs/maintenance/longrun-20260619-ai-pet/rounds/round027-output.md` | New | Round 027 output record |
| `docs/maintenance/longrun-20260619-ai-pet/test-results/round027-checks.md` | New | Round 027 test results |
| `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` | New | Longrun heartbeat log |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-current-output.md` | New | Current publish report |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round027-task.md` | New | Round 027 publish task file |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round027-output.md` | New | This report |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-watcher.log.err` | New | Empty watcher error log |
| `docs/maintenance/longrun-20260619-ai-pet/rounds/round028-task.md` | New | Round 028 task |

## Skipped Files

- `docs/maintenance/longrun-20260619-ai-pet/logs/*.log` — excluded by `.gitignore` `*.log` rule
- `docs/maintenance/supervisor-logs/*.log` — excluded by `.gitignore` `*.log` rule
- `docs/maintenance/longrun-20260619-ai-pet/publish/publish-*-claude.log` — excluded by `.gitignore` `*.log` rule

## Commit and Push Result

- **Commit**: `07cf8def234c57ad36a1d405404c89a5278a8bba`
- **Message**: `Release v1.71 accumulated longrun fixes: pet assistant date parsing, work module improvements`
- **Branch**: `main`
- **Target**: `origin/main` → `https://github.com/lychee20000105/photography-studio-schedule-miniprogram.git`
- **Push**: Success — `bee49e9..07cf8de main -> main`
- **Remote verification**: `git ls-remote origin refs/heads/main` → `07cf8de` matches local HEAD

## Remaining Risks

- `publish-watcher.log.err` is tracked (empty file, `.err` not caught by `*.log`). Low risk but could accumulate noise in future rounds.
- Demo PNG files show same-size diffs — likely git re-stat on Windows CRLF/binary handling, no actual content change.
- No GitHub Release created for this round — incremental bug fix, not a versioned release milestone.

---

## Second Publish Run — 2026-06-19

### Context

Publish watcher encountered a `lastProcessedAt` property error, then restarted the publish worker for Round 027. This run found `publish-round027-output.md` had been overwritten with mojibake (encoding-corrupted Chinese text). Restored original report from `git HEAD` and committed the heartbeat update.

### Safety/Secret Checks Performed

1. **Secret scan** on `docs/maintenance/longrun-20260619-ai-pet/` and `cloudfunctions/`: all matches are `process.env` reads or config params (`maxTokens`). No hardcoded secrets. **Safe.**
2. **No `.env`, `node_modules`, `project.private.config.json` in staging.** **Safe.**
3. **No deletions or renames** in staged diff. **Safe.**

### Files Committed

| File | Action | Notes |
|------|--------|-------|
| `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` | Modified | Appended watcher error log + publish worker restart entry |
| `docs/maintenance/longrun-20260619-ai-pet/publish/publish-round027-output.md` | Restored | Fixed mojibake — original detailed report restored from `git HEAD` |

### Commit and Push Result

- **Commit**: `2072c9fa40dbffa73f99d127f0884865a0f95f68`
- **Message**: `Update longrun heartbeat: fix publish-round027 mojibake, log watcher error and publish restart`
- **Branch**: `main` → `origin/main`
- **Push**: Success — `3e70b7b..2072c9f main -> main`
- **Remote verification**: `git ls-remote origin refs/heads/main` → `2072c9f` matches local HEAD

### Documentation Change Type

- `publish-round027-output.md`: **restoration** (replaced mojibake with original content from git history, not a content rewrite)
- `longrun-heartbeat.md`: **append-only** (2 new log lines)
