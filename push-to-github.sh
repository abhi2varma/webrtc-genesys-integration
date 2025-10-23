#!/bin/bash

# ================================================
# Push to GitHub - Linux/Mac Script
# ================================================

set -e

echo "================================================"
echo "Push WebRTC Project to GitHub"
echo "================================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed!"
    echo "Please install git first:"
    echo "  Ubuntu/Debian: sudo apt install git"
    echo "  Mac: brew install git"
    exit 1
fi

echo "Git found: $(git --version)"
echo ""

# Get user information
read -p "Enter your name: " GIT_NAME
read -p "Enter your email: " GIT_EMAIL
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter repository name (default: webrtc-genesys-integration): " REPO_NAME

REPO_NAME=${REPO_NAME:-webrtc-genesys-integration}

echo ""
echo "Configuration:"
echo "  Name: $GIT_NAME"
echo "  Email: $GIT_EMAIL"
echo "  GitHub: $GITHUB_USERNAME"
echo "  Repository: $REPO_NAME"
echo ""

read -p "Is this correct? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Setup cancelled"
    exit 0
fi

echo ""
echo "================================================"
echo "Step 1: Configuring Git"
echo "================================================"

git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"
echo "✓ Git configured successfully!"

echo ""
echo "================================================"
echo "Step 2: Initializing Repository"
echo "================================================"

if [ -d .git ]; then
    echo "✓ Repository already initialized"
else
    git init
    echo "✓ Repository initialized"
fi

echo ""
echo "================================================"
echo "Step 3: Adding Files"
echo "================================================"

git add .
echo "✓ All files staged for commit"

echo ""
echo "================================================"
echo "Step 4: Creating Initial Commit"
echo "================================================"

if git commit -m "Initial commit: WebRTC Genesys Integration v1.0.0"; then
    echo "✓ Commit created successfully!"
else
    echo "⚠ No changes to commit or commit failed"
fi

echo ""
echo "================================================"
echo "Step 5: Setting Up Remote"
echo "================================================"

if git remote get-url origin &> /dev/null; then
    echo "ℹ Remote 'origin' already exists"
    git remote -v
    read -p "Update remote URL? (y/n): " UPDATE_REMOTE
    if [ "$UPDATE_REMOTE" = "y" ]; then
        git remote set-url origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
        echo "✓ Remote URL updated!"
    fi
else
    git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    echo "✓ Remote 'origin' added!"
fi

echo ""
echo "================================================"
echo "IMPORTANT: Create GitHub Repository"
echo "================================================"
echo ""
echo "Before pushing, you need to create the repository on GitHub:"
echo ""
echo "1. Go to: https://github.com/new"
echo "2. Repository name: $REPO_NAME"
echo "3. Description: WebRTC Client and Server with Genesys PureEngage Integration"
echo "4. Choose Public or Private"
echo "5. DO NOT initialize with README, .gitignore, or license"
echo "6. Click 'Create repository'"
echo ""
read -p "Have you created the repository? (y/n): " REPO_CREATED

if [ "$REPO_CREATED" != "y" ]; then
    echo ""
    echo "Please create the repository first, then run this script again"
    echo "Or manually run: git push -u origin main"
    exit 0
fi

echo ""
echo "================================================"
echo "Step 6: Pushing to GitHub"
echo "================================================"
echo ""
echo "You will be asked for your credentials:"
echo "  Username: $GITHUB_USERNAME"
echo "  Password: Your Personal Access Token (NOT your GitHub password)"
echo ""
echo "If you don't have a token, create one:"
echo "  https://github.com/settings/tokens"
echo ""
read -p "Press Enter to continue..."

git branch -M main

if git push -u origin main; then
    echo ""
    echo "================================================"
    echo "SUCCESS! Repository pushed to GitHub!"
    echo "================================================"
    echo ""
    echo "Repository URL:"
    echo "  https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo "Next steps:"
    echo "  1. Visit your repository on GitHub"
    echo "  2. Add topics/tags for discoverability"
    echo "  3. Enable Issues if needed"
    echo "  4. Share with your team!"
    echo ""
else
    echo ""
    echo "================================================"
    echo "Push Failed"
    echo "================================================"
    echo ""
    echo "Common issues:"
    echo "  1. Repository doesn't exist on GitHub"
    echo "  2. Wrong credentials (use Personal Access Token)"
    echo "  3. Network issues"
    echo ""
    echo "Try manually:"
    echo "  git push -u origin main"
    echo ""
    exit 1
fi

echo ""
echo "To update in the future:"
echo "  git add ."
echo "  git commit -m \"Your commit message\""
echo "  git push"
echo ""

