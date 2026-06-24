# Claude CLI Worker Round 1 (fix-verify)

## Objective

Continue the existing free-first AI agent upgrade longrun for this WeChat miniapp repo.

Context:
- Existing run directory: docs/maintenance/agent-upgrade-claude-worker-20260620-033624
- Existing final-summary.md was generated too early.
- bug-hunt-1000-counter.json still shows 418/1000 checks and fixedCount 17.
- User requirement is NOT satisfied until >=1000 bug-hunt checks are evidenced, fixes are applied where safe, version/changelog/git records are updated, and a final completion summary proves all requirements.

Your task:
1. Resume from the existing 418 checks; do at least 582 additional distinct bug-hunt checks, preferably more, across frontend, cloud functions, AI service, prompt safety, free-model routing, storage/session, data validation, UX, performance, compatibility, and admin flows.
2. For every real bug found, implement minimal root-cause fixes in repo files. Do not delete user files. Do not expose secrets.
3. Keep evidence lightweight but auditable: update docs/maintenance/agent-upgrade-claude-worker-20260620-033624/bug-hunt-1000-counter.json to completedChecks >= 1000; append details into rounds/ and longrun-progress.md.
4. If code changes are made, update version/changelog if appropriate and commit meaningful stages with git.
5. Replace/update final-summary.md only after the counter is >=1000 and git status is intentionally handled. The final summary must explicitly list evidence for: plan optimization, project upgrade, version/git record, >=1000 bug checks, fixes applied, validation performed, remaining risks.
6. Be free-first: do not add paid dependencies or require a paid model; preserve current free API model path and add fallbacks only if free/optional.
7. Run local static/syntax checks that are feasible without external paid services. If a check cannot run, document why.

Important: Continue autonomously. Do not stop at 418. Do not call the task complete until evidence proves >=1000 checks.


## Repo

W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo

## Output Root

W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance

## Current Mode

fix-verify

## Recent Outputs

- none

## Rules

- You are Claude CLI, the fixed local worker.
- Do the dirty work: inspect files, run commands, edit local files when useful, install dependencies if needed, search the web if needed, and write records.
- Whoever modifies files must document the modification in this round.
- Keep work local unless explicitly authorized.
- Do not upload, deploy, publish, push, permanently delete, write secrets, mutate production data, or run destructive Git commands.
- If changing system-level config, record old value, new value, reason, validation, and rollback in system-config-changes.md before/with the change.
- If committing, commit only focused relevant changes and document the commit.

## Task

1. Read 	oken-budget-summary.json first. Then read only esume-prompt.md, longrun-progress.md, recent output digests, and recent test result summaries needed for the next task.
2. Decide a small useful next task aligned with the objective and current mode.
3. Execute it locally.
4. Run relevant validation.
5. Write round output to this same output file's intended path via stdout and update maintenance files.
6. Include pass/fail counts, modified files, commands, risks, and next-round recommendation.

## Required stdout shape

Start stdout with this compact block and keep it under 1200 characters:

`md
## Supervisor Digest
- Decision needed: none|supervisor|user
- Changed files: ...
- Validation: pass|fail|not-run + commands
- Publish: not attempted|pushed|blocked
- Blockers: ...
- Next: continue|rework|audit|drain|stop
`

Then include details below the digest:

- Whether code/config/docs changed.
- Modified files.
- Commands run.
- Validation results.
- Risks.
- Next recommended task.
