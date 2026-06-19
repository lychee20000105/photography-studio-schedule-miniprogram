**Round 070 complete.** 4 bugs fixed across 2 files:

| # | Severity | File | Bug | Fix |
|---|----------|------|-----|-----|
| 1 | **High** | work_ai_service.js:480-491 | `_extractSingleTextDate` cross-year block ran unconditionally after day-range heuristics, overwriting correct year (e.g. "12鏈?8鏃? in June 鈫?wrongly 2027 instead of 2025) | `if` 鈫?`else if` for mutual exclusivity |
| 2 | **High** | work_ai_service.js:701-711 | Same cross-year double-correction in `_cleanDate` (fallback parser used everywhere) | Same `if` 鈫?`else if` fix |
| 3 | Medium | work_ai_service.js:759 | `_amount()` returned 0 for "199鍏?, "锟?99", "楼199" 鈥?silently dropped monetary values | Added `.replace(/[楼锟ュ厓\s]/g, '')` |
| 4 | Medium | guest_helper.js:210 | `_parseCustomer` CJK upper bound was `\u9be5` instead of `\u9fa5` 鈥?failed for names with characters in that range | Fixed to `\u9fa5` |

All 4 JS files pass `node -c` syntax validation. Reports written to `rounds/round070-output.md` and `test-results/round070-checks.md`.

