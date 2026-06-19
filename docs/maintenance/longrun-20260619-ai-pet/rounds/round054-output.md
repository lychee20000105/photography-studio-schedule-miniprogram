Round 054 complete. Here's a summary of what was done:

**3 fixes in `guest_helper.js`:**

1. **`_parseAmount` colon handling** 鈥?Changed regex from `\s*` to `[\s锛?]*` so "閲戦锛?99" and "瀹氶噾锛?00" parse correctly. Previously all amounts returned 0 when colons were used.

2. **`handleGuestAgent` type shorthand matching** 鈥?Replaced strict `text.indexOf(TYPE_NAME)` with a keyword extraction list + `_normalizeType()` fuzzy matching. "鍐欑湡" now correctly maps to "澶栨櫙鍐欑湡" instead of falling back to the wrong default.

3. **`_normalizeType` alias map** 鈥?Added `{ '鍟嗕笟鎷嶆憚': '鍟嗘媿' }` so expanded type names resolve correctly.

**Validation:** 28/29 functional tests pass (1 failure is pre-existing). Syntax check clean.

**Reports written:**
- `rounds/round054-output.md`
- `test-results/round054-checks.md`

