Publish Round 027 complete.

**Summary:**

- **Skill read**: publish-github-open-source v0.3.2
- **Safety checks**: No hardcoded secrets (only `process.env` reads), no `.env`/`node_modules`/`project.private.config.json` in staging, no deletions, `node --check` passes
- **Files committed** (7 files, 93 insertions, 100 deletions):
  - `work_ai_service.js` 鈥?date parsing ISO datetime tail strip
  - `work_pet.wxml` 鈥?`wx:key` fix (`fileID` 鈫?`index`)
  - `publish-round027-output.md` 鈥?restored full detailed report (replacing minimal summary)
  - `round029-output.md`, `round030-task.md`, `round029-checks.md` 鈥?new longrun docs
  - `longrun-heartbeat.md` 鈥?append Round 029/030 log entries
- **Commits**: `9a5217e` (main) + `e9a99f3` (report hash update)
- **Push**: `14e9319..e9a99f3 main -> main` 鈥?success
- **Remote verification**: `e9a99f3` matches local HEAD
- **GitHub**: https://github.com/lychee20000105/photography-studio-schedule-miniprogram
- **Documentation change type**: `publish-round027-output.md` restored (not a content rewrite); all other docs append-only or new
- **Remaining risks**: Round 030 still in progress (output/checks uncommitted); `publish-watcher.log.err` empty (low risk)

