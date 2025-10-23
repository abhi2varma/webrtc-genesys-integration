# Installation Guide

Complete installation instructions for WebRTC Genesys Integration.

## Table of Contents

1. [Quick Installation](#quick-installation)
2. [Detailed Installation](#detailed-installation)
3. [Platform-Specific Instructions](#platform-specific-instructions)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Quick Installation

### Prerequisites Check

Ensure you have:
- ✅ Node.js 14.x or higher
- ✅ npm 6.x or higher
- ✅ Git (optional)

### 1-Minute Install

**Windows:**
```cmd
npm install
copy .env.example .env
npm start
```

**Linux/Mac:**
```bash
npm install
cp .env.example .env
npm start
```

Open browser: `http://localhost:3000`

---

## Detailed Installation

### Step 1: Install Node.js

#### Windows
1. Download from: https://nodejs.org/
2. Run installer
3. Restart terminal
4. Verify:
   ```cmd
   node --version
   npm --version
   ```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Mac (using Homebrew)
```bash
brew install node
```

### Step 2: Download/Clone Project

**Option A: Download ZIP**
1. Download project ZIP
2. Extract to desired location
3. Open terminal in extracted folder

**Option B: Git Clone**
```bash
git clone <repository-url>
cd WebRTC
```

### Step 3: Install Dependencies

```bash
npm install
```

This installs:
- express (Web framework)
- socket.io (Real-time communication)
- cors (Security)
- dotenv (Configuration)
- sip.js (SIP protocol)

### Step 4: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit configuration
nano .env  # or use any text editor
```

**Minimum Configuration (for testing):**
```env
PORT=3000
NODE_ENV=development
STUN_SERVER=stun:stun.l.google.com:19302
ALLOWED_ORIGINS=http://localhost:3000
```

**Full Configuration (with Genesys):**
```env
PORT=3000
NODE_ENV=development

# Your Genesys details
GENESYS_WEBSOCKET_SERVER=wss://your-genesys-server:8443/ws
GENESYS_SIP_SERVER=your-genesys-server
GENESYS_SIP_PORT=5060
GENESYS_REALM=your-realm
GENESYS_TENANT=your-tenant

# STUN/TURN
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=turn:your-turn-server:3478
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-password

# Security
ALLOWED_ORIGINS=http://localhost:3000
```

### Step 5: Start Application

**Development Mode:**
```bash
npm start
```

**Production Mode:**
```bash
npm run production
```

**Development with Auto-reload:**
```bash
npm run dev
```

---

## Platform-Specific Instructions

### Windows 10/11

#### Using PowerShell

```powershell
# 1. Open PowerShell as Administrator
# 2. Navigate to project
cd C:\path\to\WebRTC

# 3. Run setup script
.\setup.bat

# 4. Start application
npm start
```

#### Using Command Prompt

```cmd
cd C:\path\to\WebRTC
npm install
copy .env.example .env
npm start
```

#### Common Windows Issues

**Issue: 'node' is not recognized**
- Solution: Restart terminal after Node.js installation
- Or add to PATH: `C:\Program Files\nodejs\`

**Issue: PowerShell execution policy**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Linux (Ubuntu/Debian)

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone/download project
cd /opt
sudo mkdir webrtc
sudo chown $USER:$USER webrtc
cd webrtc

# 4. Run setup script
chmod +x setup.sh
./setup.sh

# 5. Start application
npm start
```

### Linux (CentOS/RHEL)

```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Continue with standard installation
npm install
cp .env.example .env
npm start
```

### Mac OS

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Navigate to project
cd /path/to/WebRTC

# Run setup
chmod +x setup.sh
./setup.sh

# Start
npm start
```

### Docker Installation

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  webrtc:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
```

Run:
```bash
docker-compose up -d
```

---

## Verification

### 1. Check Server is Running

```bash
# Check process
ps aux | grep node

# Check port
netstat -an | grep 3000  # Linux/Mac
netstat -an | findstr 3000  # Windows
```

### 2. Test Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"...","connections":0,"rooms":0}

# Config endpoint
curl http://localhost:3000/api/config
```

### 3. Browser Test

1. Open: `http://localhost:3000`
2. You should see the login page
3. Check browser console (F12) for errors

### 4. Test WebRTC P2P

**First Browser/Tab:**
1. Login:
   - Agent ID: `agent001`
   - Extension: `1001`
   - (Leave SIP fields empty)
2. Room ID: `test-123`
3. Click "Start Call"

**Second Browser/Tab:**
1. Login:
   - Agent ID: `agent002`
   - Extension: `1002`
2. Room ID: `test-123`
3. Click "Start Call"

You should connect!

---

## Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Dependencies Not Installing

**Error:** `npm ERR! code ECONNREFUSED`

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Use different registry
npm config set registry https://registry.npmjs.org/

# Retry installation
rm -rf node_modules package-lock.json
npm install
```

### Cannot Find Module

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Ensure you're in project directory
cd /path/to/WebRTC

# Reinstall dependencies
npm install
```

### Permission Denied (Linux/Mac)

**Error:** `EACCES: permission denied`

**Solution:**
```bash
# Option 1: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile

# Option 2: Use sudo (not recommended)
sudo npm install

# Option 3: Change ownership
sudo chown -R $USER:$USER /path/to/WebRTC
```

### Browser Not Loading

**Checklist:**
- ✅ Server is running (`npm start`)
- ✅ No errors in terminal
- ✅ Correct URL: `http://localhost:3000`
- ✅ Firewall not blocking
- ✅ Try different browser
- ✅ Clear browser cache (Ctrl+Shift+Del)

### Genesys Connection Fails

**Common Issues:**

1. **WebSocket URL incorrect**
   - Verify in Genesys admin console
   - Should be: `wss://hostname:8443/ws`

2. **Credentials wrong**
   - Check SIP username/password
   - Verify realm and tenant

3. **Network not reachable**
   - Ping Genesys server
   - Check firewall rules
   - VPN connected (if required)

4. **SSL Certificate issues**
   - Browser may block self-signed certs
   - Accept certificate in browser first

### No Audio/Video

**Checklist:**
- ✅ Browser permissions granted (camera/mic)
- ✅ Correct devices selected
- ✅ Not muted in browser tab
- ✅ Try different browser
- ✅ Check browser console for errors

**Test devices:**
```
chrome://settings/content/camera
chrome://settings/content/microphone
```

### TURN Server Not Working

**Debug Steps:**

1. Test TURN connectivity:
   - Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
   - Add your TURN server details
   - Look for "relay" type candidates

2. Check credentials:
   ```bash
   # If self-hosted
   turnutils_uclient -v -u username -w password your-turn-server
   ```

3. Verify firewall:
   - TCP/UDP 3478 open
   - UDP 49152-65535 open

---

## Post-Installation

### Security Hardening

1. **Change default ports**
2. **Use strong passwords**
3. **Enable firewall**
4. **Keep dependencies updated:**
   ```bash
   npm audit
   npm update
   ```

### Optional: Install as Service

**Windows (using NSSM):**
```cmd
nssm install WebRTC "C:\Program Files\nodejs\node.exe" "C:\path\to\WebRTC\server.js"
nssm start WebRTC
```

**Linux (using systemd):**
```bash
sudo nano /etc/systemd/system/webrtc.service
```

Add:
```ini
[Unit]
Description=WebRTC Genesys Integration
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/webrtc
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable webrtc
sudo systemctl start webrtc
```

### Performance Monitoring

```bash
# Install monitoring tools
npm install -g pm2

# Start with PM2
pm2 start server.js --name webrtc

# Monitor
pm2 monit
```

---

## Getting Help

### Documentation

- **README.md** - Overview and features
- **QUICK_START.md** - 5-minute guide
- **GENESYS_SETUP.md** - Genesys configuration
- **DEPLOYMENT_INTERNET.md** - Production deployment
- **TURN_SERVER_SETUP.md** - TURN server setup

### Support

- Check logs in terminal
- Browser console (F12)
- GitHub Issues
- Email: support@yourcompany.com

### Logs Location

```
Terminal output: stdout
PM2 logs: ~/.pm2/logs/
Nginx logs: /var/log/nginx/
System logs: /var/log/syslog (Linux)
```

---

## Next Steps

After successful installation:

1. ✅ **Test locally** - Use P2P mode
2. ✅ **Configure Genesys** - See GENESYS_SETUP.md
3. ✅ **Setup TURN** - See TURN_SERVER_SETUP.md
4. ✅ **Deploy to production** - See DEPLOYMENT_INTERNET.md
5. ✅ **Customize UI** - Edit public/styles.css

---

## Uninstallation

### Remove Application

```bash
# Stop server
pm2 stop webrtc
pm2 delete webrtc

# Remove files
rm -rf /path/to/WebRTC

# Remove global packages (optional)
npm uninstall -g pm2
```

### Remove Node.js

**Windows:**
- Control Panel → Programs → Uninstall Node.js

**Linux:**
```bash
sudo apt remove nodejs
sudo apt autoremove
```

**Mac:**
```bash
brew uninstall node
```

---

**Installation complete! Enjoy using WebRTC Genesys Integration! 🎉**

