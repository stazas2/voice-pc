@echo off
title Voice PC Server Logs
color 0A
echo ===============================================
echo   VOICE PC SERVER - VISIBLE MODE
echo   Showing detailed server logs
echo ===============================================
echo.

echo Starting Voice PC Server with visible logs...
echo Press Ctrl+C to stop server
echo.
node dist/server.js

echo.
echo Server stopped. Press any key to exit.
pause