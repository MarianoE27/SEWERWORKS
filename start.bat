@echo off
title SewerWorks - Development Server
color 0B

echo ==========================================================
echo               SEWERWORKS DEVELOPMENT SERVER
echo ==========================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/ before running this script.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists, if not install
if not exist "node_modules\" (
    echo [INFO] node_modules directory not found.
    echo [INFO] Running "npm install" to install dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] npm install failed. Please check the errors above.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting Vite development server on port 3000...
echo [INFO] Opening http://localhost:3000 in your browser...
echo.

:: Open default browser
start http://localhost:3000

:: Start development server
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Server stopped or encountered an error.
    pause
)
