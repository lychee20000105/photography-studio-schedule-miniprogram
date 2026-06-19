**Round 033 complete.** 

**Fix applied:** Scroll timer leak in `bindChatClose` 鈥?when closing the chat panel, two `setTimeout` timers from `_scrollChatToBottom` were not cleared, causing stale `setData` calls on a hidden component. Added `clearTimeout` for both `_scrollTimer1` and `_scrollTimer2` at the start of `bindChatClose`, matching the cleanup pattern already used in the `detached()` lifecycle.

**Files changed:**
- `miniprogram/cmpts/work_pet/work_pet.js` 鈥?2 lines added
- `docs/maintenance/longrun-20260619-ai-pet/longrun-heartbeat.md` 鈥?heartbeat entry
- Reports: `rounds/round033-output.md`, `test-results/round033-checks.md`

**Validation:** Both `work_pet.js` and `work_ai_service.js` pass `node -c` syntax checks. Git diff confirms only the intended 2-line change in `work_pet.js`.

**Code review performed:** Thoroughly analyzed the full date parsing pipeline, batch order creation, payment parsing, chat UX, and all round 030-032 fixes 鈥?all intact with no regressions found.

