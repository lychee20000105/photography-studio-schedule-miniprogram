**Round 061 complete.** Two changes made:

1. **Bug fix 鈥?date context false positive** (`work_ai_service.js`): The `_hasRelativeDateContext()` fallback regex matched nouns like "璁㈠崟" and "鎷嶆憚" anywhere in the message, so casual queries like "鏄ㄥぉ鐨勮鍗曟€庝箞鏍蜂簡" would incorrectly trigger relative date extraction. Tightened the fallback to only match scheduling action verbs (璁板綍/鏂板/鐧昏/瀹夋帓/褰曞叆/鍒涘缓/娣诲姞/璇峰亣/浼戞伅), removing ambiguous nouns.

2. **UX improvement 鈥?guest mode screenshot guard** (`work_pet.js`): When a guest user taps "鎴浘褰曞崟", they previously went through image selection only to get a terse rejection. Now the guest check happens upfront and shows a helpful message with a working text example instead.

All three key JS files pass `node -c` syntax validation. Reports written to `rounds/round061-output.md` and `test-results/round061-checks.md`.

