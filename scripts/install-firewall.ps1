# Voice PC Firewall Configuration Script
# Run as Administrator

param(
    [int]$Port = 3000,
    [string]$RuleName = "Voice-PC-Server"
)

Write-Host "🔥 Voice PC Firewall Setup" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "✗ This script requires Administrator privileges" -ForegroundColor Red
    Write-Host "  Please run PowerShell as Administrator and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Running with Administrator privileges" -ForegroundColor Green

# Remove existing rules if they exist
Write-Host "🧹 Removing existing firewall rules..." -ForegroundColor Yellow
try {
    Remove-NetFirewallRule -DisplayName "$RuleName-*" -ErrorAction SilentlyContinue
    Write-Host "✓ Cleaned up existing rules" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  No existing rules to clean up" -ForegroundColor Gray
}

# Find Node.js executable path
$nodePaths = @(
    (Get-Command node -ErrorAction SilentlyContinue).Source,
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $nodePaths) {
    Write-Host "✗ Node.js executable not found" -ForegroundColor Red
    Write-Host "  Please ensure Node.js is installed and in PATH" -ForegroundColor Yellow
    exit 1
}

$nodePath = $nodePaths
Write-Host "✓ Found Node.js at: $nodePath" -ForegroundColor Green

# Create inbound rule for the specific port
Write-Host "📥 Creating inbound rule for port $Port..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "$RuleName-Inbound-Port" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Domain,Private,Public -Description "Allow inbound connections to Voice PC server on port $Port"
    Write-Host "✓ Inbound port rule created" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create inbound port rule: $($_.Exception.Message)" -ForegroundColor Red
}

# Create outbound rule for the specific port
Write-Host "📤 Creating outbound rule for port $Port..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "$RuleName-Outbound-Port" -Direction Outbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Domain,Private,Public -Description "Allow outbound connections from Voice PC server on port $Port"
    Write-Host "✓ Outbound port rule created" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create outbound port rule: $($_.Exception.Message)" -ForegroundColor Red
}

# Create inbound rule for Node.js executable
Write-Host "📥 Creating inbound rule for Node.js executable..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "$RuleName-Inbound-NodeJS" -Direction Inbound -Program "$nodePath" -Action Allow -Profile Domain,Private,Public -Description "Allow inbound connections to Node.js for Voice PC server"
    Write-Host "✓ Inbound Node.js rule created" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create inbound Node.js rule: $($_.Exception.Message)" -ForegroundColor Red
}

# Create outbound rule for Node.js executable
Write-Host "📤 Creating outbound rule for Node.js executable..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "$RuleName-Outbound-NodeJS" -Direction Outbound -Program "$nodePath" -Action Allow -Profile Domain,Private,Public -Description "Allow outbound connections from Node.js for Voice PC server"
    Write-Host "✓ Outbound Node.js rule created" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create outbound Node.js rule: $($_.Exception.Message)" -ForegroundColor Red
}

# Verify rules were created
Write-Host ""
Write-Host "🔍 Verifying firewall rules..." -ForegroundColor Cyan
$rules = Get-NetFirewallRule -DisplayName "$RuleName-*" | Sort-Object DisplayName

if ($rules.Count -gt 0) {
    Write-Host "✓ Created $($rules.Count) firewall rules:" -ForegroundColor Green
    foreach ($rule in $rules) {
        $direction = if ($rule.Direction -eq "Inbound") { "📥" } else { "📤" }
        Write-Host "  $direction $($rule.DisplayName) - $($rule.Action)" -ForegroundColor White
    }
} else {
    Write-Host "✗ No rules were created successfully" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Firewall configuration completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 What was configured:" -ForegroundColor Cyan
Write-Host "  • Inbound/Outbound TCP port $Port" -ForegroundColor White
Write-Host "  • Inbound/Outbound access for Node.js executable" -ForegroundColor White
Write-Host "  • Applied to Domain, Private, and Public profiles" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Security Notes:" -ForegroundColor Yellow
Write-Host "  • These rules allow network access to your Voice PC server" -ForegroundColor White
Write-Host "  • Make sure your ALICE_TOKEN is secure and strong" -ForegroundColor White
Write-Host "  • Consider using Private profile only if not needed on public networks" -ForegroundColor White
Write-Host ""
Write-Host "🗑️  To remove these rules later, run:" -ForegroundColor Gray
Write-Host "Remove-NetFirewallRule -DisplayName '$RuleName-*'" -ForegroundColor Gray