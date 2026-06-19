Round 053 complete. Here's what was fixed:

**4 bugs fixed in `guest_helper.js`:**

1. **`_parseCustomer` name-before-type** 鈥?"6鏈?0鏃?缃楅泤 澶栨櫙鍐欑湡 閲戦299" now correctly extracts "缃楅泤" as the customer name. Previously, branch 3 only captured names AFTER the type keyword, so "閲戦299" was incorrectly captured. Added a new regex branch with 2-3 char CJK match + lookahead for type keywords + exclusion list for non-name words.

2. **`_parseCustomer` verb false match on "鍟嗘媿"** 鈥?The `鎷峘 verb matched the "鎷? in "鍟嗘媿", capturing "鍟? as customer name. Extended lookbehind from `(?<!璺?` to `(?<![璺熷晢])`.

3. **`_normalizeType` opinionated fallback** 鈥?Removed the `indexOf('鍐欑湡')` fallback that always mapped unrecognized types (like "鐧炬棩瀹?) to "澶栨櫙鍐欑湡". Now defaults to `types[0]`.

4. **Keyword check missing "娲诲姩璺熸媿"/"璺熸媿"** 鈥?Text containing these type names now passes the keyword check and creates orders correctly.

**Validation**: 10/10 functional tests pass, both JS files pass syntax check. Reports written to `rounds/round053-output.md` and `test-results/round053-checks.md`.

