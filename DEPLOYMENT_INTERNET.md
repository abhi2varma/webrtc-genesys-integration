# Internet Deployment with On-Premises Genesys PureEngage

This guide covers deploying your WebRTC application on the internet to connect with your in-house Genesys PureEngage environment.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
│                                                                   │
│  ┌──────────────┐         ┌──────────────────────────┐          │
│  │ Remote Agent │────────►│  WebRTC App Server       │          │
│  │  (Browser)   │  HTTPS  │  (Your VPS/Cloud)        │          │
│  └──────────────┘         │  - Node.js Server        │          │
│                           │  - HTTPS/WSS             │          │
│                           │  - Port 443, 3000        │          │
│                           └────────────┬─────────────┘          │
│                                        │                          │
└────────────────────────────────────────┼──────────────────────────┘
                                         │
                           ┌─────────────▼───────────────┐
                           │   Firewall / VPN Gateway    │
                           │   - Port Forwarding         │
                           │   - IPSec/OpenVPN           │
                           │   - NAT Traversal           │
                           └─────────────┬───────────────┘
                                         │
┌────────────────────────────────────────┼──────────────────────────┐
│                    YOUR NETWORK (On-Premises)                     │
│                                        │                           │
│  ┌─────────────────────────────────────▼──────────────────┐      │
│  │           Genesys PureEngage Environment               │      │
│  │                                                         │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │      │
│  │  │ WebRTC GW    │  │ SIP Server   │  │ Media Server│ │      │
│  │  │ Port: 8443   │  │ Port: 5060   │  │ RTP Ports   │ │      │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │      │
│  │                                                         │      │
│  └─────────────────────────────────────────────────────────┘      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Internet Server** (VPS/Cloud)
   - Ubuntu 20.04+ or similar Linux distribution
   - 2+ CPU cores, 4GB+ RAM
   - Public IP address
   - Domain name (e.g., webrtc.yourcompany.com)

2. **On-Premises Requirements**
   - Genesys PureEngage 8.5+
   - Static public IP or VPN gateway
   - Firewall with port forwarding capability
   - Network administrator access

