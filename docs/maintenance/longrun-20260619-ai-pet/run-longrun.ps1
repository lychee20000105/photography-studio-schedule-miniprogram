param(
  [string]$DeadlineAt = "2026-06-20T01:01:40",
  [int]$MaxRounds = 999,
  [int]$NormalSleepSeconds = 600,
  [int]$FastSleepSeconds = 180
)

$ErrorActionPreference = "Continue"
$base = $PSScriptRoot
$repo = Resolve-Path (Join-Path $base "..\..\..")
$roundsDir = Join-Path $base "rounds"
$logsDir = Join-Path $base "logs"
$testsDir = Join-Path $base "test-results"
$heartbeat = Join-Path $base "longrun-heartbeat.md"
$statusPath = Join-Path $base "longrun-status.json"

New-Item -ItemType Directory -Force -Path $roundsDir, $logsDir, $testsDir | Out-Null

function Write-Heartbeat([string]$Message) {
  $line = "- {0} {1}" -f (Get-Date -Format s), $Message
  Add-Content -LiteralPath $heartbeat -Value $line -Encoding UTF8
}

function Get-LatestRoundNumber([string]$Pattern) {
  $items = Get-ChildItem -LiteralPath $roundsDir -Filter $Pattern -ErrorAction SilentlyContinue
  $numbers = @()
  foreach ($item in $items) {
    if ($item.BaseName -match '^round(\d+)-') { $numbers += [int]$Matches[1] }
  }
  if ($numbers.Count -eq 0) { return 0 }
  return ($numbers | Measure-Object -Maximum).Maximum
}

function Write-Status([int]$Round, [string]$Phase, [int]$NextDelaySeconds) {
  $status = [ordered]@{
    status = "running"
    phase = $Phase
    currentRound = $Round
    deadlineAt = $DeadlineAt
    updatedAt = (Get-Date -Format s)
    nextSuggestedSupervisorCheckAt = (Get-Date).AddSeconds($NextDelaySeconds).ToString("s")
    supervisorCheckPolicy = "adaptive: 20-30min normally; 5-10min only after fresh bug, failed worker, empty round, or final audit"
    chatOutputPolicy = "quiet: do not stream every patrol; report only new user-facing bug, publish failure/success that needs attention, or final audit"
    githubPublishPolicy = "watch completed version rounds; if git has publishable changes, spawn one fresh Claude publish worker using publish-github-open-source; GitHub only, no npm"
  }
  $status | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statusPath -Encoding UTF8
}

$deadline = [DateTime]::Parse($DeadlineAt)
Set-Location $repo
Write-Heartbeat "Longrun script resumed with adaptive polling."

while ((Get-Date) -lt $deadline) {
  $latestTask = Get-LatestRoundNumber "round*-task.md"
  $latestOutput = Get-LatestRoundNumber "round*-output.md"
  $round = [Math]::Max($latestTask, $latestOutput) + 1
  if ($round -gt $MaxRounds) { break }

  $roundId = "{0:D3}" -f $round
  $taskPath = Join-Path $roundsDir "round$roundId-task.md"
  $outputPath = Join-Path $roundsDir "round$roundId-output.md"
  $logPath = Join-Path $logsDir "round$roundId-claude.log"
  $checksPath = Join-Path $testsDir "round$roundId-checks.md"

  Write-Status -Round $round -Phase "starting-round" -NextDelaySeconds $FastSleepSeconds
  @"
You are a fresh Claude worker in a 12h maintenance loop for this WeChat Mini Program repo.

Repository: $repo
Round: $roundId

Mission:
1. Inspect recent code, user screenshots/context, and previous round outputs.
2. Prefer fixing real bugs. If no clear bug exists, make one small UX improvement.
3. Keep changes minimal and safe. Do not delete user files.
4. Run targeted syntax/tests when practical.
5. Write a concise report to: $outputPath
6. Write validation details to: $checksPath

Current policy:
- Adaptive low-frequency patrol.
- Do not create chat noise; write findings to files.
- GitHub publication is handled by the publish watcher, not this worker.
"@ | Set-Content -LiteralPath $taskPath -Encoding UTF8

  Write-Heartbeat "Round $roundId started."
  try {
    claude -p (Get-Content -LiteralPath $taskPath -Raw) *> $logPath
    if (!(Test-Path -LiteralPath $outputPath)) {
      "Round $roundId completed. Claude log written to $logPath. No explicit output file was produced." | Set-Content -LiteralPath $outputPath -Encoding UTF8
    }
    Write-Heartbeat "Round $roundId completed; output: rounds/round$roundId-output.md"
    Write-Status -Round $round -Phase "round-complete" -NextDelaySeconds $NormalSleepSeconds
    Start-Sleep -Seconds $NormalSleepSeconds
  } catch {
    Write-Heartbeat "Round $roundId failed: $($_.Exception.Message)"
    Write-Status -Round $round -Phase "round-failed" -NextDelaySeconds $FastSleepSeconds
    Start-Sleep -Seconds $FastSleepSeconds
  }
}

Write-Heartbeat "Longrun deadline reached or max rounds exhausted."
Write-Status -Round (Get-LatestRoundNumber "round*-output.md") -Phase "deadline-or-max-rounds" -NextDelaySeconds 0
