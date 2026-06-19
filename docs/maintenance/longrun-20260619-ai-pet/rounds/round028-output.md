**Round 028 complete.** Two fixes applied to `work_ai_service.js`:

1. **`_handleAgentReply` `create_orders` fallback** 鈥?When the LLM uses `create_orders` action but doesn't provide an `orders` array (puts data directly in `action.data`), it now falls back to `_agentCreateOrder` instead of throwing "AI鎵归噺鏂板璁㈠崟缂哄皯璁㈠崟鍒楄〃". This mirrors the existing reverse fallback (`create_order` with batchOrders 鈫?`_agentCreateOrders`) on the adjacent line.

2. **`_cleanDate` ISO datetime stripping** 鈥?Handles `date: "2026-06-20T14:00"` and `date: "2026-06-20 14:30"` formats by stripping time portions before date regex matching. Previously these would corrupt to `"2026-06-2014:00"` after whitespace removal and fail all regex matches.

Validation: both `work_ai_service.js` and `work_pet.js` pass `node -c` syntax checks. Reports written to `rounds/round028-output.md` and `test-results/round028-checks.md`.

