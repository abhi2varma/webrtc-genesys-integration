# Complete DigitalOcean Setup Guide for Asterisk

Step-by-step guide to set up Asterisk on DigitalOcean from your Windows machine.

## Prerequisites

- Credit card (for DigitalOcean account)
- Domain name (optional but recommended)
- 30 minutes of time

## Part 1: Create DigitalOcean Account

### Step 1: Sign Up

1. Go to: **https://www.digitalocean.com/**
2. Click "Sign Up"
3. Create account with:
   - Email
   - Password
   Or sign up with Google/GitHub

4. **Get Free Credit:**
   - Use referral code for $200 credit (60 days)
   - Or $100 credit from GitHub Student Pack
   - Link: https://m.do.co/c/free200credit

### Step 2: Add Payment Method

1. Go to Account → Billing
2. Add credit card
3. DigitalOcean charges $0 until you use resources

## Part 2: Create Droplet (Server)

### Step 1: Create New Droplet

1. Click **"Create"** → **"Droplets"**

2. **Choose an image:**
   - Select: **Ubuntu 22.04 (LTS) x64**

3. **Choose a plan:**
   - Select: **Basic**
   - CPU: **Regular**
   - Size: **$6/month** (2 GB RAM, 1 CPU, 50 GB SSD, 2 TB transfer)
   - This is perfect for testing up to 20-30 concurrent calls

4. **Choose a datacenter region:**
   - Select closest to you:
     - US: New York, San Francisco
     - Europe: London, Frankfurt, Amsterdam
     - Asia: Singapore, Bangalore

5. **Authentication:**
   
   **Option A: SSH Key (More Secure)**
   - On Windows PowerShell, generate key:
     ```powershell
     ssh-keygen -t ed25519 -C "your_email@example.com"
     # Press Enter to accept default location
     # Optional: Enter passphrase or leave blank
     
     # Display public key
     type $env:USERPROFILE\.ssh\id_ed25519.pub
     ```
   - Copy the output
   - In DigitalOcean, click "New SSH Key"
   - Paste your public key
   - Name it: "My Windows PC"
   - Click "Add SSH Key"
   
   **Option B: Password (Easier)**
   - Click "Password"
   - You'll receive root password via email

6. **Finalize details:**
   - Hostname: `asterisk-pbx` or `asterisk-production`
   - Tags: `asterisk`, `webrtc` (optional)
   - Select: **Monitoring** (free)

7. **Click "Create Droplet"**

Wait 1-2 minutes for droplet to be created.

### Step 2: Note Your IP Address

Once created, you'll see:
- **Droplet name:** asterisk-pbx
- **IP address:** Something like `159.65.123.456`

**Copy this IP address!** You'll need it.

## Part 3: Connect to Your Droplet

### From Windows PowerShell

```powershell
# Open PowerShell
# Press Windows Key, type "PowerShell", press Enter

# Connect to your droplet (replace YOUR_DROPLET_IP)
ssh root@YOUR_DROPLET_IP

# If using SSH key, it connects automatically
# If using password, enter the password from email

# First time connecting, you'll see:
# "Are you sure you want to continue connecting (yes/no/[fingerprint])?"
# Type: yes
```

**You're now logged into your server!** 🎉

## Part 4: Configure DNS (Optional but Recommended)

### If You Have a Domain:

1. **Go to your domain registrar** (GoDaddy, Namecheap, Cloudflare, etc.)

2. **Add A Record:**
   ```
   Type: A
   Name: asterisk
   Value: YOUR_DROPLET_IP
   TTL: 3600
   ```

3. **Wait 5-10 minutes** for DNS propagation

4. **Test:**
   ```powershell
   nslookup asterisk.yourcompany.com
   # Should return your droplet IP
   ```

### If You Don't Have a Domain:

You can use the IP address directly for testing, but:
- ⚠️ SSL certificate won't work with IP
- ⚠️ WebRTC requires SSL in production
- ✅ OK for testing with Chrome `chrome://flags` → "Insecure origins treated as secure"

