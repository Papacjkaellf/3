@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ======================================
echo CSV to MySQL Application Setup
echo ======================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found. Please install Node.js from:
    echo https://nodejs.org/en/download/
    echo.
    echo Run this batch file again after installation.
    echo.
    start https://nodejs.org/en/download/
    pause
    exit /b
)

:: Check Node.js version
for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
echo Node.js version detected: %NODE_VERSION%

:: Install dependencies if not installed
if not exist "node_modules\" (
    echo.
    echo Installing dependencies...
    echo This may take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo Error installing dependencies.
        pause
        exit /b
    )
    echo Dependencies successfully installed.
) else (
    echo Dependencies already installed.
)

:: Find available port for the application
set PORT=5000
set PORT_FOUND=0

:CHECK_PORT
netstat -ano | findstr ":%PORT%" >nul
if %errorlevel% equ 0 (
    :: If port is busy, increment by 1 and check again
    set /a PORT+=1
    if %PORT% LSS 5020 (
        goto CHECK_PORT
    ) else (
        echo.
        echo WARNING: Could not find an available port in range 5000-5020.
        echo.
        echo 1. Try to start the server on port 5000 anyway
        echo 2. Exit
        echo.
        choice /C 12 /M "Choose an option"
        if !errorlevel! equ 2 exit /b
        set PORT=5000
    )
) else (
    set PORT_FOUND=1
)

:: If port 5000 is busy but found another available port
if %PORT% NEQ 5000 (
    echo.
    echo Port 5000 is busy, will use port %PORT% instead.
    echo.
)

:: Modify server/index.ts to use the found port
echo Configuring server for port %PORT%...
powershell -Command "(Get-Content server/index.ts) -replace 'const port = 5000', 'const port = %PORT%' | Set-Content server/index.ts"

:: Start server in background
echo.
echo Starting server...
start /b cmd /c "npm run dev"

:: Wait for server to start
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

:: Open browser
echo Opening browser...
start http://localhost:%PORT%

echo.
echo ======================================
echo Server running at http://localhost:%PORT%
echo ======================================
echo.
echo Press Ctrl+C in this window to stop the server when finished.
echo.

:: Wait for key press to exit
pause
taskkill /f /im node.exe >nul 2>nul
echo Server stopped.

:: Restore original port in configuration if it was changed
if %PORT% NEQ 5000 (
    echo Restoring default port in configuration...
    powershell -Command "(Get-Content server/index.ts) -replace 'const port = %PORT%', 'const port = 5000' | Set-Content server/index.ts"
)

timeout /t 2 >nul