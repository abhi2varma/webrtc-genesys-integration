# Setting Up Asterisk from Windows

Since Asterisk runs on Linux, here are your options to set it up from a Windows machine.

## Quick Comparison

| Option | Cost | Setup Time | Best For |
|--------|------|------------|----------|
| **Cloud VPS** | $5-20/month | 15 min | Production testing, real internet |
| **WSL2** | Free | 30 min | Local development |
| **VirtualBox VM** | Free | 45 min | Full Linux testing |
| **Docker** | Free | 20 min | Quick testing |

---

## Option 1: Cloud Server (Recommended)

### Step 1: Get a VPS

Choose a provider:

**DigitalOcean ($6/month):**
1. Go to: https://www.digitalocean.com/
2. Sign up (get $200 credit for 60 days)
3. Create Droplet:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic $6/month (2GB RAM, 1 CPU)
   - **Region:** Choose closest to you
   - **Authentication:** SSH Key or Password
   - **Hostname:** asterisk-pbx
4. Click "Create Droplet"

**Alternative Providers:**
- **Linode** - $5/month - https://www.linode.com/
- **Vultr** - $6/month - https://www.vultr.com/
- **AWS Lightsail** - $5/month - https://aws.amazon.com/lightsail/

### Step 2: Connect to Your Server

**Using PowerShell (Windows 10/11):**

```powershell
# Replace YOUR_SERVER_IP with actual IP
ssh root@YOUR_SERVER_IP
```

**Using PuTTY (if you prefer GUI):**
1. Download: https://www.putty.org/
2. Open PuTTY
3. Enter your server IP
4. Click "Open"
5. Login as: root
6. Enter password

### Step 3: Upload Setup Script

**Option A: Using SCP (PowerShell):**

```powershell
# From your WebRTC project directory
scp asterisk-quick-setup.sh root@YOUR_SERVER_IP:/root/

# Connect to server
ssh root@YOUR_SERVER_IP

# Run setup
chmod +x asterisk-quick-setup.sh
./asterisk-quick-setup.sh
```

**Option B: Using WinSCP (GUI):**
1. Download: https://winscp.net/
2. Connect to your server
3. Drag & drop `asterisk-quick-setup.sh` to `/root/`
4. Connect via SSH and run:
   ```bash
   chmod +x asterisk-quick-setup.sh
   ./asterisk-quick-setup.sh
   ```

**Option C: Copy-Paste (Easiest):**

After connecting via SSH:

```bash
# Download the script
wget https://raw.githubusercontent.com/YOUR_USERNAME/webrtc-genesys-integration/main/asterisk-quick-setup.sh

# Or create it manually
nano asterisk-quick-setup.sh
# Paste the contents
# Press Ctrl+X, then Y, then Enter

# Make executable and run
chmod +x asterisk-quick-setup.sh
./asterisk-quick-setup.sh
```

### Step 4: Configure DNS

Point your domain to the server:

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add A record:
   ```
   Type: A
   Name: asterisk
   Value: YOUR_SERVER_IP
   TTL: 3600
   ```
3. Wait 5-10 minutes for DNS propagation

### Step 5: Run Setup

The script will ask for:
- Domain name: `asterisk.yourcompany.com`
- Public IP: Your server's IP
- Email: Your email for SSL certificate

Setup takes 20-30 minutes.

---

## Option 2: WSL2 on Windows (Local Testing)

### Step 1: Install WSL2

**PowerShell (Run as Administrator):**

```powershell
# Enable WSL
wsl --install

# Restart your computer

# After restart, set up Ubuntu username/password
```

### Step 2: Install Ubuntu

```powershell
# Install Ubuntu 22.04
wsl --install -d Ubuntu-22.04

# Launch Ubuntu
wsl
```

### Step 3: Copy Setup Script to WSL

**From Windows PowerShell:**

