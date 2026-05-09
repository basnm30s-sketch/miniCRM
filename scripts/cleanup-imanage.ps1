# Canonical iManage cleanup script (Windows)
# Default behavior preserves app data for faster test cycles.

[CmdletBinding()]
param(
    [switch]$RemoveAppData
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  iManage Cleanup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

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

Write-Host ""
Write-Host "[2/3] Uninstalling iManage and removing installation folders..." -ForegroundColor Yellow

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

$installPaths = @(
    "$env:LOCALAPPDATA\Programs\iManage",
    "$env:ProgramFiles\iManage",
    "${env:ProgramFiles(x86)}\iManage"
)

foreach ($installPath in $installPaths) {
    if (Test-Path $installPath) {
        Write-Host "  -> Deleting install folder: $installPath" -ForegroundColor Yellow
        Remove-Item -Path $installPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "     Deleted." -ForegroundColor Green
    } else {
        Write-Host "  -> Not found: $installPath" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[3/3] App data cleanup..." -ForegroundColor Yellow
$dataPaths = @(
    "$env:APPDATA\iManage",
    "$env:LOCALAPPDATA\iManage",
    "$env:APPDATA\com.imanage.crm",
    "$env:LOCALAPPDATA\com.imanage.crm"
)

if ($RemoveAppData) {
    foreach ($dataPath in $dataPaths) {
        if (Test-Path $dataPath) {
            Write-Host "  -> Deleting app data: $dataPath" -ForegroundColor Yellow
            Remove-Item -Path $dataPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "     Deleted." -ForegroundColor Green
        } else {
            Write-Host "  -> Not found: $dataPath" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  -> Preserving app data (default behavior)." -ForegroundColor Gray
    Write-Host "     Use -RemoveAppData to remove saved data for full-reset testing." -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
