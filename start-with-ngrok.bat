@echo off
title Voice PC Controller with ngrok
echo Starting Voice PC Controller with ngrok...
echo.

REM Stop existing processes
echo Stopping existing processes...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process -Force" 2>nul
powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq 'ngrok'} | Stop-Process -Force" 2>nul
timeout /t 2 /nobreak >nul

REM Build the project
echo Building project...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

REM Start server in background
echo Starting server...
start "Voice PC Server" cmd /k "npm start"

REM Wait a moment for server to start
timeout /t 5 /nobreak >nul

REM Start ngrok
echo Starting ngrok tunnel...
start "ngrok" cmd /k "ngrok http 3000"

echo.
echo Both server and ngrok are starting...
echo Wait a moment, then check the ngrok window for your public URL
echo.
timeout /t 8 /nobreak >nul

echo Getting ngrok URL...
powershell -Command "try { $url = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels).tunnels[0].public_url; Write-Host ''; Write-Host 'SUCCESS! Your ngrok URL:' -ForegroundColor Green; Write-Host $url -ForegroundColor Yellow; Write-Host ''; Write-Host 'IMPORTANT: Update this URL in your Yandex Cloud Function!' -ForegroundColor Red; Write-Host 'Change WEBHOOK_URL to: ' -NoNewline; Write-Host ($url + '/command') -ForegroundColor Cyan } catch { Write-Host 'Ngrok not ready yet, check the ngrok window' -ForegroundColor Red }"

echo.
echo.
echo NEXT STEPS:
echo 1. Copy the URL above
echo 2. Go to Yandex Cloud Functions
echo 3. Edit your voice-pc-skill function  
echo 4. Update WEBHOOK_URL to the new ngrok URL + '/command'
echo 5. Save the function
echo 6. Test with Alice!
echo.
pause