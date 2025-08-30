@echo off
title Voice PC + Alice - Cloudflare Tunnel (SAFE)
color 0A
echo ===============================================
echo   VOICE PC CONTROLLER - CLOUDFLARE TUNNEL
echo   SAFE MODE (no process cleanup)
echo ===============================================
echo.

REM Build and start (без cleanup)
echo [1/3] Building project...
call npm run build -s
if errorlevel 1 (color 0C && echo BUILD FAILED! && pause && exit /b 1)

echo [2/3] Starting local server...
start "Voice PC Server" /min cmd /c "npm start"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --url localhost:3000"
timeout /t 8 /nobreak >nul

REM Get URL from cloudflared metrics
echo [4/3] Getting tunnel URL...
echo.
echo ===============================================
powershell -Command "try { for($i=1; $i -le 5; $i++) { try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:20241/metrics' -TimeoutSec 3; $url = ($response -split '`n' | Select-String 'userHostname=' | ForEach-Object { ($_ -split '\"')[1] }); if($url) { Write-Host 'SUCCESS! Cloudflare Tunnel URL:' -ForegroundColor Green; Write-Host \"https://$url\" -ForegroundColor Yellow; Write-Host ''; Write-Host 'UPDATE Cloud Function URL to:' -ForegroundColor Cyan; Write-Host \"https://$url/command\" -ForegroundColor White -BackgroundColor DarkBlue; break } } catch { Write-Host \"Attempt $i/5: Tunnel starting...\" -ForegroundColor Yellow; Start-Sleep 2 } } if(!$url) { Write-Host 'Could not get tunnel URL. Check Cloudflare Tunnel window.' -ForegroundColor Red } } catch { Write-Host 'Error getting tunnel info. Check Cloudflare Tunnel window.' -ForegroundColor Red }"
echo ===============================================
echo.
echo DONE! Alice will work after you update Cloud Function URL.
echo.
echo NOTE: If you have old processes running, close them manually.
echo.
pause