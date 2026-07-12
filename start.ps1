param([switch]$Foreground)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path ".env")) {
  throw "缺少 .env，请先运行 npm run init-env"
}

npm install
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
  Start-Sleep -Seconds 2
  Invoke-RestMethod "http://127.0.0.1:4173/api/health" | ConvertTo-Json -Compress
}
