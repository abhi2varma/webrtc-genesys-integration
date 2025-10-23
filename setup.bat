@echo off
echo ========================================
echo WebRTC Genesys Integration Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo NPM version:
npm --version
echo.

echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo Dependencies installed successfully!
echo.

REM Check if .env file exists
if not exist .env (
    echo Creating .env file from template...
    if exist .env.example (
        copy .env.example .env
        echo .env file created. Please edit it with your configuration.
    ) else (
        echo Creating default .env file...
        (
            echo PORT=3000
            echo NODE_ENV=development
            echo.
            echo # Genesys Configuration
            echo GENESYS_SIP_SERVER=sip.your-genesys-domain.com
            echo GENESYS_SIP_PORT=5060
            echo GENESYS_WEBSOCKET_SERVER=wss://your-genesys-domain.com:8443
            echo GENESYS_REALM=your-realm
            echo GENESYS_TENANT=your-tenant
            echo.
            echo # STUN/TURN Server
            echo STUN_SERVER=stun:stun.l.google.com:19302
            echo TURN_SERVER=
            echo TURN_USERNAME=
            echo TURN_CREDENTIAL=
            echo.
            echo # Security
            echo ALLOWED_ORIGINS=http://localhost:3000
        ) > .env
        echo .env file created with defaults.
    )
    echo.
    echo IMPORTANT: Please edit .env file with your Genesys configuration!
    echo.
)

echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env file with your configuration
echo 2. Run 'npm start' to start the server
echo 3. Open http://localhost:3000 in your browser
echo.
echo For detailed documentation, see README.md
echo For quick start guide, see QUICK_START.md
echo For Genesys setup, see GENESYS_SETUP.md
echo.
pause



