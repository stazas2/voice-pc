@echo off
title Voice PC Controller (Local Server Only)
echo Starting Voice PC Controller - Local Server...
echo.
echo This starts ONLY the local command server (no ngrok needed for cloud setup)
echo.

REM Stop any existing processes
echo Stopping existing Node.js processes...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process -Force" 2>nul
timeout /t 2 /nobreak >nul

REM Build the project
echo Building project...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

REM Start the server
echo Starting local command server on port 3000...
echo Server will be available at: http://localhost:3000
echo.
call npm start

pause