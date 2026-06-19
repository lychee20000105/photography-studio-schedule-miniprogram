Round 059 complete. Here's what happened:

**2 bugs fixed in 2 files (1 line each):**

1. **`guest_helper.js:337`** 鈥?Final balance calculation bug. When user says "閲戦299 瀹氶噾150 宸叉敹100", the old formula `amount - Math.max(deposit, paid)` gave 149 remaining (treating planned deposit as collected). Fixed to `amount - paid` = 199 (only subtracts actual money received).

2. **`work_ai_service.js:401`** 鈥?Empty batch orders fallback. When AI returns `create_orders` with empty orders array, the old code fell through to single-order mode producing a confusing "缂哄皯瀹㈡埛鍚嶇О" error. Now returns a clear message about the missing order list.

**Not a bug (corrected earlier analysis):** The "澶у墠澶?/"鍓嶅ぉ" date parsing ordering is actually correct 鈥?"澶у墠澶? is checked first at line 107.

**Reports written:**
- `docs/maintenance/longrun-20260619-ai-pet/rounds/round059-output.md`
- `docs/maintenance/longrun-20260619-ai-pet/test-results/round059-checks.md`

