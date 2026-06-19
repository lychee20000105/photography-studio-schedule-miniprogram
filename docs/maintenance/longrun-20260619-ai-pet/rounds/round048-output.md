Round 048 complete.

**Bug found and fixed:** When the AI chat call fails, attached images (screenshots) were lost. Round 046 fixed restoring the input text on error, but `chatAttachments` was still cleared. For screenshot-based order entry, users had to re-attach all images after a failure.

**Fix:** 2 lines in `work_pet.js` 鈥?save `originalAttachments` before clearing, restore both `chatInput` and `chatAttachments` on error.

**Files changed:** `miniprogram/cmpts/work_pet/work_pet.js`

**Validation:** All 3 core JS files pass `node -c` syntax check. Reports written to `rounds/round048-output.md` and `test-results/round048-checks.md`.

