**Round 037 complete.**

**Bug found and fixed:** `_parseAmount` in `guest_helper.js` used `[^0-9]{0,12}` between keyword and number in its regex, allowing the pattern to match across unrelated keywords. For example, `_parseAmount("鎬讳环 宸叉敹100", ['鎬讳环'])` incorrectly returned 100 (capturing the "宸叉敹" amount) instead of 0.

**Fix:** Changed regex from `name + '[^0-9]{0,12}(\\d+...)'` to `name + '\\s*(\\d+...)'` 鈥?only spaces allowed between keyword and number.

**Files changed:** 1 line in `miniprogram/helper/guest_helper.js`

**Validation:**
- Both `guest_helper.js` and `work_pet.js` pass `node -c`
- 9/9 unit tests pass (3 confirming old code was buggy)
- Git diff confirms only the intended 1-line change

**Reports written:**
- `rounds/round037-output.md`
- `test-results/round037-checks.md`
- `longrun-heartbeat.md` updated

