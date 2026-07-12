param([switch]$Foreground)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path ".env")) {
  throw "缺少 .env，请先运行 npm run init-env"
}

npm install
Push-Location frontend
try {
  corepack pnpm install --frozen-lockfile --filter skyroc-admin...
  corepack pnpm --filter skyroc-admin build
} finally {
  Pop-Location
}
if (-not (Test-Path ".venv\Scripts\python.exe")) {
  py -3.12 -m venv .venv
}
& ".venv\Scripts\python.exe" -m pip install -e ".\vendor\hidemyemail-generator"

$env:PYTHON_COMMAND = (Resolve-Path ".venv\Scripts\python.exe").Path
if (-not $env:DATABASE_PATH) {
  $env:DATABASE_PATH = Join-Path $Root "data\workbench.db"
}
$connection = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($connection) {
  Stop-Process -Id $connection.OwningProcess -Force
}

if ($Foreground) {
  npm start
} else {
  New-Item -ItemType Directory -Force -Path logs | Out-Null
  Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput "$Root\logs\server.log" -RedirectStandardError "$Root\logs\server-error.log"
  for ($attempt = 1; $attempt -le 10; $attempt++) {
    Start-Sleep -Seconds 1
    try {
      Invoke-RestMethod "http://127.0.0.1:4173/api/health" | ConvertTo-Json -Compress
      break
    } catch {
      if ($attempt -eq 10) { throw }
    }
  }
}
