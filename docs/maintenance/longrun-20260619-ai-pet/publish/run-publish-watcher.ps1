param(
  [int]$PollSeconds = 600,
  [string]$DeadlineAt = "2026-06-20T01:01:40"
)

$ErrorActionPreference = "Continue"
$publishDir = $PSScriptRoot
$base = Split-Path -Parent $publishDir
$repo = Resolve-Path (Join-Path $base "..\..\..")
$roundsDir = Join-Path $base "rounds"
$heartbeat = Join-Path $base "longrun-heartbeat.md"
$statePath = Join-Path $publishDir "publish-state.json"

function Write-Heartbeat([string]$Message) {
  $line = "- {0} {1}" -f (Get-Date -Format s), $Message
  Add-Content -LiteralPath $heartbeat -Value $line -Encoding UTF8
}

function Read-State {
  if (Test-Path -LiteralPath $statePath) {
    try {
      $raw = Get-Content -LiteralPath $statePath -Raw
      if ($raw.Trim()) { return ($raw | ConvertFrom-Json) }
    } catch {}
  }
  return [pscustomobject]@{
    lastProcessedRound = 0
    lastProcessedAt = $null
    lastAttemptedRound = 0
    lastAttemptedAt = $null
    pollSeconds = $PollSeconds
  }
}

function Write-State([int]$ProcessedRound, [int]$AttemptedRound) {
  $state = [ordered]@{
    lastProcessedRound = $ProcessedRound
    lastProcessedAt = (Get-Date -Format s)
    lastAttemptedRound = $AttemptedRound
    lastAttemptedAt = (Get-Date -Format s)
    pollSeconds = $PollSeconds
    policy = "process each completed version round once; dispatch Claude only when git has publishable changes; no repeated retries without a newer round"
  }
  $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $statePath -Encoding UTF8
}

function Get-CompletedRounds {
  $items = Get-ChildItem -LiteralPath $roundsDir -Filter "round*-output.md" -ErrorAction SilentlyContinue
  $rounds = @()
  foreach ($item in $items) {
    if ($item.BaseName -match '^round(\d+)-output$') {
      $rounds += [pscustomobject]@{ Number = [int]$Matches[1]; Path = $item.FullName }
    }
  }
  return $rounds | Sort-Object Number
}

function Has-PublishableChanges {
  Set-Location $repo
  $changes = git status --porcelain
  if (!$changes) { return $false }
  $publishable = $changes | Where-Object {
    $_ -notmatch 'docs/maintenance/longrun-20260619-ai-pet/(logs|publish/publish-watcher\.log|publish/publish-watcher\.log\.err)'
  }
  return [bool]$publishable
}

function Is-PublishWorkerRunning {
  $workers = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match 'publish-round\d+-task\.md' -and $_.CommandLine -match 'claude'
  }
  return [bool]$workers
}

function Start-PublishWorker([int]$Round) {
  $roundId = "{0:D3}" -f $Round
  $workerPath = Join-Path $publishDir "run-publish-worker.ps1"
  Write-Heartbeat "Publish worker for Round $roundId scheduled."
  Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $workerPath,
    "-Round", $Round,
    "-TimeoutSeconds", "1800"
  ) | Out-Null
}

$deadline = [DateTime]::Parse($DeadlineAt)
Write-Heartbeat "Publish watcher started with adaptive low-output policy. PollSeconds=$PollSeconds."

while ((Get-Date) -lt $deadline) {
  $state = Read-State
  $last = [int]($state.lastProcessedRound)
  $round = Get-CompletedRounds | Where-Object { $_.Number -gt $last } | Select-Object -First 1
  if ($round) {
    if (Is-PublishWorkerRunning) {
      Write-Heartbeat ("Publish watcher delayed Round {0:D3}: previous publish worker is still running." -f $round.Number)
    } elseif (Has-PublishableChanges) {
      Start-PublishWorker -Round $round.Number
      Write-State -ProcessedRound $round.Number -AttemptedRound $round.Number
    } else {
      Write-Heartbeat ("Publish watcher skipped Round {0:D3}: no publishable git changes." -f $round.Number)
      Write-State -ProcessedRound $round.Number -AttemptedRound $round.Number
    }
  }
  Start-Sleep -Seconds $PollSeconds
}

Write-Heartbeat "Publish watcher deadline reached."


