Round 041 complete. Here's the summary:

**Bug found and fixed: Date parsing year-rollover for cross-year month-day references**

When someone says "12鏈?1鏃? in January or February, the `_parseDate` (guest mode) and `_extractSingleTextDate` (cloud AI) functions incorrectly pointed to the *upcoming* December instead of the *recent past* December. For example, "12鏈?1鏃? on Jan 5 returned 2027-12-31 (360 days away) instead of 2026-12-31 (5 days ago).

**Root cause:** Both functions start with `year = now.getFullYear()` and only use a 30-day backward threshold. For December dates in January, the candidate is a future date (Dec of this year), so the backward check never triggers.

**Fix:** Added a secondary check in both files 鈥?when the candidate is >183 days in the future, check if last year's occurrence is within 45 days of today. If so, use the previous year.

**Files changed (1 line each):**
- `miniprogram/helper/guest_helper.js` line 156
- `cloudfunctions/mcloud/project/B00/service/work_ai_service.js` line 469

**Validation:** JS syntax 3/3 OK, WXSS 162/162, WXML balanced, 14/14 date rollover tests passed. Reports written to `rounds/round041-output.md` and `test-results/round041-checks.md`.

