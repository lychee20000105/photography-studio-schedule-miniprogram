# Longrun Final Summary - XiaoMao AI maintenance

Window: 2026-06-19 to 2026-06-20 01:19 CST
Project: W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo

## Result

The scheduled longrun is finished. The run focused on XiaoMao / Work Pet AI order entry, screenshot/date/payment parsing, guest-mode local order creation, multi-session chat safety, and small UX reliability fixes.

## Main fixes delivered

- Screenshot/order date fallback: page context date is used only when AI output lacks a valid explicit date.
- Payment enum normalization: Chinese/free-text payment types are normalized to allowed backend enum values before persistence.
- Guest order parsing: improved customer name extraction, type aliases, shorthand matching, amount parsing, and false-capture guards.
- Date parsing: fixed relative week handling, previous-week support, cross-year correction, and double-adjustment cases.
- JSON extraction: replaced fragile last-brace extraction with balanced-brace parsing in AI response handling.
- Multi-session chat safety: guarded async AI replies and scroll-to-bottom behavior so switching threads does not corrupt another thread.
- Admin AI context estimation: added Claude hyphenated model names and Claude 4 family matching.
- Release workflow: publish workers now use the real project version from miniprogram/version.js and CHANGELOG.md.

## Validation evidence

- Repeated syntax checks passed for key files:
  - cloudfunctions/mcloud/project/B00/service/work_ai_service.js
  - miniprogram/cmpts/work_pet/work_pet.js
  - miniprogram/helper/guest_helper.js
  - miniprogram/projects/B00/pages/work/admin_ai/work_admin_ai.js
  - miniprogram/setting/setting.js
  - miniprogram/version.js
- Focused functional regression cases passed for:
  - money extraction with symbols/noise
  - guest customer-name extraction
  - missing-customer rejection
  - guest shorthand type matching
  - screenshot/date fallback behavior through worker reports

## Release status

- Real version advanced to v1.72 based on project version rules.
- GitHub Release v1.72 should be the latest official release.
- Earlier accidental v1.56.0 is marked as a pre-release/superseded record.

## Remaining operational notes

- Code and release are synchronized to GitHub.
- The mini program and mcloud cloud function were not deployed from this run; this run only changed and published source code.