3. **DNS & SSL**
   - Domain name configured
   - SSL certificate (Let's Encrypt recommended)

## Part 1: Deploying on Internet Server

### Step 1: Prepare Your Server

```bash
# SSH into your VPS
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Nginx
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Install Git
apt install -y git

# Create application directory
mkdir -p /var/www/webrtc
cd /var/www/webrtc
```

### Step 2: Upload Your Application

```bash
# Option 1: Using Git
git init
git remote add origin https://github.com/yourusername/webrtc-genesys.git
git pull origin main

# Option 2: Using SCP from your local machine
# Run this from your local machine:
scp -r /path/to/WebRTC/* root@your-server-ip:/var/www/webrtc/

# Install dependencies
cd /var/www/webrtc
npm install --production
```

### Step 3: Configure Environment

Create production `.env` file:

```bash
nano /var/www/webrtc/.env
```

Add this configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Your Domain
APP_DOMAIN=webrtc.yourcompany.com

# Genesys On-Premises Configuration
# Option 1: Direct access (if you expose Genesys to internet - NOT RECOMMENDED)
# GENESYS_WEBSOCKET_SERVER=wss://genesys.yourcompany.com:8443/ws

# Option 2: Through VPN (RECOMMENDED)
# Use internal IP if server is connected via VPN
GENESYS_WEBSOCKET_SERVER=wss://192.168.1.100:8443/ws
GENESYS_SIP_SERVER=192.168.1.100
GENESYS_SIP_PORT=5060
GENESYS_REALM=yourcompany.local
GENESYS_TENANT=your-tenant

# STUN/TURN Servers (CRITICAL for internet deployment)
STUN_SERVER=stun:stun.l.google.com:19302

# TURN Server (REQUIRED for NAT traversal)
# Option 1: Use Twilio TURN
TURN_SERVER=turn:global.turn.twilio.com:3478?transport=tcp
TURN_USERNAME=your-twilio-username
TURN_CREDENTIAL=your-twilio-credential

# Option 2: Use xirsys TURN
# TURN_SERVER=turn:your-account.xirsys.com:80?transport=tcp
# TURN_USERNAME=your-xirsys-username
# TURN_CREDENTIAL=your-xirsys-credential

# Option 3: Self-hosted Coturn (see below)
# TURN_SERVER=turn:turn.yourcompany.com:3478
# TURN_USERNAME=your-turn-username
# TURN_CREDENTIAL=your-turn-password

# Security
ALLOWED_ORIGINS=https://webrtc.yourcompany.com
SESSION_SECRET=your-random-secret-key-here

# SSL Paths (will be set by Certbot)
SSL_KEY=/etc/letsencrypt/live/webrtc.yourcompany.com/privkey.pem
SSL_CERT=/etc/letsencrypt/live/webrtc.yourcompany.com/fullchain.pem
```

### Step 4: Setup SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
certbot --nginx -d webrtc.yourcompany.com

# Follow the prompts
# Choose: Redirect HTTP to HTTPS
```

### Step 5: Configure Nginx as Reverse Proxy

```bash
nano /etc/nginx/sites-available/webrtc
```

Add this configuration:

```nginx
# WebRTC Application
upstream webrtc_backend {
    server 127.0.0.1:3000;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name webrtc.yourcompany.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name webrtc.yourcompany.com;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/webrtc.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/webrtc.yourcompany.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Increase client body size for file uploads
    client_max_body_size 50M;

    # Root location - Static files
    location / {
        proxy_pass http://webrtc_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO WebSocket
    location /socket.io/ {
        proxy_pass http://webrtc_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout settings
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Logging
    access_log /var/log/nginx/webrtc_access.log;
    error_log /var/log/nginx/webrtc_error.log;
}
```

Enable the site:

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/webrtc /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 6: Setup PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start your application
cd /var/www/webrtc
pm2 start server.js --name webrtc-app

# Configure PM2 to start on boot
pm2 startup systemd
pm2 save

# Check status
pm2 status
pm2 logs webrtc-app
```

### Step 7: Configure Firewall

```bash
# Allow SSH (if not already allowed)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow WebRTC ports (if using STUN/TURN on same server)
ufw allow 3478/udp
ufw allow 3478/tcp
ufw allow 49152:65535/udp

# Enable firewall
ufw enable

# Check status
ufw status
```

## Part 2: Configuring Your On-Premises Network

### Step 1: Network Architecture Decision

Choose one of these approaches:

#### Option A: VPN Tunnel (RECOMMENDED - Most Secure)

```
Internet Server ←→ VPN Gateway ←→ Genesys Environment
```

**Advantages:**
- Most secure
- No need to expose Genesys to internet
- Encrypted tunnel

**Setup:**
1. Set up IPSec or OpenVPN on your firewall
2. Connect your internet server to the VPN
3. Use internal IPs in configuration

#### Option B: Direct Port Forwarding (Less Secure)

```
Internet ←→ Firewall (Port Forward) ←→ Genesys Environment
```

**Advantages:**
- Simpler setup
- No VPN required

**Disadvantages:**
- Less secure
- Exposes Genesys to internet

### Step 2: VPN Setup (Option A - Recommended)

#### On Your Firewall/VPN Gateway:

**Using pfSense/OPNsense:**

1. Install OpenVPN Server
2. Create server certificate
3. Generate client configuration
4. Configure routes to Genesys network

**VPN Configuration:**
```
Protocol: OpenVPN (TCP)
Port: 1194
Encryption: AES-256-GCM
Authentication: SHA512
Tunnel Network: 10.8.0.0/24
Local Network: 192.168.1.0/24 (your Genesys network)
```

#### On Your Internet Server:

```bash
# Install OpenVPN client
apt install -y openvpn

# Copy VPN config from your firewall
nano /etc/openvpn/client.conf

# Add your VPN configuration
# (Download from your firewall/VPN server)

# Start OpenVPN
systemctl start openvpn@client
systemctl enable openvpn@client

# Verify connection
ip addr show tun0
ping 192.168.1.100  # Your Genesys server IP
```

### Step 3: Port Forwarding (Option B)

#### Required Ports to Forward:

```
External Port → Internal IP:Port       Purpose
─────────────────────────────────────────────────
8443/TCP → 192.168.1.100:8443        Genesys WebRTC Gateway (WSS)
5060/TCP → 192.168.1.100:5060        Genesys SIP Server
10000-20000/UDP → 192.168.1.100     Genesys RTP Media
```

#### Firewall Rules (Example for pfSense):

```
Action: Pass
Interface: WAN
Protocol: TCP
Source: Any
Destination: WAN Address, Port 8443
NAT: 192.168.1.100:8443
Description: Genesys WebRTC Gateway
```

### Step 4: Genesys Configuration for Internet Access

Update your Genesys WebRTC Gateway configuration:

```ini
[websocket]
host=0.0.0.0
port=8443
ssl_enabled=true
ssl_cert=/path/to/genesys/cert.pem
ssl_key=/path/to/genesys/key.pem

[cors]
allowed_origins=https://webrtc.yourcompany.com,https://*.yourcompany.com
allowed_methods=GET,POST,OPTIONS

[ice]
stun_server=stun:stun.l.google.com:19302
turn_server=turn:turn.yourcompany.com:3478
public_ip=your-public-ip  # Your public IP address

[security]
enable_authentication=true
require_tls=true
```

## Part 3: Setting Up TURN Server (Critical!)

Since your agents will be on various networks (home, coffee shops, etc.), you MUST have a TURN server for NAT traversal.

### Option 1: Use Cloud TURN Service (Easiest)

#### Twilio TURN (Recommended)

1. Sign up at https://www.twilio.com/stun-turn
2. Get credentials
3. Update `.env`:

```env
TURN_SERVER=turn:global.turn.twilio.com:3478?transport=tcp
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-credential
```

#### xirsys (Alternative)

1. Sign up at https://xirsys.com
2. Create channel
3. Get credentials

#### Metered TURN (Another option)

1. Sign up at https://www.metered.ca/turn-server
2. Get free tier credentials

### Option 2: Self-Hosted TURN Server (Coturn)

Install on your internet server or separate server:

```bash
# Install Coturn
apt install -y coturn

# Enable Coturn
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Configure Coturn
nano /etc/turnserver.conf
```

Coturn configuration:

```ini
# Listen on all interfaces
listening-ip=0.0.0.0

# External IP (your server's public IP)
external-ip=your-public-ip

# Listening ports
listening-port=3478
tls-listening-port=5349

# Relay ports
min-port=49152
max-port=65535

# Authentication
lt-cred-mech
user=webrtc:your-strong-password

# Realm
realm=turn.yourcompany.com

# SSL certificates
cert=/etc/letsencrypt/live/turn.yourcompany.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.yourcompany.com/privkey.pem

# Performance
max-bps=3000000
bps-capacity=0

# Logging
log-file=/var/log/turnserver.log
verbose

# Security
no-multicast-peers
no-cli
no-loopback-peers
no-stdout-log
```

Start Coturn:

```bash
# Restart Coturn
systemctl restart coturn
systemctl enable coturn

# Check status
systemctl status coturn

# Test TURN server
turnutils_uclient -v -u webrtc -w your-strong-password turn.yourcompany.com
```

Update firewall for TURN:

```bash
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 49152:65535/udp
```

## Part 4: DNS Configuration

Set up your DNS records:

```
Type    Name                    Value                   TTL
─────────────────────────────────────────────────────────────
A       webrtc                  your-server-ip          3600
A       turn                    your-server-ip          3600
CNAME   genesys (optional)      your-public-ip          3600
```

## Part 5: Testing Your Setup

### Test 1: Check Server Accessibility

```bash
# From your local machine
curl https://webrtc.yourcompany.com/api/health

# Expected response:
# {"status":"ok","timestamp":"...","connections":0,"rooms":0}
```

### Test 2: Check Genesys Connectivity

```bash
# SSH to your server
ssh root@your-server-ip

# Test Genesys WebSocket
openssl s_client -connect 192.168.1.100:8443

# Should establish connection
```

### Test 3: Test TURN Server

Use this online tool: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

Or use command line:

```bash
# Test TURN
turnutils_uclient -v -u webrtc -w your-password turn.yourcompany.com
```

### Test 4: End-to-End Call Test

1. **From Internet (Remote Agent):**
   - Open: https://webrtc.yourcompany.com
   - Login with Genesys credentials
   - Make a test call

2. **Check Logs:**
   ```bash
   # Server logs
   pm2 logs webrtc-app
   
   # Nginx logs
   tail -f /var/log/nginx/webrtc_access.log
   
   # TURN logs (if self-hosted)
   tail -f /var/log/turnserver.log
   ```

## Part 6: Monitoring & Maintenance

### Setup Monitoring

```bash
# Install monitoring tools
npm install -g pm2

# Enable PM2 monitoring
pm2 install pm2-server-monit

# View monitoring
pm2 monit
```

### Log Rotation

```bash
# Configure logrotate
nano /etc/logrotate.d/webrtc
```

Add:

```
/var/log/nginx/webrtc_*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}

