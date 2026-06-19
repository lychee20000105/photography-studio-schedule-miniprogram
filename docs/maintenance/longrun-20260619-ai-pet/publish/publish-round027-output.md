Publish Round 027 complete.

**Summary:**

-- **Skill read**: publish-github-open-source v0.3.2
-- **Safety checks**: No hardcoded secrets (only `process.env` reads), no `.env`/`node_modules`/`project.private.config.json` in staging, no deletions, `node --check` passes
-- **Files committed** (7 files, 93 insertions, 100 deletions):
  - `work_ai_service.js` -- date parsing ISO datetime tail strip
  - `work_pet.wxml` -- `wx:key` fix (`fileID` -> `index`)
  - `publish-round027-output.md` -- restored full detailed report (replacing minimal summary)
  - `round029-output.md`, `round030-task.md`, `round029-checks.md` -- new longrun docs
  - `longrun-heartbeat.md` -- append Round 029/030 log entries
-- **Commits**: `9a5217e` (main) + `e9a99f3` (report hash update)
-- **Push**: `14e9319..e9a99f3 main -> main` -- success
-- **Remote verification**: `e9a99f3` matches local HEAD
-- **GitHub**: https://github.com/lychee20000105/photography-studio-schedule-miniprogram
-- **Documentation change type**: `publish-round027-output.md` restored (not a content rewrite); all other docs append-only or new
-- **Remaining risks**: Round 030 still in progress (output/checks uncommitted); `publish-watcher.log.err` empty (low risk)

---

## Second Publish Run (2026-06-19)

**Skill read**: publish-github-open-source v0.3.2

**Safety checks**:
- `work_ai_service.js` grep: only `process.env` references, no hardcoded secrets
- New docs files scan: no sensitive data
- `node --check work_ai_service.js`: syntax OK
- No `.env`, databases, logs, caches or user data in staging

**Files committed** (8 files, 130 insertions, 62 deletions):
- `work_ai_service.js` -- assistant message text limit 800->4000
- `longrun-heartbeat.md` -- heartbeat update
- `publish-round027-output.md` -- this report
- `round030-output.md`, `round031-output.md`, `round031-task.md` -- new longrun docs
- `round030-checks.md`, `round031-checks.md` -- new test results

**Commit**: `edca536` (main)
**Message**: `Update longrun Round 027/030/031 docs and fix work_ai chat history limit`
**Push**: `e9a99f3..edca536 main -> main` -- success
**Remote verification**: `edca536` matches local HEAD
**GitHub**: https://github.com/lychee20000105/photography-studio-schedule-miniprogram
**Documentation change type**: append-only (new docs added, no deletions or overwrites)
**Remaining risks**: none

---

## Third Publish Run (2026-06-19)

**Skill read**: publish-github-open-source v0.3.2

**Safety checks**:
- Secret scan on modified files (`longrun-heartbeat.md`, `publish-round027-output.md`): no secrets found
- Untracked files: none
- Staged files: none (all changes in working directory)

**Files to commit** (2 files):
- `longrun-heartbeat.md` -- append 2 new heartbeat log entries (publish watcher error + publish worker restart)
- `publish-round027-output.md` -- fixed mojibake encoding, restored historical detailed reports (replacing garbled Chinese text that had overwritten English content)

**Documentation change type**: encoding repair (mojibake replaced with correct content); historical reports preserved

**Commit**: `f2f33d4` (main)
**Message**: `Fix publish-round027 report mojibake and append heartbeat entries`
**Push**: `535dec0..f2f33d4 main -> main` -- success
**Remote verification**: `f2f33d4` matches local HEAD
**GitHub**: https://github.com/lychee20000105/photography-studio-schedule-miniprogram

**Remaining risks**: none
