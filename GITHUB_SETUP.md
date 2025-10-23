# Push to GitHub Guide

## Quick Steps

### 1. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `webrtc-genesys-integration` (or your choice)
3. Description: `WebRTC Client and Server with Genesys PureEngage Integration`
4. Choose: **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 2. Push Your Code

After creating the repository, GitHub will show you commands. Use these:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: WebRTC Genesys Integration v1.0.0"

# Add your GitHub repository as remote
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/webrtc-genesys-integration.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Detailed Instructions

### Using HTTPS (Recommended for beginners)

```bash
# 1. Configure git (first time only)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 2. Initialize repository
git init

# 3. Add files
git add .

# 4. Check what will be committed
git status

# 5. Create initial commit
git commit -m "Initial commit: WebRTC Genesys Integration v1.0.0"

# 6. Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/webrtc-genesys-integration.git

# 7. Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** GitHub will ask for your credentials:
- Username: Your GitHub username
- Password: Your Personal Access Token (not your GitHub password)

#### Creating Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: `WebRTC Project`
4. Expiration: Choose duration
5. Select scopes: **repo** (full control)
6. Click "Generate token"
7. **COPY THE TOKEN** (you won't see it again!)
8. Use this token as password when pushing

### Using SSH (Advanced)

If you prefer SSH:

```bash
# 1. Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your.email@example.com"

# 2. Copy public key
cat ~/.ssh/id_ed25519.pub  # Linux/Mac
type %USERPROFILE%\.ssh\id_ed25519.pub  # Windows

# 3. Add to GitHub
# Go to: https://github.com/settings/ssh/new
# Paste your public key

# 4. Add remote with SSH
git remote add origin git@github.com:YOUR_USERNAME/webrtc-genesys-integration.git

# 5. Push
git push -u origin main
```

## Repository Description

**Suggested repository description:**

```
WebRTC Client and Server with Genesys PureEngage Integration

A production-ready WebRTC solution supporting both peer-to-peer calls and SIP integration with Genesys PureEngage contact center platform.

Features:
- WebRTC P2P audio/video calling
- Genesys PureEngage SIP.js integration
- Modern responsive web interface
- Full call controls (mute, hold, transfer)
- Internet deployment ready
- Comprehensive documentation

Tech Stack: Node.js, Express, Socket.IO, SIP.js, WebRTC
```

## Repository Topics (Tags)

Add these topics to your GitHub repository for better discoverability:

```
webrtc
genesys
pureengage
sip
voip
contact-center
nodejs
socketio
real-time
video-calling
audio-calling
```

## README Badges

Add these to the top of your README.md:

```markdown
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-orange)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
```

## .gitignore Verification

Make sure these are in `.gitignore`:

```
node_modules/
.env
*.log
dist/
.DS_Store
```

## What Gets Committed

✅ **Included:**
- Source code (server.js, public/)
- Documentation (*.md)
- Configuration templates (.env.example)
- Setup scripts
- package.json
- LICENSE

❌ **Excluded:**
- node_modules/ (dependencies)
- .env (secrets)
- Log files
- Build artifacts

## After Pushing

### Set Up GitHub Pages (Optional)

You can host the documentation on GitHub Pages:

1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` → `/docs` (if you move docs there)
4. Click Save

### Enable Issues

1. Go to repository Settings
2. Check "Issues"
3. Users can report bugs and request features

### Add Collaborators

Settings → Collaborators → Add people

### Create Releases

1. Go to Releases → "Create a new release"
2. Tag: `v1.0.0`
3. Title: `Version 1.0.0 - Initial Release`
4. Description: Copy from CHANGELOG.md
5. Attach packaged files (optional)

## Updating Repository

After making changes:

```bash
# Check changes
git status

# Add changed files
git add .

# Or add specific files
git add server.js public/app.js

# Commit with message
git commit -m "Fix: audio mute issue"

# Push to GitHub
git push
```

## Common Issues

### Push Rejected

```bash
# If remote has changes you don't have
git pull --rebase
git push
```

### Wrong Remote URL

```bash
# Check current remote
git remote -v

# Change remote URL
git remote set-url origin https://github.com/YOUR_USERNAME/webrtc-genesys-integration.git
```

### Large Files

If you accidentally added large files:

```bash
# Remove from git but keep locally
git rm --cached large-file.zip

# Add to .gitignore
echo "large-file.zip" >> .gitignore

# Commit
git commit -m "Remove large file"
git push
```

## Cloning Your Repository

Others (or you on another machine) can clone:

```bash
git clone https://github.com/YOUR_USERNAME/webrtc-genesys-integration.git
cd webrtc-genesys-integration
npm install
cp .env.example .env
# Edit .env
npm start
```

## Branching Strategy

### For Development

```bash
# Create development branch
git checkout -b develop

# Make changes...

# Push development branch
git push -u origin develop
```

### For Features

```bash
# Create feature branch
git checkout -b feature/screen-sharing

# Make changes...

# Push feature branch
git push -u origin feature/screen-sharing

# Create Pull Request on GitHub
```

## Repository Structure on GitHub

```
webrtc-genesys-integration/
├── .github/
│   └── workflows/           # (Optional) CI/CD
├── public/                  # Client files
├── *.md                     # Documentation
├── server.js               # Main server
├── package.json            # Dependencies
└── README.md               # Main documentation
```

## Making It Popular

1. **Star your own repository** ⭐
2. **Share on social media**
3. **Add to your profile README**
4. **Submit to awesome lists:**
   - awesome-webrtc
   - awesome-nodejs
   - awesome-genesys

## Support Badge

Add this to README.md to let users support you:

```markdown
## Support

If you find this project helpful, please ⭐ star it on GitHub!

[![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/webrtc-genesys-integration?style=social)](https://github.com/YOUR_USERNAME/webrtc-genesys-integration)
```

## License Badge

```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

---

## Quick Reference

```bash
# First time setup
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main

# Daily workflow
git add .
git commit -m "Your commit message"
git push

# Check status
git status
git log --oneline

# Undo changes
git checkout -- filename     # Discard local changes
git reset HEAD~1             # Undo last commit (keep changes)
git reset --hard HEAD~1      # Undo last commit (discard changes)
```

---

**Ready to push? Follow the steps above!** 🚀