```powershell
# Navigate to your project
cd "C:\Users\Abhishek\Documents\VS Code\LearningProjects\WebRTC"

# Copy script to WSL
wsl cp "/mnt/c/Users/Abhishek/Documents/VS Code/LearningProjects/WebRTC/asterisk-quick-setup.sh" ~/
```

**Or from inside WSL:**

```bash
# Navigate to Windows directory
cd "/mnt/c/Users/Abhishek/Documents/VS Code/LearningProjects/WebRTC"

# Copy to home
cp asterisk-quick-setup.sh ~/
cd ~
```

### Step 4: Run Setup in WSL

```bash
# Make executable
chmod +x asterisk-quick-setup.sh

# Run with sudo
sudo ./asterisk-quick-setup.sh
```

**For local testing, when asked for domain, use:**
- Domain: `localhost` or `asterisk.local`
- Public IP: `127.0.0.1`
- Email: your@email.com

### Step 5: Access Asterisk from Windows

```bash
# In WSL, get your IP
hostname -I

# Note the IP (e.g., 172.x.x.x)
```

Update your Windows `.env`:
```env
ASTERISK_WSS_URL=wss://172.x.x.x:8089/ws
ASTERISK_REALM=asterisk.local
```

### WSL2 Limitations

⚠️ **Note:** WSL2 doesn't work well for WebRTC with external clients because:
- NAT/networking is complex
- Can't get real SSL certificates easily
- Best for local testing only

---

## Option 3: VirtualBox VM

### Step 1: Install VirtualBox

1. Download: https://www.virtualbox.org/wiki/Downloads
2. Install VirtualBox
3. Download Ubuntu ISO: https://ubuntu.com/download/server

### Step 2: Create VM

1. Open VirtualBox
2. Click "New"
3. Settings:
   - **Name:** Asterisk-PBX
   - **Type:** Linux
   - **Version:** Ubuntu (64-bit)
   - **Memory:** 4096 MB
   - **Hard Disk:** 20 GB
4. Start VM and install Ubuntu

### Step 3: Configure Network

1. VM Settings → Network
2. Adapter 1: NAT
3. Port Forwarding:
   ```
   Name: SSH, Protocol: TCP, Host Port: 2222, Guest Port: 22
   Name: WSS, Protocol: TCP, Host Port: 8089, Guest Port: 8089
   Name: HTTP, Protocol: TCP, Host Port: 8088, Guest Port: 8088
   Name: SIP, Protocol: UDP, Host Port: 5060, Guest Port: 5060
   ```

### Step 4: Transfer Setup Script

**Option A: Shared Folder:**
1. VM Settings → Shared Folders
2. Add folder: `C:\Users\Abhishek\Documents\VS Code\LearningProjects\WebRTC`
3. In VM:
   ```bash
   cp /media/sf_WebRTC/asterisk-quick-setup.sh ~/
   ```

**Option B: SCP:**
```powershell
scp -P 2222 asterisk-quick-setup.sh user@localhost:/home/user/
```

### Step 5: Run Setup

```bash
chmod +x asterisk-quick-setup.sh
sudo ./asterisk-quick-setup.sh
```

---

## Option 4: Docker (Quick Testing)

### Create Dockerfile

Create `Dockerfile.asterisk`:

```dockerfile
FROM debian:bullseye-slim

# Install Asterisk
RUN apt-get update && apt-get install -y \
    asterisk \
    asterisk-modules \
    asterisk-config \
    && rm -rf /var/lib/apt/lists/*

# Copy configurations
COPY asterisk-configs/ /etc/asterisk/

# Expose ports
EXPOSE 5060/udp 5060/tcp 8088/tcp 8089/tcp 10000-20000/udp

# Start Asterisk
CMD ["asterisk", "-f", "-vvv"]
```

### Run Docker Container

```powershell
# Build
docker build -f Dockerfile.asterisk -t asterisk-pbx .

# Run
docker run -d --name asterisk `
  -p 5060:5060/udp `
  -p 8088:8088/tcp `
  -p 8089:8089/tcp `
  -p 10000-20000:10000-20000/udp `
  asterisk-pbx
