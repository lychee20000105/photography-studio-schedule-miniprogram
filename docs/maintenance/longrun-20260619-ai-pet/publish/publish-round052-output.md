# Publish Round 052 Output

- **Date**: 2026-06-19T21:45
- **Commit**: `fa94b19`
- **Push**: Success — `origin/main` updated from `5a03d77` to `fa94b19`
- **GitHub**: https://github.com/lychee20000105/photography-studio-schedule-miniprogram
- **Branch**: `main`

## Changes (13 files, +431 / -30)

### Code (1 file)
- `miniprogram/helper/guest_helper.js` — regex and type normalization fixes:
  - `_parseCustomer`: negative lookbehind `(?<![跟商])拍` prevents '商拍' from capturing '商' as customer name
  - `_parseAmount`: supports `：:` separator between name and number (e.g. "罗雅：299")
  - `_normalizeType`: alias map (`商业拍摄`→`商拍`, `婚纱跟拍`→`婚礼跟拍`); removed opinionated '写真' fallback
  - `handleGuestAgent`: keyword check expanded with `活动跟拍`/`跟拍`; type matching uses hint-based approach

### Longrun Docs (12 files)
- `longrun-heartbeat.md` — append heartbeat logs (rounds 053-054, publish watcher events)
- `longrun-status.json` — new status tracking file
- `publish/publish-round027-output.md` — updated with re-run details
- `publish/publish-round052-task.md` — new round task definition
- `publish/publish-round052-claude.log.err` — new (empty) error log
- `publish/publish-state.json` — new publish state tracking
- `publish/run-publish-watcher.ps1` — new watcher script
- `publish/run-publish-worker.ps1` — new worker script
- `rounds/round053-output.md` — new round output
- `rounds/round054-task.md` — new round task
- `run-longrun.ps1` — new longrun orchestrator script
- `test-results/round053-checks.md` — new test results

## Safety Checks
- **Secret scan**: Passed — no secrets, API keys, tokens, or credentials in diff
- **Deletions**: None
- **Renaming**: None
- **`.env`/secrets files**: None staged
- **Doc preservation**: All existing README/docs/history preserved; only append-only changes

## Documentation Change Type
- Append-only (heartbeat logs, new round files)
- Incremental repair (publish-round027-output.md update, guest_helper.js fixes)

## Remaining Risks
- `gh auth` keyring token is invalid — `gh` CLI commands (repo edit, release create) won't work until `gh auth login -h github.com` is run. Git push via HTTPS works fine with cached credentials.
