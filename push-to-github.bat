@echo off
REM ================================================
REM Push to GitHub - Windows Script
REM ================================================

echo ================================================
echo Push WebRTC Project to GitHub
echo ================================================
echo.

REM Check if git is installed
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git is not installed!
    echo Please download and install Git from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo Git found: 
git --version
echo.

REM Get user information
set /p GIT_NAME="Enter your name: "
set /p GIT_EMAIL="Enter your email: "
set /p GITHUB_USERNAME="Enter your GitHub username: "
set /p REPO_NAME="Enter repository name (default: webrtc-genesys-integration): "

if "%REPO_NAME%"=="" set REPO_NAME=webrtc-genesys-integration

echo.
echo Configuration:
echo   Name: %GIT_NAME%
echo   Email: %GIT_EMAIL%
echo   GitHub: %GITHUB_USERNAME%
echo   Repository: %REPO_NAME%
echo.

set /p CONFIRM="Is this correct? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Setup cancelled
    pause
    exit /b 0
)

echo.
echo ================================================
echo Step 1: Configuring Git
echo ================================================

git config --global user.name "%GIT_NAME%"
git config --global user.email "%GIT_EMAIL%"
echo Git configured successfully!

echo.
echo ================================================
echo Step 2: Initializing Repository
echo ================================================

REM Check if already initialized
if exist .git (
    echo Repository already initialized
) else (
    git init
    echo Repository initialized
)

echo.
echo ================================================
echo Step 3: Adding Files
echo ================================================

git add .
echo All files staged for commit

echo.
echo ================================================
echo Step 4: Creating Initial Commit
echo ================================================

git commit -m "Initial commit: WebRTC Genesys Integration v1.0.0"
if %ERRORLEVEL% EQU 0 (
    echo Commit created successfully!
) else (
    echo No changes to commit or commit failed
)

echo.
echo ================================================
echo Step 5: Setting Up Remote
echo ================================================

REM Check if remote exists
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Remote 'origin' already exists
    git remote -v
    set /p UPDATE_REMOTE="Update remote URL? (y/n): "
    if /i "%UPDATE_REMOTE%"=="y" (
        git remote set-url origin https://github.com/%GITHUB_USERNAME%/%REPO_NAME%.git
        echo Remote URL updated!
    )
) else (
    git remote add origin https://github.com/%GITHUB_USERNAME%/%REPO_NAME%.git
    echo Remote 'origin' added!
)

echo.
echo ================================================
echo IMPORTANT: Create GitHub Repository
echo ================================================
echo.
echo Before pushing, you need to create the repository on GitHub:
echo.
echo 1. Go to: https://github.com/new
echo 2. Repository name: %REPO_NAME%
echo 3. Description: WebRTC Client and Server with Genesys PureEngage Integration
echo 4. Choose Public or Private
echo 5. DO NOT initialize with README, .gitignore, or license
echo 6. Click "Create repository"
echo.
set /p REPO_CREATED="Have you created the repository? (y/n): "

if /i not "%REPO_CREATED%"=="y" (
    echo.
    echo Please create the repository first, then run this script again
    echo Or manually run: git push -u origin main
    pause
    exit /b 0
)

echo.
echo ================================================
echo Step 6: Pushing to GitHub
echo ================================================
echo.
echo You will be asked for your credentials:
echo   Username: %GITHUB_USERNAME%
echo   Password: Your Personal Access Token (NOT your GitHub password)
echo.
echo If you don't have a token, create one:
echo   https://github.com/settings/tokens
echo.
pause

git branch -M main
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo SUCCESS! Repository pushed to GitHub!
    echo ================================================
    echo.
    echo Repository URL:
    echo   https://github.com/%GITHUB_USERNAME%/%REPO_NAME%
    echo.
    echo Next steps:
    echo   1. Visit your repository on GitHub
    echo   2. Add topics/tags for discoverability
    echo   3. Enable Issues if needed
    echo   4. Share with your team!
    echo.
) else (
    echo.
    echo ================================================
    echo Push Failed
    echo ================================================
    echo.
    echo Common issues:
    echo   1. Repository doesn't exist on GitHub
    echo   2. Wrong credentials (use Personal Access Token)
    echo   3. Network issues
    echo.
    echo Try manually:
    echo   git push -u origin main
    echo.
)

echo.
echo To update in the future:
echo   git add .
echo   git commit -m "Your commit message"
echo   git push
echo.

pause

