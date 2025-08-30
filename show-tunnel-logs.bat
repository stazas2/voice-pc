@echo off
title Cloudflare Tunnel Logs
color 0B
echo ===============================================
echo   CLOUDFLARE TUNNEL - VISIBLE MODE
echo   Showing logs and status
echo ===============================================
echo.

echo Stopping hidden tunnel...
powershell -Command "Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
timeout /t 2 /nobreak >nul

echo Starting Cloudflare Tunnel with visible logs...
echo Press Ctrl+C to stop tunnel
echo.
cloudflared.exe tunnel run --token eyJhIjoiNTEyNDU1M2RjMjAwMDIzZjRmZWMwNDRiNzg4MWRjNGUiLCJ0IjoiZTFiMTVjMTItZTJiNC00MjNhLWFmMzctNTU2YWU0NjY3MWI2IiwicyI6IlkyVTBZekZpWWprdFlXWmlOUzAwT1Rjd0xUazBZamt0TjJWbU9UQXpNRGt5WmpNMSJ9

echo.
echo Tunnel stopped. Press any key to exit.
pause