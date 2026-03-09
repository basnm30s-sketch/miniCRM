# Clean Electron Build Artifacts Script
# Best-practice cleanup: remove build outputs only (no uninstall)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  iManage Build Artifacts Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot

$pathsToDelete = @(
    (Join-Path $projectRoot "dist"),
    (Join-Path $projectRoot "dist-electron"),
    (Join-Path $projectRoot "dist-server"),
    (Join-Path $projectRoot "out")
)

Write-Host "[1/1] Cleaning build artifacts..." -ForegroundColor Yellow
foreach ($path in $pathsToDelete) {
    if (Test-Path $path) {
        Write-Host "  -> Deleting: $path" -ForegroundColor Yellow
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "     Deleted." -ForegroundColor Green
    } else {
        Write-Host "  -> Not found (already clean): $path" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
