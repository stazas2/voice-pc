@echo off
title Stop Voice PC Controller
echo Stopping Voice PC Controller...
echo.

echo Stopping Node.js processes...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process -Force" 2>nul

echo Stopping ngrok processes...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq 'ngrok'} | Stop-Process -Force" 2>nul

echo.
echo All processes stopped.
timeout /t 2 /nobreak >nul