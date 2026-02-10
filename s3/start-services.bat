@echo off
echo Starting S3 Dashboard Services
echo ================================

echo.
echo 1. Starting Next.js Development Server...
start "Next.js Server" cmd /k "npm run dev"

echo.
echo 2. Starting Python Resume Parser Service...
start "Python Service" cmd /k "cd python-service && python start.py"

echo.
echo Both services are starting...
echo - Next.js: http://localhost:3000
echo - Python Service: http://localhost:8000
echo.
echo Press any key to exit this window
pause > nul

