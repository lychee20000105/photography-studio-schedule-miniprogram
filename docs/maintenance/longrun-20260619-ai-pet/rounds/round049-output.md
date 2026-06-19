Round 049 complete. Two bugs fixed in `guest_helper.js`:

1. **`final` fallback double-counted deposit** (line 328): When user said "閲戦299 瀹氶噾100 宸叉敹100", old code computed `299 - 100 - 100 = 99` (wrong). Fixed to `299 - max(100, 100) = 199` (correct), since `paid` already includes the deposit.

2. **`_parseAmount` failed on comma-separated numbers** (line 198): "閲戦2,999" wouldn't parse. Fixed regex to capture commas, letting `_money()` strip them downstream.

All 3 core JS files pass `node -c` syntax check. Reports written to `rounds/round049-output.md` and `test-results/round049-checks.md`.

