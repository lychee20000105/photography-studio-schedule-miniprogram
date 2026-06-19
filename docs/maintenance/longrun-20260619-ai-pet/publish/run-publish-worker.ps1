param(
  [Parameter(Mandatory=$true)][int]$Round,
  [int]$TimeoutSeconds = 1800
)

$ErrorActionPreference = "Continue"
$publishDir = $PSScriptRoot
$base = Split-Path -Parent $publishDir
$repo = Resolve-Path (Join-Path $base "..\..\..")
$heartbeat = Join-Path $base "longrun-heartbeat.md"
$roundId = "{0:D3}" -f $Round
$taskPath = Join-Path $publishDir "publish-round$roundId-task.md"
$outputPath = Join-Path $publishDir "publish-round$roundId-output.md"
$logPath = Join-Path $publishDir "publish-round$roundId-claude.log"
$errPath = "$logPath.err"

function Write-Heartbeat([string]$Message) {
  Add-Content -LiteralPath $heartbeat -Value ("- {0} {1}" -f (Get-Date -Format s), $Message) -Encoding UTF8
}

@"
Use the local Codex skill publish-github-open-source before acting.

Repository: $repo
Round to publish: $roundId
Skill path: C:\Users\Administrator\.codex\skills\publish-github-open-source\SKILL.md

Task:
1. Read the publish-github-open-source skill and follow it.
2. Perform a secret/diff safety check before any external sync.
3. Preserve existing README/docs/history; only append or minimally repair.
4. GitHub sync only. Do not npm publish.
5. Commit only relevant current changes. Do not permanently delete files.
6. Push to origin/main when safe.\n7. Create or update a GitHub Release for the pushed commit using the real project version from miniprogram/version.js current (cross-check CHANGELOG.md). Do not invent round-based or semver-only tags; use v<current>, e.g. v1.71.\n8. Write a concise report with commit hash, push result, version source, release URL, and any blocked reason to: $outputPath

Context:
- This is a fresh Claude publish worker for one completed version round.
- If push or release creation is blocked, record the blocker in the report and exit; do not loop.
"@ | Set-Content -LiteralPath $taskPath -Encoding UTF8

Write-Heartbeat "Publish worker for Round $roundId started with stdin prompt and timeout ${TimeoutSeconds}s."
$job = Start-Job -ScriptBlock {
  param($RepoPath, $TaskPath, $LogPath, $ErrPath)
  Set-Location $RepoPath
  $prompt = Get-Content -LiteralPath $TaskPath -Raw
  $prompt | claude --permission-mode auto -p 1> $LogPath 2> $ErrPath
  return $LASTEXITCODE
} -ArgumentList $repo.Path, $taskPath, $logPath, $errPath

$finished = Wait-Job -Id $job.Id -Timeout $TimeoutSeconds
if (!$finished) {
  Stop-Job -Id $job.Id -Force -ErrorAction SilentlyContinue
  $report = @"
Round $roundId publish worker timed out after ${TimeoutSeconds}s before completing.

Result: blocked by Claude worker timeout.
Push result: no push attempted/confirmed by this worker.
Next action: supervisor should inspect git status and either retry with a narrower prompt or publish manually after the required secret/diff safety checks.
"@
  $report | Set-Content -LiteralPath $outputPath -Encoding UTF8
  Write-Heartbeat "Publish worker for Round $roundId timed out."
  Remove-Job -Id $job.Id -Force -ErrorAction SilentlyContinue
  exit 124
}

$exitCode = Receive-Job -Id $job.Id -ErrorAction SilentlyContinue | Select-Object -Last 1
Remove-Job -Id $job.Id -Force -ErrorAction SilentlyContinue
Write-Heartbeat "Publish worker for Round $roundId exited with code $exitCode."
if (!(Test-Path -LiteralPath $outputPath)) {
  @"
Round $roundId publish worker exited with code $exitCode, but did not write a structured report.

See log: $logPath
See stderr: $errPath
"@ | Set-Content -LiteralPath $outputPath -Encoding UTF8
}
if ($exitCode -is [int]) { exit $exitCode }
exit 0