## Part 5: Run Asterisk Setup

### Method 1: Download from GitHub (After Pushing)

```bash
# If you've pushed to GitHub
wget https://raw.githubusercontent.com/YOUR_USERNAME/webrtc-genesys-integration/main/asterisk-quick-setup.sh

# Make executable
chmod +x asterisk-quick-setup.sh

# Run setup
./asterisk-quick-setup.sh
```

### Method 2: Copy from Your Windows Machine

**From Windows PowerShell (in your project directory):**

```powershell
# Navigate to project
cd "C:\Users\Abhishek\Documents\VS Code\LearningProjects\WebRTC"

# Copy script to droplet
scp asterisk-quick-setup.sh root@YOUR_DROPLET_IP:/root/

# Connect to droplet
ssh root@YOUR_DROPLET_IP

# Make executable and run
chmod +x asterisk-quick-setup.sh
./asterisk-quick-setup.sh
```

### Method 3: Create Script Manually

```bash
# On your droplet, create the script
nano asterisk-quick-setup.sh

# Copy the entire contents of asterisk-quick-setup.sh
# Paste into nano
# Press Ctrl+X, then Y, then Enter to save

# Make executable
chmod +x asterisk-quick-setup.sh

# Run
./asterisk-quick-setup.sh
```

### Setup Script Will Ask:

```
Enter your domain name: asterisk.yourcompany.com
(or just use your IP: 159.65.123.456)

Enter your public IP address: 159.65.123.456
(this should already be your droplet IP)

Enter email for SSL certificate: your@email.com
```

**Setup takes 20-30 minutes** ⏳

You'll see:
- ✓ Dependencies installed
- ✓ Asterisk downloaded
- ✓ Asterisk compiled (this is the slow part)
- ✓ Asterisk installed
- ✓ SSL certificate obtained
- ✓ Asterisk configured
- ✓ Asterisk started

## Part 6: Verify Installation

### Check Asterisk is Running

```bash
# Check service status
systemctl status asterisk

# Should show: Active: active (running)

# Connect to Asterisk CLI
asterisk -rvvv

# You should see:
# Asterisk 20.x.x, Copyright (C) 1999 - 2023 Sangoma Technologies Corporation
# Connected to Asterisk 20.x.x currently running on asterisk-pbx (pid = 1234)

# Check endpoints
pjsip show endpoints

# Should show agent001 and agent002 as "Unavail"

# Exit
exit
```

### Test WebSocket Connection

**From your Windows machine:**

```powershell
# Install wscat if not already installed
npm install -g wscat

# Test WebSocket connection (with domain)
wscat -c wss://asterisk.yourcompany.com:8089/ws

# Or with IP (will show cert warning, that's OK for testing)
wscat -c wss://YOUR_DROPLET_IP:8089/ws --no-check

# If connected, you should see: Connected
# Press Ctrl+C to exit
```

### Check Firewall

```bash
# Check firewall status
ufw status

# Should show these ports allowed:
# 5060/tcp, 5060/udp (SIP)
# 8088/tcp (HTTP)
# 8089/tcp (HTTPS WebSocket)
# 10000:20000/udp (RTP media)
```

## Part 7: Update Your WebRTC Application

### On Your Windows Machine

Edit `.env` in your WebRTC project:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# PBX Mode
PBX_MODE=asterisk

# Asterisk Configuration
ASTERISK_WSS_URL=wss://asterisk.yourcompany.com:8089/ws
# Or with IP: wss://YOUR_DROPLET_IP:8089/ws
ASTERISK_REALM=asterisk.yourcompany.com
# Or with IP: YOUR_DROPLET_IP
ASTERISK_STUN=stun:stun.l.google.com:19302

