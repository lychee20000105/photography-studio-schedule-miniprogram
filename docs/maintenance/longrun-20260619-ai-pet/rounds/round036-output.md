**Round 036 complete.**

**Bug found and fixed in `guest_helper.js`:**

"鏈敹" (uncollected) and "寰呮敹" (pending collection) were incorrectly parsed as the "灏炬" (final/contracted payment) amount in the guest mode order creation flow. These keywords represent money NOT yet received, not a contracted payment structure.

**What changed (3 lines):**
1. Removed '鏈敹' and '寰呮敹' from the `final` keyword list (only '灏炬' remains)
2. Added fallback: `if (!final && amount) final = Math.max(0, amount - deposit - paid)` 鈥?computes the implicit final payment from total minus deposit minus paid

**Example fix:**
- Input: "閲戦299 宸叉敹100" 鈫?Before: `ORDER_FINAL=0` / After: `ORDER_FINAL=199` (correct, computed from 299-0-100)
- Input: "閲戦299 宸叉敹100 鏈敹199" 鈫?Before: `ORDER_FINAL=199` (wrong, 199 is unpaid not 灏炬) / After: `ORDER_FINAL=199` (correct, computed as fallback)

**Validation:** All 3 JS files pass `node -c`, WXSS braces balanced (162/162), WXML tags balanced (75 views, 2 scroll-views, 42 texts).

**Reports written:**
- `rounds/round036-output.md`
- `test-results/round036-checks.md`
- `longrun-heartbeat.md` updated

