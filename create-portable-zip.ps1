# Script to create portable zip after build completes
# Run this after: npm run build && npm run electron:build-win-unpacked

$buildPath = "dist\win-unpacked"

if (Test-Path "$buildPath\iManage.exe") {
    Write-Host "Build found! Creating portable zip..." -ForegroundColor Green
    
    # Check if iManage.exe is running
    $processes = Get-Process -Name "iManage" -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host ""
        Write-Host "WARNING: iManage.exe is currently running!" -ForegroundColor Yellow
        Write-Host "Please close the application before creating the zip." -ForegroundColor Yellow
        Write-Host ""
        $response = Read-Host "Do you want to close it now? (Y/N)"
        if ($response -eq "Y" -or $response -eq "y") {
            Stop-Process -Name "iManage" -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Write-Host "Application closed. Continuing..." -ForegroundColor Green
        } else {
            Write-Host "Please close iManage.exe manually and run this script again." -ForegroundColor Red
            exit
        }
    }
    
    $date = Get-Date -Format 'yyyy-MM-dd_HH-mm'
    $zipName = "iManage_Portable_v1.0_Fixed_$date.zip"
    
    # Remove old zip if exists
    if (Test-Path $zipName) {
        Remove-Item $zipName -Force
    }
    
    # Create zip with error handling
    try {
        Write-Host "Compressing files (this may take a few minutes)..." -ForegroundColor Cyan
        Compress-Archive -Path "$buildPath\*" -DestinationPath $zipName -CompressionLevel Optimal -ErrorAction Stop
        
        if (Test-Path $zipName) {
            $zip = Get-Item $zipName
            
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Cyan
            Write-Host "   PORTABLE ZIP CREATED!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "File: $($zip.Name)" -ForegroundColor White
            Write-Host "Size: $([math]::Round($zip.Length / 1MB, 2)) MB" -ForegroundColor White
            Write-Host "Path: $($zip.FullName)" -ForegroundColor White
            Write-Host ""
            Write-Host "Includes white screen fix!" -ForegroundColor Green
            Write-Host "Works standalone - no npm run dev needed!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Ready to distribute!" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "ERROR: Zip file was not created!" -ForegroundColor Red
            Write-Host "Some files may be locked by another process." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Please try:" -ForegroundColor Yellow
            Write-Host "  1. Close any Windows Explorer windows showing the dist folder" -ForegroundColor White
            Write-Host "  2. Close iManage.exe if it's running" -ForegroundColor White
            Write-Host "  3. Run this script again" -ForegroundColor White
        }
    } catch {
        Write-Host ""
        Write-Host "ERROR: Failed to create zip file!" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "This usually means files are locked. Please:" -ForegroundColor Yellow
        Write-Host "  1. Close iManage.exe if running" -ForegroundColor White
        Write-Host "  2. Close Windows Explorer windows showing dist\win-unpacked" -ForegroundColor White
        Write-Host "  3. Wait a few seconds and try again" -ForegroundColor White
    }
} else {
    Write-Host "Build not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run these commands first:" -ForegroundColor Yellow
    Write-Host "  npm run build" -ForegroundColor White
    Write-Host "  npm run electron:build-win-unpacked" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
}