# Security
ALLOWED_ORIGINS=http://localhost:3000
```

### Start Your Application

```powershell
# In your WebRTC directory
npm start
```

Open browser: **http://localhost:3000**

## Part 8: Test Everything

### Test 1: Agent Registration

1. Open: http://localhost:3000
2. Login with:
   - **Agent ID:** agent001
   - **Extension:** 1001
   - **SIP Username:** agent001
   - **SIP Password:** SecurePass123!
3. Click "Login & Register"

**Check on droplet:**
```bash
asterisk -rx "pjsip show endpoints"
# agent001 should now show "Avail" instead of "Unavail"
```

### Test 2: Agent-to-Agent Call

1. Open **two browser tabs** or windows
2. **Tab 1:** Login as agent001
3. **Tab 2:** Login as agent002 (password: SecurePass456!)
4. In Tab 1, enter: `1002` and click "Start Call"
5. Tab 2 should ring! Click "Start Call" to answer

**Monitor on droplet:**
```bash
asterisk -rvvv
pjsip set logger on
core set verbose 10

# Watch the call flow in real-time
```

### Test 3: Echo Test

1. Login as any agent
2. Enter extension: `600`
3. Click "Start Call"
4. Should hear "Echo test"
5. Speak - you should hear yourself!

### Test 4: Conference Room

1. Login as agent001 in one browser
2. Login as agent002 in another browser
3. Both call extension: `700`
4. You should all be in the same conference!

## Part 9: Add More Agents

### On Your Droplet

```bash
# Edit PJSIP configuration
nano /etc/asterisk/pjsip.conf

# Add new agent (copy this template)
```

Add:
```ini
[agent003](webrtc-endpoint)
auth=agent003-auth
aors=agent003

[agent003](webrtc-aor)

[agent003-auth](webrtc-auth)
username=agent003
password=YourPassword789!
```

```bash
# Save: Ctrl+X, then Y, then Enter

# Reload Asterisk
asterisk -rx "pjsip reload"

# Verify
asterisk -rx "pjsip show endpoints"
```

## Part 10: Enable Advanced Features

### Call Recording

```bash
# Edit dialplan
nano /etc/asterisk/extensions.conf
```

Find `[from-internal]` section and add:
```ini
exten => _1XXX,1,NoOp(Calling extension ${EXTEN})
    same => n,MixMonitor(/var/spool/asterisk/monitor/${UNIQUEID}.wav)
    same => n,Dial(PJSIP/${EXTEN},30)
    same => n,Hangup()
```

```bash
# Reload dialplan
asterisk -rx "dialplan reload"

# Recordings will be saved to:
# /var/spool/asterisk/monitor/
```

### Call Queue

```bash
# Create queue configuration
nano /etc/asterisk/queues.conf
```

Add:
```ini
[support]
strategy=ringall
timeout=30
member => PJSIP/agent001
member => PJSIP/agent002
```

Update dialplan:
```ini
exten => 800,1,Answer()
    same => n,Queue(support)
    same => n,Hangup()
```

```bash
# Reload
asterisk -rx "module reload app_queue.so"
asterisk -rx "dialplan reload"
```

## Part 11: Monitoring and Maintenance

### View Logs

```bash
# Real-time Asterisk logs
tail -f /var/log/asterisk/messages

# Full debug log
tail -f /var/log/asterisk/full

# System logs
journalctl -u asterisk -f
```

### Monitor Resource Usage

```bash
# Check CPU/memory
htop

# Check disk usage
df -h

# Check network
netstat -tulpn
```

### Restart Asterisk

```bash
# Graceful restart (waits for calls to end)
asterisk -rx "core restart gracefully"

# Or using systemctl
systemctl restart asterisk
```

### Update Asterisk

```bash
# Update system packages
apt update && apt upgrade -y

