**Round 069 complete.**

**Bug fixed:** In `work_pet.js:611`, `_scrollChatToBottom()` was called unconditionally after an async AI response. If the user switched to a different chat thread during the wait, the currently-viewed thread got force-scrolled to the bottom, disrupting the user's reading position. Moved the call inside the `_stillSameThread` guard.

**Files changed:** `miniprogram/cmpts/work_pet/work_pet.js` 鈥?1 line moved.

**Validation:** All 4 key JS files pass `node -c` syntax checks. Reports written to `rounds/round069-output.md` and `test-results/round069-checks.md`.

