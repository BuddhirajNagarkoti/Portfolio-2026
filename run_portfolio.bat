@echo off
echo ==========================================
echo   BRAINS' NEPAL ADVENTURE — PORTFOLIO
echo   Starting Local Development Server...
echo ==========================================
echo.

:: Open the browser immediately
start "" "http://localhost:8080"

:: Start the server (this will keep the window open)
npx -y http-server . -p 8080 -c-1
