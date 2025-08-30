@echo off
title Voice PC + Alice - Auto Update
color 0A
echo ===============================================
echo   VOICE PC CONTROLLER - AUTO UPDATE
echo ===============================================
echo.

REM Clean up previous processes
echo [0/4] Cleaning up...
powershell -Command "Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq Voice PC Server*" 2>nul
timeout /t 1 /nobreak >nul

REM Build and start
echo [1/4] Building project...
call npm run build -s
if errorlevel 1 (color 0C && echo BUILD FAILED! && pause && exit /b 1)

echo [2/4] Starting local server...
start "Voice PC Server" /min cmd /c "npm start"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --url localhost:3000"
timeout /t 8 /nobreak >nul

echo [4/4] Getting tunnel URL and generating update code...
echo.
echo ===============================================

REM Get URL and generate code
powershell -Command "try { for($i=1; $i -le 10; $i++) { try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:20241/metrics' -TimeoutSec 3; $url = ($response -split '`n' | Select-String 'userHostname=' | ForEach-Object { ($_ -split '\"')[1] }); if($url) { Write-Host 'SUCCESS! Cloudflare Tunnel URL:' -ForegroundColor Green; Write-Host \"https://$url\" -ForegroundColor Yellow; Write-Host ''; Write-Host '=== COPY THIS TO YANDEX CLOUD FUNCTION ===' -ForegroundColor Cyan; Write-Host \"const WEBHOOK_URL = 'https://$url/command';\" -ForegroundColor White -BackgroundColor DarkBlue; Write-Host '=========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Replace line 2 in your Yandex Cloud Function with the blue line above.' -ForegroundColor White; break } } catch { Write-Host \"Attempt $i/10: Getting tunnel URL...\" -ForegroundColor Yellow; Start-Sleep 2 } } if(!$url) { Write-Host 'Could not get tunnel URL. Check Cloudflare Tunnel window.' -ForegroundColor Red } } catch { Write-Host 'Error getting tunnel info. Check Cloudflare Tunnel window.' -ForegroundColor Red }"

echo ===============================================
echo.
echo DONE! Your Voice PC is running with auto-generated URL.
echo Just copy the blue line above to Yandex Cloud Function.
echo.
pause