# Build, install, and launch iManage on Windows.
# Preserves app data by default; use -RemoveAppData for a full-reset workflow.

[CmdletBinding()]
param(
    [switch]$RemoveAppData,
    [switch]$SkipBuildArtifactsCleanup
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  iManage Build + Reinstall Workflow" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$cleanupScript = Join-Path $PSScriptRoot "cleanup-imanage.ps1"

if (-not (Test-Path $cleanupScript)) {
    throw "Required script not found: $cleanupScript"
}

Write-Host "[1/5] Cleaning existing installation..." -ForegroundColor Yellow
if ($RemoveAppData) {
    & powershell -ExecutionPolicy Bypass -File $cleanupScript -RemoveAppData
} else {
    & powershell -ExecutionPolicy Bypass -File $cleanupScript
}
if ($LASTEXITCODE -ne 0) {
    throw "Cleanup failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "[2/5] Cleaning build artifacts..." -ForegroundColor Yellow
if ($SkipBuildArtifactsCleanup) {
    Write-Host "  -> Skipped build-artifact cleanup by request." -ForegroundColor Gray
} else {
    $pathsToDelete = @(
        (Join-Path $projectRoot "dist"),
        (Join-Path $projectRoot "dist-electron"),
        (Join-Path $projectRoot "dist-server"),
        (Join-Path $projectRoot "out")
    )

    foreach ($path in $pathsToDelete) {
        if (Test-Path $path) {
            Write-Host "  -> Deleting: $path" -ForegroundColor Yellow
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "     Deleted." -ForegroundColor Green
        } else {
            Write-Host "  -> Not found (already clean): $path" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "[3/5] Building Windows installer..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    & npm run electron:build-win
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "[4/5] Installing generated build silently..." -ForegroundColor Yellow
$distPath = Join-Path $projectRoot "dist"
$installer = Get-ChildItem -Path $distPath -Filter "*Setup*.exe" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $installer) {
    throw "No installer found in '$distPath'. Expected a *Setup*.exe file."
}

Write-Host "  -> Installer: $($installer.FullName)" -ForegroundColor Yellow
Start-Process -FilePath $installer.FullName -ArgumentList "/S" -Wait -NoNewWindow
Write-Host "  -> Installation complete." -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Launching iManage..." -ForegroundColor Yellow
$appCandidates = @(
    "$env:LOCALAPPDATA\Programs\iManage\iManage.exe",
    "$env:ProgramFiles\iManage\iManage.exe",
    "${env:ProgramFiles(x86)}\iManage\iManage.exe"
)

$appExe = $appCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($appExe) {
    Start-Process -FilePath $appExe
    Write-Host "  -> Launched: $appExe" -ForegroundColor Green
} else {
    throw ("Could not find installed executable to launch. Checked: " + ($appCandidates -join ", "))
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Workflow Completed Successfully" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
