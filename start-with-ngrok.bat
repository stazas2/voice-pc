@echo off
title Voice PC + Alice - Cloud Setup
color 0A
echo ===============================================
echo   VOICE PC CONTROLLER - CLOUD SETUP
echo ===============================================
echo.

REM Clean up
powershell -Command "Get-Process -Name node,ngrok -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
timeout /t 1 /nobreak >nul

REM Build and start
echo [1/3] Building project...
call npm run build -s
if errorlevel 1 (color 0C && echo BUILD FAILED! && pause && exit /b 1)

echo [2/3] Starting local server...
start "Voice PC Server" /min cmd /c "npm start"
timeout /t 3 /nobreak >nul

echo [3/3] Starting ngrok tunnel...
start "ngrok" cmd /k "ngrok http 3000"
timeout /t 5 /nobreak >nul

REM Get URL and show instructions
echo.
echo ===============================================
powershell -Command "try { $url = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels).tunnels[0].public_url; Write-Host 'SUCCESS! New ngrok URL:' -ForegroundColor Green; Write-Host $url -ForegroundColor Yellow; Write-Host ''; Write-Host 'UPDATE Cloud Function URL to:' -ForegroundColor Cyan; Write-Host ($url + '/command') -ForegroundColor White -BackgroundColor DarkBlue } catch { Write-Host 'Ngrok starting... check ngrok window' -ForegroundColor Red }"
echo ===============================================
echo.
echo DONE! Alice will work after you update Cloud Function URL.
pause