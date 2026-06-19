**Round 029 complete.** Three fixes applied:

1. **`trimMessages` data loss** (work_pet.js:146) 鈥?Assistant replies were clipped to 800 chars; cloud returns up to 4000. Now assistant messages preserve 4000 chars, user messages stay at 800.

2. **Action whitelist hardening** (work_ai_service.js:382) 鈥?`_pickJsonObject` could extract JSON examples from AI explanation text and execute them as real write operations. Added `VALID_ACTIONS` whitelist; unrecognized actions are now treated as plain replies.

3. **Batch order calendar refresh** (work_pet.js:723) 鈥?For batch orders spanning multiple dates, calendar now jumps to the earliest date (`dates.sort()[0]`) instead of the first-created order's date.

Both files pass `node -c` syntax checks. Reports written to `rounds/round029-output.md` and `test-results/round029-checks.md`.

