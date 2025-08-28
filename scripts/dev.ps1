# Voice PC Development Startup Script
param(
    [switch]$SkipNgrok,
    [switch]$BuildOnly,
    [int]$Port = 3000
)

Write-Host "🎙️ Voice PC Development Server Startup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 20+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if npm packages are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing npm packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install packages" -ForegroundColor Red
        exit 1
    }
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "📝 Please edit .env file and set your ALICE_TOKEN before running again" -ForegroundColor Yellow
    notepad .env
    exit 0
}

# Load environment variables
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#].+?)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

$ALICE_TOKEN = $env:ALICE_TOKEN
if (-not $ALICE_TOKEN -or $ALICE_TOKEN -eq "change_me" -or $ALICE_TOKEN.Length -lt 10) {
    Write-Host "✗ ALICE_TOKEN not set or insecure in .env file. Please set a strong token." -ForegroundColor Red
    notepad .env
    exit 1
}

# Build TypeScript
Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ TypeScript build failed" -ForegroundColor Red
    exit 1
}

if ($BuildOnly) {
    Write-Host "✓ Build completed successfully" -ForegroundColor Green
    exit 0
}

# Check Windows Firewall (informational)
Write-Host "🔥 Checking Windows Firewall..." -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule -DisplayName "*Node*" -ErrorAction SilentlyContinue
if ($firewallRules.Count -eq 0) {
    Write-Host "⚠️  No Node.js firewall rules found. You may need to run scripts/install-firewall.ps1" -ForegroundColor Yellow
}

# Start ngrok in background if not skipped
$ngrokProcess = $null
$publicUrl = $null

if (-not $SkipNgrok) {
    Write-Host "🌐 Starting ngrok..." -ForegroundColor Yellow
    
    # Check if ngrok is installed
    try {
        $ngrokVersion = ngrok version
        Write-Host "✓ ngrok found: $ngrokVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ ngrok not found. Please install ngrok from https://ngrok.com" -ForegroundColor Red
        Write-Host "  After installation, run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Yellow
        exit 1
    }

    # Check ngrok config
    if (-not (Test-Path "ngrok.yml")) {
        Write-Host "⚠️  ngrok.yml not found. Creating basic config..." -ForegroundColor Yellow
        @"
version: "2"
authtoken: YOUR_NGROK_TOKEN_HERE
tunnels:
  voicepc:
    addr: $Port
    proto: http
    schemes:
      - https
"@ | Out-File -FilePath "ngrok.yml" -Encoding UTF8
        Write-Host "📝 Please edit ngrok.yml and add your authtoken" -ForegroundColor Yellow
        notepad ngrok.yml
        exit 0
    }

    # Start ngrok
    $ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "start", "voicepc", "--config", "./ngrok.yml" -PassThru -WindowStyle Hidden
    
    # Wait for ngrok to start
    Start-Sleep -Seconds 3
    
    # Get public URL from ngrok API
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        $tunnel = $ngrokApi.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($tunnel) {
            $publicUrl = $tunnel.public_url
            Write-Host "✓ ngrok tunnel active: $publicUrl" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Could not retrieve ngrok URL from API" -ForegroundColor Yellow
    }
}

# Start the server
Write-Host "🚀 Starting Voice PC Server on port $Port..." -ForegroundColor Green
Write-Host ""

# Show connection info
Write-Host "📡 Server URLs:" -ForegroundColor Cyan
Write-Host "  Local:  http://localhost:$Port" -ForegroundColor White
Write-Host "  Network: http://$(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*' | Select-Object -First 1 -ExpandProperty IPAddress):$Port" -ForegroundColor White
if ($publicUrl) {
    Write-Host "  Public: $publicUrl" -ForegroundColor White
}

Write-Host ""
Write-Host "🔑 API Token: $ALICE_TOKEN" -ForegroundColor Cyan
Write-Host ""

# Show curl examples
Write-Host "📋 Test Commands (PowerShell):" -ForegroundColor Cyan
$testUrl = if ($publicUrl) { $publicUrl } else { "http://localhost:$Port" }

Write-Host @"
# Health check
Invoke-RestMethod -Uri "$testUrl/health" -Method Get

# Say OK test
Invoke-RestMethod -Uri "$testUrl/command" -Method Post -ContentType "application/json" -Headers @{"X-ALICE-TOKEN"="$ALICE_TOKEN"} -Body '{"command":"say_ok"}'

# Open Notepad
Invoke-RestMethod -Uri "$testUrl/command" -Method Post -ContentType "application/json" -Headers @{"X-ALICE-TOKEN"="$ALICE_TOKEN"} -Body '{"command":"open_notepad"}'

# Open YouTube
Invoke-RestMethod -Uri "$testUrl/command" -Method Post -ContentType "application/json" -Headers @{"X-ALICE-TOKEN"="$ALICE_TOKEN"} -Body '{"command":"open_chrome","url":"https://youtube.com"}'
"@ -ForegroundColor Gray

Write-Host ""
Write-Host "🌐 Web Interface: $testUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow

# Cleanup function
$cleanup = {
    Write-Host "`n🛑 Stopping servers..." -ForegroundColor Yellow
    if ($ngrokProcess -and -not $ngrokProcess.HasExited) {
        $ngrokProcess.Kill()
        Write-Host "✓ ngrok stopped" -ForegroundColor Green
    }
}

# Register cleanup on exit
Register-ObjectEvent -InputObject ([System.Console]) -EventName CancelKeyPress -Action $cleanup

try {
    # Start the Node.js server
    & node "dist/server.js"
} finally {
    & $cleanup
}