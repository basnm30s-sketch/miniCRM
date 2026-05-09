# Deprecated wrapper retained for backward compatibility.
# Canonical script: scripts/build-installer-win.ps1

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ForwardArgs
)

$ErrorActionPreference = "Stop"

$canonicalScript = Join-Path $PSScriptRoot "build-installer-win.ps1"
if (-not (Test-Path $canonicalScript)) {
    throw "Required script not found: $canonicalScript"
}

Write-Host "[Deprecated] Redirecting to scripts/build-installer-win.ps1" -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File $canonicalScript @ForwardArgs
exit $LASTEXITCODE
