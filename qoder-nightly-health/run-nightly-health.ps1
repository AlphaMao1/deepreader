# DeepReader Nightly Repo Health Check
# Run this script to perform a full repository health check.
# All output is saved to runs\YYYY-MM-DD\raw\

$ErrorActionPreference = "Continue"
$date = Get-Date -Format "yyyy-MM-dd"
$baseDir = "D:\Project\deepreader\qoder-nightly-health\runs\$date"
$rawDir = "$baseDir\raw"
New-Item -ItemType Directory -Path $rawDir -Force | Out-Null

$failures = @()

function Run-Check {
    param([string]$Name, [string]$Command, [string]$LogFile)
    Write-Host ">> Running: $Name"
    try {
        $output = Invoke-Expression "$Command" 2>&1
        $output | Out-File -FilePath "$rawDir\$LogFile" -Encoding utf8
        if ($LASTEXITCODE -ne 0) {
            $failures += "$Name (exit code: $LASTEXITCODE)"
            Write-Host "   FAIL: $Name" -ForegroundColor Red
        } else {
            Write-Host "   PASS: $Name" -ForegroundColor Green
        }
    } catch {
        $_ | Out-File -FilePath "$rawDir\$LogFile" -Encoding utf8 -Append
        $failures += "$Name (exception)"
        Write-Host "   ERROR: $Name - $_" -ForegroundColor Red
    }
}

Write-Host "=== DeepReader Nightly Health Check ===" -ForegroundColor Cyan
Write-Host "Date: $date"
Write-Host ""

# 1. Git status
Run-Check "Git Status" "cd D:\Project\deepreader; git rev-parse HEAD; git branch --show-current; git status --short; git diff --stat" "git-status.log"

# 2. Dependency consistency
Run-Check "pnpm install --frozen-lockfile" "cd D:\Project\deepreader; pnpm install --frozen-lockfile" "pnpm-install.log"

# 3. Builds
Run-Check "app-tabs build" "cd D:\Project\deepreader; pnpm --filter app-tabs build" "app-tabs-build.log"
Run-Check "foliate-js build" "cd D:\Project\deepreader; pnpm --filter foliate-js build" "foliate-js-build.log"
Run-Check "web typecheck" "cd D:\Project\deepreader; pnpm --filter web test" "web-test.log"
Run-Check "web build" "cd D:\Project\deepreader; pnpm --filter web build" "web-build.log"
Run-Check "app build" "cd D:\Project\deepreader; pnpm --filter app build" "app-build.log"

# 4. Rust / Tauri
Run-Check "cargo check (tauri)" "cd D:\Project\deepreader; cargo check --manifest-path packages/app/src-tauri/Cargo.toml" "cargo-check-tauri.log"

# 5. Biome
Run-Check "biome check" "cd D:\Project\deepreader; pnpm exec biome check ." "biome-check.log"

# 6. Audit
Run-Check "pnpm audit" "cd D:\Project\deepreader; pnpm audit --audit-level moderate" "pnpm-audit.log"

# 7. TODO / risk scan (use findstr as fallback if rg not available)
Run-Check "TODO scan" "cd D:\Project\deepreader; findstr /S /N /R /C:"TODO" /C:"FIXME" /C:"HACK" /C:"@ts-ignore" packages\*.ts packages\*.tsx packages\*.js" "rg-todo-scan.log"

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($failures.Count -eq 0) {
    Write-Host "All checks passed!" -ForegroundColor Green
} else {
    Write-Host "Failed checks:" -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

Write-Host ""
Write-Host "Raw logs saved to: $rawDir"
Write-Host "Please review logs and generate final-report.md"
