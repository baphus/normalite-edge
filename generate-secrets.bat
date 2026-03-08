@echo off
REM Generate secure JWT secrets for production (Windows)
REM Run this script and copy the output to your deployment environment

echo Generate secure JWT secrets for Normalite EDGE
echo ============================================== 
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using Node.js:
    echo.
    node -e "const crypto = require('crypto'); console.log('JWT_ACCESS_SECRET=' + crypto.randomBytes(32).toString('hex')); console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(32).toString('hex'));"
) else (
    echo Node.js not found. Please install Node.js or use an online tool like:
    echo https://www.random.org/ or generate manually
)

echo.
echo Copy these values to your Render environment variables:
echo - Render Dashboard ^> Your Service ^> Environment ^> Add/Update
pause
