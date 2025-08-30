@echo off
title Voice PC + Alice - PERMANENT SOLUTION
color 0A
echo ===============================================
echo   VOICE PC CONTROLLER - PERMANENT SOLUTION
echo   URL: https://voice-pc.stazas2.space
echo ===============================================
echo.

REM Clean up previous processes (избегаем убийство Claude Code)
echo [0/3] Cleaning up previous processes...
powershell -Command "Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq Voice PC Server*" 2>nul
timeout /t 1 /nobreak >nul

REM Build and start
echo [1/3] Building project...
call npm run build -s
if errorlevel 1 (color 0C && echo BUILD FAILED! && pause && exit /b 1)

echo [2/3] Starting local server...
start "Voice PC Server" /min cmd /c "npm start"
timeout /t 3 /nobreak >nul

echo [3/3] Starting permanent Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel run --token eyJhIjoiNTEyNDU1M2RjMjAwMDIzZjRmZWMwNDRiNzg4MWRjNGUiLCJ0IjoiZTFiMTVjMTItZTJiNC00MjNhLWFmMzctNTU2YWU0NjY3MWI2IiwicyI6IlkyVTBZekZpWWprdFlXWmlOUzAwT1Rjd0xUazBZamt0TjJWbU9UQXpNRGt5WmpNMSJ9"
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
pause