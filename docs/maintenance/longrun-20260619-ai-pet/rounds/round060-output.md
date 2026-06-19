**Round 060 complete.**

**Bug fixed (regression from round 059):** `guest_helper.js:337` 鈥?灏炬(final) calculation was ignoring deposit. When user says "閲戦299 瀹氶噾150 宸叉敹100", the old code computed final = 299-100 = 199 (wrong, same as unpaid balance). Fixed to 299-150 = 149 (correct: deposit 150 + final 149 = 299).

**Files changed:** `miniprogram/helper/guest_helper.js` only (1 line)

**Validation:** Both `guest_helper.js` and `work_ai_service.js` pass `node -c` syntax check.

**Reports written:**
- `docs/maintenance/longrun-20260619-ai-pet/rounds/round060-output.md`
- `docs/maintenance/longrun-20260619-ai-pet/test-results/round060-checks.md`