/var/log/turnserver.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 turnserver turnserver
    postrotate
        systemctl reload coturn > /dev/null
    endscript
}
```

### Automatic Backups

```bash
# Create backup script
nano /root/backup-webrtc.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/webrtc_$DATE.tar.gz /var/www/webrtc

# Backup nginx config
tar -czf $BACKUP_DIR/nginx_$DATE.tar.gz /etc/nginx/sites-available/webrtc

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /root/backup-webrtc.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup-webrtc.sh
```

## Security Checklist

- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured with minimal ports
- [ ] Strong passwords for all services
- [ ] VPN tunnel established (if using Option A)
- [ ] TURN server secured with authentication
- [ ] Nginx security headers enabled
- [ ] Regular security updates scheduled
- [ ] Log monitoring enabled
- [ ] Backup system configured
- [ ] Genesys credentials encrypted in transit
- [ ] CORS properly configured
- [ ] Rate limiting enabled (see below)

### Enable Rate Limiting in Nginx

```nginx
# Add to http block in /etc/nginx/nginx.conf
http {
    limit_req_zone $binary_remote_addr zone=webrtc_limit:10m rate=10r/s;
    
    # ... other config ...
}

# Add to server block
server {
    location /api/ {
        limit_req zone=webrtc_limit burst=20 nodelay;
        # ... other config ...
    }
}
```

## Troubleshooting

### Problem: Can't connect to Genesys from internet server

**Solution:**
```bash
# Check VPN connection
ip addr show tun0

