param(
  [ValidateSet("win","linux","mac")]
  [string]$Target = "win"
)

$root = Split-Path -Parent $PSScriptRoot
$electronDir = Join-Path $root "electron"

Write-Host "=== Step 1: Build Next.js ===" -ForegroundColor Cyan
Push-Location $root
npx next build
if ($LASTEXITCODE -ne 0) { Write-Host "Next.js build failed" -ForegroundColor Red; exit 1 }
Pop-Location

Write-Host "=== Step 2: Install Electron deps ===" -ForegroundColor Cyan
Push-Location $electronDir
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; exit 1 }

Write-Host "=== Step 3: Build Electron app ($Target) ===" -ForegroundColor Cyan
npm run "build:$Target"
if ($LASTEXITCODE -ne 0) { Write-Host "Electron build failed" -ForegroundColor Red; exit 1 }
Pop-Location

Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "Output: $root\dist-electron\" -ForegroundColor Yellow
