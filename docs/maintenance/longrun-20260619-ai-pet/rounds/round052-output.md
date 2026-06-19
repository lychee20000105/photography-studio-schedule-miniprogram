Round 052 complete. Here's the summary:

**Bug fixed: `_parseCustomer` regex captured title suffixes and verbs as part of customer name**

Three related improvements in `guest_helper.js`:

1. **Non-greedy capture** `{1,3}?` 鈥?"缁欑綏闆呭璁板綍" now correctly extracts "缃楅泤" instead of "缃楅泤濮?, "缁欑綏闆呮媿鍐欑湡" extracts "缃楅泤" instead of "缃楅泤鎷?

2. **Cleaned verb list** 鈥?Removed type-keyword overlaps (澶栨櫙|鍐欑湡|濠氱ぜ|鍟嗘媿|娲诲姩) from verb alternation. Added `(?<!璺?` lookbehind on 鎷?to prevent "璺熸媿" false matches while keeping standalone "鎷? working.

3. **Type-keyword lookbehind** 鈥?Added `(?<![涓€-\d])` to prevent type keywords from matching after Chinese chars/digits.

**Validation**: 18/19 tests pass (11 customer + 5 date + 2 amount). The 1 remaining failure ("6鏈?0鏃?缃楅泤 澶栨櫙鍐欑湡 閲戦299" 鈫?"閲戦299") is pre-existing 鈥?original code also fails this.

**Files changed**: Only `miniprogram/helper/guest_helper.js` (4 lines in `_parseCustomer`). Both JS files pass `node -c` syntax check.

Reports written to `rounds/round052-output.md` and `test-results/round052-checks.md`.