# Test connectivity
ping 192.168.1.100
telnet 192.168.1.100 8443

# Check routes
ip route
```

### Problem: Audio/Video not working

**Solution:**
1. Verify TURN server is working
2. Check firewall UDP ports
3. Test with: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

### Problem: SSL errors

**Solution:**
```bash
# Renew SSL certificate
certbot renew

# Check certificate expiry
openssl s_client -connect webrtc.yourcompany.com:443 | openssl x509 -noout -dates
```

## Performance Optimization

### For High Traffic

```bash
# Increase Nginx worker connections
nano /etc/nginx/nginx.conf

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

# Cluster your Node.js app
pm2 start server.js -i max --name webrtc-app
```

### Database for Session Storage

If you need to scale horizontally:

```bash
# Install Redis
apt install -y redis-server

# Enable Redis
systemctl enable redis-server
```

Update `server.js` to use Redis adapter (I can provide this code if needed).

## Cost Estimates

- **VPS (2 CPU, 4GB RAM)**: $10-20/month
- **Domain**: $10-15/year
- **SSL Certificate**: Free (Let's Encrypt)
- **TURN Server (Self-hosted)**: Included in VPS
- **TURN Server (Twilio)**: ~$0.0004/GB (pay as you go)
- **Total**: ~$15-25/month

## Summary

You now have:
1. ✅ WebRTC app hosted on internet
2. ✅ Secure connection to on-premises Genesys
3. ✅ TURN server for NAT traversal
4. ✅ SSL encryption
5. ✅ Production-ready deployment

Need help with any specific step? Let me know!


