@echo off
title Stopping Voice PC Controller
color 0C
echo Stopping all Voice PC processes...
powershell -Command "Get-Process -Name node,ngrok -ErrorAction SilentlyContinue | Stop-Process -Force"
echo Done! All processes stopped.
timeout /t 1 /nobreak >nul