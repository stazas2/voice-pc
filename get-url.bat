@echo off
title Get ngrok URL
echo Getting current ngrok public URL...
echo.

powershell -Command "try { $url = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels).tunnels[0].public_url; Write-Host 'Current ngrok URL:'; Write-Host $url -ForegroundColor Green; Write-Host ''; Write-Host 'Webhook endpoint:'; Write-Host ($url + '/webhook') -ForegroundColor Yellow } catch { Write-Host 'Ngrok is not running' -ForegroundColor Red }"

echo.
pause