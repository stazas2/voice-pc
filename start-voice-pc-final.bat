@echo off
title Voice PC + Alice - PERMANENT SOLUTION
color 0A

REM Change to the script directory
cd /d "%~dp0"

echo ===============================================
echo   VOICE PC CONTROLLER - PERMANENT SOLUTION
echo   URL: https://voice-pc.stazas2.space
echo ===============================================
echo.

REM Clean up previous processes (избегаем убийство Claude Code)
echo [0/3] Cleaning up previous processes...
powershell -Command "Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
REM Kill any node processes using port 3000
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul
timeout /t 1 /nobreak >nul

REM Build and start
echo [1/3] Building project...
call npm run build -s
if errorlevel 1 (color 0C && echo BUILD FAILED! && pause && exit /b 1)

echo [2/3] Starting local server with UX improvements...
start "Voice PC Server" cmd /k "cd /d \"%~dp0\" & set PORT=3000 & node dist/server.js"
timeout /t 3 /nobreak >nul

echo [3/3] Starting permanent Cloudflare Tunnel (hidden)...
start "Cloudflare Tunnel" /min powershell -WindowStyle Hidden -Command "& .\cloudflared.exe tunnel run --token eyJhIjoiNTEyNDU1M2RjMjAwMDIzZjRmZWMwNDRiNzg4MWRjNGUiLCJ0IjoiZTFiMTVjMTItZTJiNC00MjNhLWFmMzctNTU2YWU0NjY3MWI2IiwicyI6IlkyVTBZekZpWWprdFlXWmlOUzAwT1Rjd0xUazBZamt0TjJWbU9UQXpNRGt5WmpNMSJ9; Read-Host 'Press Enter to close'"
timeout /t 5 /nobreak >nul

echo.
echo ===============================================
echo SUCCESS! Permanent Voice PC Controller is running!
echo.
echo Public URL: https://voice-pc.stazas2.space
echo API Endpoint: https://voice-pc.stazas2.space/command
echo.
echo Your Yandex Cloud Function is already configured!
echo URL will NEVER change - this is your permanent solution.
echo.
echo Test with: "Алиса, запусти навык головной отрыв"
echo Then say: "блокнот" or "открой ютуб"
echo ===============================================
echo.
echo DONE! Voice PC is ready. URL never changes again!
echo.
echo 💡 Tip: Cloudflare Tunnel запущен скрыто. 
echo    Если нужно посмотреть логи, запусти:
echo    show-tunnel-logs.bat
echo.
pause