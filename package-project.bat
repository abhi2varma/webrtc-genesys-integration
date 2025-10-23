@echo off
REM ================================================
REM WebRTC Genesys - Package Project Script
REM Creates a distribution package
REM ================================================

echo ================================================
echo WebRTC Genesys Integration - Packaging
echo ================================================
echo.

REM Set variables
set PROJECT_NAME=webrtc-genesys-integration
set VERSION=1.0.0
set OUTPUT_DIR=dist
set PACKAGE_NAME=%PROJECT_NAME%-v%VERSION%

echo Project: %PROJECT_NAME%
echo Version: %VERSION%
echo.

REM Create dist directory
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
if exist "%OUTPUT_DIR%\%PACKAGE_NAME%" rmdir /s /q "%OUTPUT_DIR%\%PACKAGE_NAME%"
mkdir "%OUTPUT_DIR%\%PACKAGE_NAME%"

echo Copying files...

REM Copy main files
copy server.js "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy server-https.js "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy package.json "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy .gitignore "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy LICENSE "%OUTPUT_DIR%\%PACKAGE_NAME%\"

REM Copy documentation
copy README.md "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy QUICK_START.md "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy INSTALLATION.md "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy GENESYS_SETUP.md "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy DEPLOYMENT_INTERNET.md "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy TURN_SERVER_SETUP.md "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy PROJECT_STRUCTURE.md "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy CHANGELOG.md "%OUTPUT_DIR%\%PACKAGE_NAME%\"

REM Copy configuration templates
copy .env.example "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy config.production.example "%OUTPUT_DIR%\%PACKAGE_NAME%\"

REM Copy setup scripts
copy setup.bat "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy setup.sh "%OUTPUT_DIR%\%PACKAGE_NAME%\"
copy deploy.sh "%OUTPUT_DIR%\%PACKAGE_NAME%\"

REM Copy public directory
xcopy /E /I /Y public "%OUTPUT_DIR%\%PACKAGE_NAME%\public"

echo.
echo Files copied successfully!
echo.

REM Create ZIP archive (requires PowerShell)
echo Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%OUTPUT_DIR%\%PACKAGE_NAME%' -DestinationPath '%OUTPUT_DIR%\%PACKAGE_NAME%.zip' -Force"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo Package created successfully!
    echo ================================================
    echo.
    echo Location: %OUTPUT_DIR%\%PACKAGE_NAME%.zip
    echo.
    echo Package includes:
    echo   - Server files
    echo   - Client files
    echo   - Complete documentation
    echo   - Setup scripts
    echo   - Configuration templates
    echo.
    echo Package is ready for distribution!
    echo.
) else (
    echo.
    echo WARNING: Could not create ZIP file
    echo Folder package available at: %OUTPUT_DIR%\%PACKAGE_NAME%
    echo.
)

REM Create checksum
echo Creating checksum...
powershell -Command "(Get-FileHash '%OUTPUT_DIR%\%PACKAGE_NAME%.zip' -Algorithm SHA256).Hash" > "%OUTPUT_DIR%\%PACKAGE_NAME%.zip.sha256"
echo Checksum saved to: %OUTPUT_DIR%\%PACKAGE_NAME%.zip.sha256
echo.

pause

