**Round 027 complete.** Two fixes applied to `work_ai_service.js`:

1. **`_extractSpecificTextDate` 缂哄皯閲忚瘝瀹堝崼鍜屽勾浠借寖鍥存牎楠?* 鈥?鏈?鏃ユ鍒欐柊澧?`(?![寮犳潯浣嶄釜鍚嶇粍鎵规濂椾欢])` 闃叉"3鏈?寮?璇尮閰嶏紱鍏ㄦ棩鏈熷垎鏀柊澧?year 1990-2099 鑼冨洿鏍￠獙锛涙湀-鏃ュ垎鏀柊澧?month/day 鑼冨洿鏍￠獙銆?
2. **`_extractWeekdayTextDate` 涓?`_resolveWeekdayFromText` 閲嶅閫昏緫** 鈥?鎻愬彇鍏变韩鏂规硶 `_computeWeekdayOffset(text, maxLen, requireContext)`锛屼袱涓師鏂规硶鍙樹负鍗曡濮旀墭璋冪敤銆?
楠岃瘉锛? 鏂囦欢璇硶妫€鏌ラ€氳繃锛?9 缁勫姛鑳芥祴璇曞叏閮ㄩ€氳繃锛?3 缁?`_extractSpecificTextDate` + 6 缁?`_computeWeekdayOffset`锛夈€?
鎶ュ憡宸插啓鍏?`rounds/round027-output.md` 鍜?`test-results/round027-checks.md`銆?

