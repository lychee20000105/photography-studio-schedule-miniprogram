$ErrorActionPreference = 'Stop'
$objective = Get-Content -LiteralPath 'W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance\agent-upgrade-longrun-20260620-033431\supervisor-objective.md' -Raw -Encoding UTF8
& 'C:\Users\Administrator\.codex\skills\claude-longrun-supervisor\scripts\start_decomposed_longrun_supervisor.ps1' `
  -Repo 'W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo' `
  -Objective $objective `
  -Hours 12 `
  -OutputRoot 'W:\微信小程序\yunyu-sheying-schedule-miniprogram-github-20260605193240\repo\docs\maintenance\agent-upgrade-longrun-20260620-033431' `
  -StatusCheckMinutes 20 `
  -FastStatusCheckMinutes 5 `
  -QuietStatusCheckMinutes 30 `
  -AuditEveryBatches 1 `
  -MaxParallelWorkers 0 `
  -ClaudeCommand 'claude'
