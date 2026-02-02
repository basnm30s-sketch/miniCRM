# Clean Electron Build Script
# This script uninstalls iManage, deletes installation folders, and cleans build artifacts

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  iManage Pre-Build Cleanup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any running iManage processes
Write-Host "[1/3] Checking for running iManage processes..." -ForegroundColor Yellow
$processes = Get-Process -Name "iManage" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "  -> Found $($processes.Count) running process(es). Stopping..." -ForegroundColor Yellow
    Stop-Process -Name "iManage" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  -> Processes stopped." -ForegroundColor Green
} else {
    Write-Host "  -> No running processes found." -ForegroundColor Gray
}

# Step 2: Uninstall iManage
Write-Host ""
Write-Host "[2/3] Uninstalling iManage..." -ForegroundColor Yellow

# Common uninstaller locations for NSIS
$uninstallerPaths = @(
    "$env:LOCALAPPDATA\Programs\iManage\Uninstall iManage.exe",
    "$env:ProgramFiles\iManage\Uninstall iManage.exe",
    "${env:ProgramFiles(x86)}\iManage\Uninstall iManage.exe"
)

$uninstallerFound = $false
foreach ($path in $uninstallerPaths) {
    if (Test-Path $path) {
        Write-Host "  -> Found uninstaller at: $path" -ForegroundColor Yellow
        Write-Host "  -> Running uninstaller silently..." -ForegroundColor Yellow
        Start-Process -FilePath $path -ArgumentList "/S" -Wait -NoNewWindow -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Write-Host "  -> Uninstaller completed." -ForegroundColor Green
        $uninstallerFound = $true
        break
    }
}

if (-not $uninstallerFound) {
    Write-Host "  -> No uninstaller found. App may not be installed." -ForegroundColor Gray
}

# Delete installation folders
Write-Host "  -> Removing installation folders..." -ForegroundColor Yellow
$installPaths = @(
    "$env:LOCALAPPDATA\Programs\iManage",
    "$env:ProgramFiles\iManage",
    "${env:ProgramFiles(x86)}\iManage"
)

foreach ($installPath in $installPaths) {
    if (Test-Path $installPath) {
        Write-Host "     Deleting: $installPath" -ForegroundColor Yellow
        Remove-Item -Path $installPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "     Deleted." -ForegroundColor Green
    }
}

# Step 3: Delete dist folder
Write-Host ""
Write-Host "[3/3] Cleaning build artifacts..." -ForegroundColor Yellow

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot "dist"

if (Test-Path $distPath) {
    Write-Host "  -> Deleting dist folder: $distPath" -ForegroundColor Yellow
    Remove-Item -Path $distPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  -> Deleted." -ForegroundColor Green
} else {
    Write-Host "  -> dist folder not found (already clean)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
