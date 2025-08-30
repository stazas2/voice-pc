@echo off
title Voice PC + Alice - Cloudflare Tunnel
color 0A
echo ===============================================
echo   VOICE PC CONTROLLER - CLOUDFLARE TUNNEL
echo ===============================================
echo.

REM Clean up previous processes (избегаем убийство Claude Code)
echo [0/4] Cleaning up...
powershell -Command "Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
REM Убиваем только node процессы с voice-pc в пути
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

REM Get URL from cloudflared metrics
echo [4/4] Getting tunnel URL...
echo.
echo ===============================================
powershell -Command "try { for($i=1; $i -le 5; $i++) { try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:20241/metrics' -TimeoutSec 3; $url = ($response -split '`n' | Select-String 'userHostname=' | ForEach-Object { ($_ -split '\"')[1] }); if($url) { Write-Host 'SUCCESS! Cloudflare Tunnel URL:' -ForegroundColor Green; Write-Host \"https://$url\" -ForegroundColor Yellow; Write-Host ''; Write-Host 'UPDATE Cloud Function URL to:' -ForegroundColor Cyan; Write-Host \"https://$url/command\" -ForegroundColor White -BackgroundColor DarkBlue; break } } catch { Write-Host \"Attempt $i/5: Tunnel starting...\" -ForegroundColor Yellow; Start-Sleep 2 } } if(!$url) { Write-Host 'Could not get tunnel URL. Check Cloudflare Tunnel window.' -ForegroundColor Red } } catch { Write-Host 'Error getting tunnel info. Check Cloudflare Tunnel window.' -ForegroundColor Red }"
echo ===============================================
echo.
echo DONE! Alice will work after you update Cloud Function URL.
echo.
echo IMPORTANT: Cloudflare Quick Tunnels are temporary!
echo For production use, create a named tunnel with a custom domain.
echo.
pause