# Restart if kernel was updated
reboot
```

## Part 12: Cost Management

### Monitor Usage

1. Go to DigitalOcean Dashboard
2. Click your droplet
3. View graphs:
   - CPU usage
   - Bandwidth usage
   - Disk I/O

### Billing

- DigitalOcean charges hourly: $6/month = $0.009/hour
- You can destroy/create droplets anytime
- Bandwidth: 2 TB included (plenty for 1000+ calls)

### Snapshot (Backup)

1. Power off droplet
2. Take snapshot ($0.05/GB/month)
3. Can recreate droplet from snapshot anytime

### Destroy Droplet

When done testing:
1. Go to droplet settings
2. Click "Destroy"
3. Type droplet name to confirm
4. You only pay for hours used

## Troubleshooting

### Can't Connect via SSH

```powershell
# Test connectivity
Test-NetConnection YOUR_DROPLET_IP -Port 22

# Try with verbose
ssh -v root@YOUR_DROPLET_IP

# Reset root password from DigitalOcean console
# Droplet → Access → Launch Droplet Console
```

### Asterisk Won't Start

```bash
# Check what's wrong
systemctl status asterisk -l

# View error logs
journalctl -u asterisk -n 100

# Test configuration
asterisk -rx "core show config"

# Start in console mode for debugging
asterisk -cvvv
```

### No Audio in Calls

```bash
# Check RTP ports in firewall
ufw status | grep 10000

# If not open
ufw allow 10000:20000/udp
ufw reload

# Check Asterisk RTP settings
asterisk -rx "rtp show settings"

# Enable RTP debug
asterisk -rvvv
rtp set debug on
```

### SSL Certificate Failed

```bash
# Check if port 80 is accessible
curl http://YOUR_DOMAIN

# Try manual certificate
certbot certonly --standalone -d asterisk.yourcompany.com

# Check certificate
ls -la /etc/letsencrypt/live/asterisk.yourcompany.com/
```

### High CPU Usage

```bash
# Check what's using CPU
top

# If Asterisk is high
asterisk -rx "core show channels"
# Check for stuck channels

# Restart Asterisk
systemctl restart asterisk
```

## Quick Reference

### Useful Commands

```bash
# Asterisk CLI
asterisk -rvvv              # Connect to CLI
asterisk -rx "COMMAND"      # Execute command

# Common CLI commands
pjsip show endpoints        # Show all agents
pjsip show registrations    # Show registered agents
core show channels          # Show active calls
dialplan show              # Show dialplan
pjsip set logger on        # Enable SIP debugging
rtp set debug on           # Enable RTP debugging
core reload                # Reload everything
module reload res_pjsip    # Reload SIP module
exit                       # Exit CLI

# System
systemctl status asterisk   # Check status
systemctl restart asterisk  # Restart service
systemctl stop asterisk     # Stop service
systemctl start asterisk    # Start service

# Logs
tail -f /var/log/asterisk/messages    # Main log
tail -f /var/log/asterisk/full        # Full debug log
journalctl -u asterisk -f             # System log
```

### Configuration Files

```
/etc/asterisk/pjsip.conf       # SIP configuration
/etc/asterisk/extensions.conf  # Dialplan
/etc/asterisk/http.conf        # WebSocket
/etc/asterisk/rtp.conf         # Media/RTP
/etc/asterisk/voicemail.conf   # Voicemail
/etc/asterisk/queues.conf      # Call queues
```

## Success! 🎉

You now have:
- ✅ Asterisk PBX running on DigitalOcean
- ✅ WebRTC gateway configured
- ✅ SSL certificate installed
- ✅ Test agents ready
- ✅ Production-ready environment

**Total cost: $0** (using free credit) or **$6/month**

Compare to Twilio: **~$1,500/month** for same features!

## Next Steps

1. ✅ Test all features
2. ✅ Add more agents
3. ✅ Configure IVR menus
4. ✅ Set up call recording
5. ✅ Connect to Genesys (optional)
6. ✅ Deploy your WebRTC app to production

Need help? Check the main documentation:
- `ASTERISK_INTEGRATION.md` - Full Asterisk guide
- `DEPLOYMENT_INTERNET.md` - Production deployment
- `README.md` - Project overview

Happy calling! 📞

