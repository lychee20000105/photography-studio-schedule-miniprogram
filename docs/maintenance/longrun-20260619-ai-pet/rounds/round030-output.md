Round 030 complete. Here's the summary:

**Files changed:**
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js` 鈥?1 line added
- `miniprogram/cmpts/work_pet/work_pet.wxml` 鈥?1 line changed
- `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` 鈥?heartbeat updated
- Reports written to `rounds/round030-output.md` and `test-results/round030-checks.md`

**Bugs fixed:**

1. **`_cleanDate` datetime-without-separator fallback** 鈥?Round 028 fixed `T`-separated and space-separated ISO datetimes, but a gap remained for strings like `2026-06-2014:00` where time digits are directly appended. Added `.replace(/(\d{4}[-/.骞碷\d{1,2}[-/.鏈圿\d{1,2})\d.*/, '$1')` to strip trailing digits after a complete date pattern.

2. **Attachment preview `wx:key` for guest images** 鈥?`wx:key="fileID"` failed for guest images (empty `fileID`), causing only the first attachment to render. Changed to `wx:key="index"`.

**Validation:** Both `work_ai_service.js` and `work_pet.js` pass `node -c` syntax checks.

