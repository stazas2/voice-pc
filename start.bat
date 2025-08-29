@echo off
title Voice PC - Local Server Only
color 0B
echo ===============================================
echo   VOICE PC CONTROLLER - LOCAL SERVER
echo ===============================================
echo.
echo NOTE: Use start-with-ngrok.bat for full setup
echo.

powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul

echo Building and starting local server...
call npm run build -s
if errorlevel 1 (color 0C && echo BUILD FAILED! && pause && exit /b 1)

echo Server starting on http://localhost:3000
call npm start

pause