**Round 032 complete.** Here's the summary:

### Bug fixed: `_cleanDate` regex truncation + Chinese date+time handling

**`work_ai_service.js`** 鈥?Two issues in the date cleaning pipeline:

1. **Round 030 regression:** The regex `/(\d{4}[-/.骞碷\d{1,2}[-/.鏈圿\d{1,2})\d.*/` was truncating clean dates like "2026-06-20" to "2026-06-2" because `\d{1,2}` backtracks 鈥?matching only "2" for the day and treating "0" as the trailing `\d`. Fixed by requiring a colon after trailing digits: `\d+[:锛歖.*$`.

2. **New discovery:** Chinese date+time formats like "2026骞?鏈?0鏃?4:00" or "6鏈?0鍙蜂笂鍗?0鐐? were not handled 鈥?`鏃/`鍙穈 between the date and time digits prevented the trailing-digits regex from matching, and normalization ran too late. Added `.replace(/([鏃ュ彿])\s*[\d涓€-榫[\s\S]*$/, '$1')` to strip time after 鏃?鍙?before normalization.

Verified with 14 test cases covering all date formats. Both files pass `node -c` syntax checks.

### UX improvement: Longpress to copy chat messages

**`work_pet.wxml`** + **`work_pet.js`** 鈥?Added `bindlongpress` on chat bubbles to copy message content via `wx.setClipboardData`. Useful for copying order details, schedules, and error messages from AI replies.

### Files changed
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js`
- `miniprogram/cmpts/work_pet/work_pet.wxml`
- `miniprogram/cmpts/work_pet/work_pet.js`
- Reports: `rounds/round032-output.md`, `test-results/round032-checks.md`, heartbeat updated

