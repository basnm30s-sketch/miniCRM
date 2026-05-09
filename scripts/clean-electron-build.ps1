# Deprecated wrapper retained for backward compatibility.
# Canonical scripts:
# - scripts/cleanup-imanage.ps1
# - scripts/clean-electron-dist.ps1

$ErrorActionPreference = "Stop"

$cleanupScript = Join-Path $PSScriptRoot "cleanup-imanage.ps1"
$distCleanupScript = Join-Path $PSScriptRoot "clean-electron-dist.ps1"

if (-not (Test-Path $cleanupScript)) {
    throw "Required script not found: $cleanupScript"
}
if (-not (Test-Path $distCleanupScript)) {
    throw "Required script not found: $distCleanupScript"
}

Write-Host "[Deprecated] Running canonical cleanup scripts..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File $cleanupScript
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& powershell -ExecutionPolicy Bypass -File $distCleanupScript
exit $LASTEXITCODE