```

⚠️ **Note:** Pre-built Asterisk Docker images don't include WebRTC support by default.

---

## Recommended Path for You

### For Testing/Development:
**→ Use Cloud VPS (DigitalOcean)**

**Why:**
- ✅ Real internet connectivity
- ✅ Real SSL certificates
- ✅ Easy to test from anywhere
- ✅ Can test with mobile devices
- ✅ Production-like environment
- 💰 Only $6/month (cancel anytime)

### Step-by-Step (15 minutes):

1. **Create DigitalOcean Account**
   - Get $200 free credit: https://m.do.co/c/free200credit

2. **Create Droplet**
   - Ubuntu 22.04, $6/month plan

3. **Connect via PowerShell**
   ```powershell
   ssh root@YOUR_DROPLET_IP
   ```

4. **Download and Run Setup**
   ```bash
   wget https://raw.githubusercontent.com/YOUR_USERNAME/webrtc-genesys-integration/main/asterisk-quick-setup.sh
   chmod +x asterisk-quick-setup.sh
   ./asterisk-quick-setup.sh
   ```

5. **Done!** 🎉

---

## After Setup - Testing

### Connect to Asterisk CLI

```bash
# From your server
asterisk -rvvv
```

**Useful Commands:**
```
pjsip show endpoints          # Show all SIP endpoints
pjsip show registrations      # Show registered users
pjsip show transports         # Show transports (WSS)
rtp show settings             # Show RTP settings
core show channels            # Show active calls
pjsip set logger on           # Enable SIP debug
core set verbose 10           # Enable verbose logging
exit                          # Exit CLI
```

### Test from Your WebRTC App

**Update your local `.env`:**
```env
PBX_MODE=asterisk
ASTERISK_WSS_URL=wss://YOUR_DROPLET_IP:8089/ws
ASTERISK_REALM=YOUR_DROPLET_IP
ASTERISK_STUN=stun:stun.l.google.com:19302
```

**Start your app:**
```powershell
npm start
```

**Test login:**
- Open: http://localhost:3000
- Username: `agent001`
- Password: `SecurePass123!`
- Server: Your droplet IP

### Test Calls

1. Open two browsers
2. Login as agent001 and agent002
3. From agent001, call: `1002`
4. Should ring agent002!

---

## Troubleshooting

### Can't Connect to Server

```powershell
# Test connection
Test-NetConnection -ComputerName YOUR_IP -Port 22

# Check if SSH is responding
ssh -v root@YOUR_IP
```

### Can't Access Asterisk WebSocket

```bash
# On server, check if Asterisk is running
systemctl status asterisk

# Check if port is listening
netstat -tulpn | grep 8089

# Check firewall
ufw status

# Allow port if needed
ufw allow 8089/tcp
```

### SSL Certificate Issues

```bash
# Test SSL certificate
openssl s_client -connect YOUR_DOMAIN:8089

# Renew certificate
certbot renew

# Reload Asterisk
systemctl reload asterisk
```

### No Audio in Calls

```bash
# Check RTP ports
asterisk -rx "rtp show settings"

# Enable RTP debug
asterisk -rvvv
rtp set debug on

# Check firewall allows UDP 10000-20000
ufw status
```

---

## Cost Summary

### Cloud VPS Option:
- **DigitalOcean:** $6/month ($200 free credit = 33 months free!)
- **Total first year:** $0 (using credit)

### Local Options:
- **WSL2:** Free
- **VirtualBox:** Free
- **Docker:** Free

### Recommendation:
Start with **DigitalOcean free credit** → Test everything → Decide if you want to keep it or move to on-premises.

---

## Next Steps

1. ✅ Choose your setup method
2. ✅ Set up Asterisk
3. ✅ Test with your WebRTC app
4. ✅ Configure additional agents
5. ✅ Set up call recording (optional)
6. ✅ Configure IVR (optional)
7. ✅ Connect to Genesys (optional)

Ready to proceed? Let me know which option you want to use!

