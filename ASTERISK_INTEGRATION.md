# Asterisk Integration Guide

Complete guide to integrate your WebRTC application with Asterisk PBX instead of Twilio/Genesys.

## Overview

Asterisk can replace:
- ✅ TURN Server (media relay)
- ✅ SIP Server (call signaling)
- ✅ PBX functionality (call routing, IVR, queues)
- ✅ Media Server (conferencing, recording)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET                                  │
│                                                              │
│  ┌──────────────┐         ┌──────────────────────────┐     │
│  │ Remote Agent │────────►│  WebRTC App Server       │     │
│  │  (Browser)   │  HTTPS  │  Node.js + Socket.IO     │     │
│  └──────────────┘         └───────────┬──────────────┘     │
│                                        │                     │
└────────────────────────────────────────┼─────────────────────┘
                                         │ SIP over WSS
                                         ▼
                          ┌──────────────────────────┐
                          │   Asterisk PBX           │
                          │   - WebRTC Gateway       │
                          │   - SIP Server           │
                          │   - Media Server         │
                          │   - Call Routing         │
                          │   - IVR / Queues         │
                          └──────────────────────────┘
                                         │
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼
                    ┌─────────┐   ┌─────────┐   ┌──────────┐
                    │ Agents  │   │  PSTN   │   │ Genesys  │
                    │ (SIP)   │   │Gateway  │   │(optional)│
                    └─────────┘   └─────────┘   └──────────┘
```

## Part 1: Installing Asterisk

### On Ubuntu 20.04/22.04

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y build-essential libssl-dev libncurses5-dev \
    libnewt-dev libxml2-dev linux-headers-$(uname -r) \
    libsqlite3-dev uuid-dev libjansson-dev libsrtp2-dev

# Download Asterisk (latest LTS version)
cd /usr/src
sudo wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz

# Extract
sudo tar -xzvf asterisk-20-current.tar.gz
cd asterisk-20.*/

# Install prerequisites
sudo contrib/scripts/install_prereq install

# Configure with WebRTC support
sudo ./configure --with-jansson-bundled --with-pjproject-bundled

# Select modules (important for WebRTC)
sudo make menuselect
# Navigate to:
# - Applications: Select app_confbridge
# - Channel Drivers: Select chan_pjsip
# - Resource Modules: Select res_pjsip, res_pjsip_session, res_http_websocket
# - Codec Translators: Select codec_opus
# Save and Exit (F12 or x)

# Compile (this takes 10-30 minutes)
sudo make -j$(nproc)

# Install
sudo make install
sudo make samples
sudo make config
sudo ldconfig

# Create Asterisk user
sudo useradd -r -d /var/lib/asterisk -M asterisk

# Set permissions
sudo chown -R asterisk:asterisk /etc/asterisk
sudo chown -R asterisk:asterisk /var/{lib,log,spool}/asterisk
sudo chown asterisk:asterisk /usr/sbin/asterisk

# Start Asterisk
sudo systemctl enable asterisk
sudo systemctl start asterisk

# Verify
sudo asterisk -rvvv
```

### On CentOS/RHEL

```bash
# Install EPEL repository
sudo yum install -y epel-release

# Install dependencies
sudo yum groupinstall -y "Development Tools"
sudo yum install -y wget vim ncurses-devel openssl-devel \
    libxml2-devel sqlite-devel libuuid-devel jansson-devel

# Continue with same steps as Ubuntu (from download onwards)
```

## Part 2: Configure Asterisk for WebRTC

### 1. Configure HTTP/WebSocket Server

Edit `/etc/asterisk/http.conf`:

```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088

; Enable HTTPS for secure WebSocket
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/letsencrypt/live/asterisk.yourcompany.com/fullchain.pem
tlsprivatekey=/etc/letsencrypt/live/asterisk.yourcompany.com/privkey.pem

; WebSocket settings
enablestatic=yes
redirect=/static /var/lib/asterisk/static-http
```

### 2. Configure PJSIP for WebRTC

Edit `/etc/asterisk/pjsip.conf`:

```ini
;=====================================================
; Transport Configuration
;=====================================================

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
external_media_address=YOUR_PUBLIC_IP
external_signaling_address=YOUR_PUBLIC_IP

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
external_media_address=YOUR_PUBLIC_IP
external_signaling_address=YOUR_PUBLIC_IP

;=====================================================
; WebRTC Endpoint Template
;=====================================================

[webrtc-endpoint](!)
type=endpoint
transport=transport-wss
context=from-internal
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
; Enable ICE support
ice_support=yes
; Use RTCP-MUX
rtcp_mux=yes
; Use BUNDLE
bundle=yes
; Enable DTLS for SRTP
dtls_auto_generate_cert=yes
dtls_verify=fingerprint
dtls_setup=actpass

[webrtc-aor](!)
type=aor
max_contacts=5
remove_existing=yes

[webrtc-auth](!)
type=auth
auth_type=userpass

;=====================================================
; WebRTC Users (Agents)
;=====================================================

; Agent 1
[agent001](webrtc-endpoint)
auth=agent001-auth
aors=agent001

[agent001](webrtc-aor)
contact=sip:agent001@webrtc

[agent001-auth](webrtc-auth)
username=agent001
password=SecurePassword123!

; Agent 2
[agent002](webrtc-endpoint)
auth=agent002-auth
aors=agent002

[agent002](webrtc-aor)
contact=sip:agent002@webrtc

[agent002-auth](webrtc-auth)
username=agent002
password=SecurePassword456!

; Add more agents as needed...

;=====================================================
; SIP Trunk to Genesys (Optional)
;=====================================================

[genesys-trunk]
type=endpoint
context=from-genesys
transport=transport-udp
aors=genesys-trunk
disallow=all
allow=ulaw,alaw,g722
direct_media=no
from_user=asterisk
from_domain=yourcompany.com

[genesys-trunk]
type=aor
contact=sip:192.168.1.100:5060

[genesys-trunk]
type=identify
endpoint=genesys-trunk
match=192.168.1.100
```

### 3. Configure RTP (Media)

Edit `/etc/asterisk/rtp.conf`:

```ini
[general]
rtpstart=10000
rtpend=20000

; ICE/STUN support
icesupport=yes
stunaddr=stun.l.google.com:3478

; Enable RTCP
rtcpenable=yes
rtcpmux=yes
```

### 4. Configure Dialplan

Edit `/etc/asterisk/extensions.conf`:

```ini
[general]
static=yes
writeprotect=no

;=====================================================
; Internal Calls (Agent to Agent)
;=====================================================

[from-internal]
; Extension to extension calling
exten => _1XXX,1,NoOp(Calling extension ${EXTEN})
    same => n,Dial(PJSIP/${EXTEN},30)
    same => n,Hangup()

; Echo test
exten => 600,1,NoOp(Echo Test)
    same => n,Answer()
    same => n,Playback(demo-echotest)
    same => n,Echo()
    same => n,Hangup()

; Conference room
exten => 700,1,NoOp(Conference Room)
    same => n,Answer()
    same => n,ConfBridge(room1)
    same => n,Hangup()

; Call external number through Genesys
exten => _NXXNXXXXXX,1,NoOp(Outbound call to ${EXTEN})
    same => n,Dial(PJSIP/${EXTEN}@genesys-trunk,60)
    same => n,Hangup()

;=====================================================
; From Genesys (Inbound calls)
;=====================================================

[from-genesys]
; Route to specific agent
exten => 1001,1,NoOp(Incoming call for agent001)
    same => n,Dial(PJSIP/agent001,30)
    same => n,Hangup()

exten => 1002,1,NoOp(Incoming call for agent002)
    same => n,Dial(PJSIP/agent002,30)
    same => n,Hangup()

; IVR for incoming calls
exten => s,1,NoOp(Incoming call from Genesys)
    same => n,Answer()
    same => n,Playback(welcome)
    same => n,Background(enter-ext-of-person)
    same => n,WaitExten(10)
    same => n,Hangup()

; Handle extension input from IVR
exten => _1XXX,1,Goto(from-internal,${EXTEN},1)
```

### 5. Configure Voicemail (Optional)

Edit `/etc/asterisk/voicemail.conf`:

```ini
[general]
format=wav49|gsm|wav
maxmsg=100
maxsecs=300

[default]
1001 => 1234,Agent One,agent001@yourcompany.com
1002 => 1234,Agent Two,agent002@yourcompany.com
```

## Part 3: SSL Certificate for WebRTC

WebRTC requires HTTPS/WSS. Get SSL certificate:

```bash
# Install Certbot
sudo apt install -y certbot

# Get certificate (standalone)
sudo systemctl stop asterisk
sudo certbot certonly --standalone -d asterisk.yourcompany.com
sudo systemctl start asterisk

# Or use DNS challenge if port 80 is not available
sudo certbot certonly --manual --preferred-challenges dns \
    -d asterisk.yourcompany.com
```

Set up certificate auto-renewal:

```bash
# Create renewal hook
sudo nano /etc/letsencrypt/renewal-hooks/deploy/asterisk-reload.sh
```

Add:

```bash
#!/bin/bash
systemctl reload asterisk
```

```bash
# Make executable
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/asterisk-reload.sh

# Test renewal
sudo certbot renew --dry-run
```

## Part 4: Firewall Configuration

```bash
# SIP signaling
sudo ufw allow 5060/tcp
sudo ufw allow 5060/udp

# WebSocket (HTTP/HTTPS)
sudo ufw allow 8088/tcp
sudo ufw allow 8089/tcp

# RTP media
sudo ufw allow 10000:20000/udp

# Reload firewall
sudo ufw reload
```

## Part 5: Update Your Application

### Update `.env` Configuration

```env
# Asterisk Configuration
ASTERISK_WSS_URL=wss://asterisk.yourcompany.com:8089/ws
ASTERISK_REALM=asterisk.yourcompany.com
ASTERISK_STUN=stun:stun.l.google.com:19302

# Remove Genesys config or keep for hybrid mode
# GENESYS_WEBSOCKET_SERVER=...

# You can still use TURN if needed for difficult NAT scenarios
TURN_SERVER=
```

### Update `server.js`

Add Asterisk configuration to the config endpoint:

```javascript
app.get('/api/config', (req, res) => {
  res.json({
    stunServer: process.env.ASTERISK_STUN || process.env.STUN_SERVER || 'stun:stun.l.google.com:19302',
    turnServer: process.env.TURN_SERVER || null,
    turnUsername: process.env.TURN_USERNAME || null,
    turnCredential: process.env.TURN_CREDENTIAL || null,
    
    // Asterisk configuration
    asteriskWebSocketServer: process.env.ASTERISK_WSS_URL || null,
    asteriskRealm: process.env.ASTERISK_REALM || null,
    
    // Keep Genesys for hybrid mode
    genesysWebSocketServer: process.env.GENESYS_WEBSOCKET_SERVER || null,
    genesysRealm: process.env.GENESYS_REALM || null,
    
    mode: process.env.PBX_MODE || 'asterisk' // 'asterisk', 'genesys', or 'hybrid'
  });
});
```

### Update `public/genesys-integration.js`

The SIP.js code will work with Asterisk too! Just update the initialization:

```javascript
// In initialize method
const uri = SIP.UserAgent.makeURI(`sip:${credentials.username}@${config.asteriskRealm || config.genesysRealm}`);

const transportOptions = {
    server: config.asteriskWebSocketServer || config.genesysWebSocketServer,
    connectionTimeout: 30,
    keepAliveInterval: 30
};
```

## Part 6: Testing

### Test 1: Check Asterisk is Running

```bash
# Connect to Asterisk CLI
sudo asterisk -rvvv

# Check PJSIP status
pjsip show endpoints
pjsip show transports

# Check RTP settings
rtp show settings

# Enable verbose logging
core set verbose 10
pjsip set logger on

# Exit
exit
```

### Test 2: Test WebSocket Connection

```bash
# Install wscat
npm install -g wscat

# Test WebSocket connection
wscat -c wss://asterisk.yourcompany.com:8089/ws
```

### Test 3: Register Agent from Browser

1. Open your WebRTC application
2. Login with:
   - SIP Username: `agent001`
   - SIP Password: `SecurePassword123!`
   - SIP Server: `asterisk.yourcompany.com`
3. Check Asterisk CLI:
   ```
   pjsip show endpoints
   ```
   Should show agent001 as `Avail`

### Test 4: Make Test Call

1. Register two agents (agent001 and agent002)
2. Agent001 calls: `1002`
3. Should ring agent002's browser
4. Check Asterisk CLI for call flow

### Test 5: Echo Test

1. Register as any agent
2. Call extension: `600`
3. Should hear echo test prompt
4. Speak - should hear yourself

## Part 7: Advanced Features

### Call Recording

Edit `/etc/asterisk/extensions.conf`:

```ini
[from-internal]
exten => _1XXX,1,NoOp(Calling extension ${EXTEN})
    same => n,MixMonitor(/var/spool/asterisk/monitor/${UNIQUEID}.wav)
    same => n,Dial(PJSIP/${EXTEN},30)
    same => n,Hangup()
```

### Call Queues

Edit `/etc/asterisk/queues.conf`:

```ini
[support-queue]
strategy=ringall
timeout=30
retry=5
maxlen=10
member => PJSIP/agent001
member => PJSIP/agent002
```

In dialplan:

```ini
exten => 800,1,Answer()
    same => n,Queue(support-queue)
    same => n,Hangup()
```

### Conference Bridge

Already configured! Just call extension `700`.

### IVR (Interactive Voice Response)

```ini
[ivr-menu]
exten => s,1,Answer()
    same => n,Background(custom/welcome-message)
    same => n(menu),Background(custom/main-menu)
    same => n,WaitExten(10)
    same => n,Goto(menu)

exten => 1,1,Goto(from-internal,800,1)  ; Sales queue
exten => 2,1,Goto(from-internal,801,1)  ; Support queue
exten => 3,1,Directory(default,from-internal)  ; Directory
exten => 0,1,Goto(from-internal,1000,1)  ; Operator
```

### Call Transfer

Asterisk handles this automatically with REFER messages from SIP.js!

### Music on Hold

Edit `/etc/asterisk/musiconhold.conf`:

```ini
[default]
mode=files
directory=/var/lib/asterisk/moh
```

Add MP3 files to `/var/lib/asterisk/moh/`

## Part 8: Integration with Genesys (Hybrid Mode)

You can use both Asterisk AND Genesys:

### Scenario 1: Asterisk → Genesys Trunk

```ini
; In pjsip.conf
[genesys-trunk]
type=endpoint
context=from-genesys
transport=transport-udp
aors=genesys-trunk
outbound_auth=genesys-trunk-auth

[genesys-trunk-auth]
type=auth
auth_type=userpass
username=asterisk-trunk
password=TrunkPassword123!
```

### Scenario 2: Route Some Calls to Genesys

```ini
; In extensions.conf
[from-internal]
; Internal calls stay in Asterisk
exten => _1XXX,1,Dial(PJSIP/${EXTEN},30)

; External calls go to Genesys
exten => _NXXNXXXXXX,1,Dial(PJSIP/${EXTEN}@genesys-trunk,60)

; Customer service calls go to Genesys queue
exten => 900,1,Dial(PJSIP/customer-service@genesys-trunk,60)
```

## Part 9: Monitoring & Management

### Web Interface (Asterisk Manager Interface)

Edit `/etc/asterisk/manager.conf`:

```ini
[general]
enabled=yes
port=5038
bindaddr=0.0.0.0

[admin]
secret=YourSecurePassword
read=all
write=all
```

### Install FreePBX (Optional GUI)

```bash
# Install prerequisites
sudo apt install -y apache2 mariadb-server php php-mysql \
    php-mbstring php-xml

# Download FreePBX
cd /usr/src
sudo wget http://mirror.freepbx.org/modules/packages/freepbx/freepbx-16.0-latest.tgz
sudo tar -xzvf freepbx-16.0-latest.tgz
cd freepbx

# Install
sudo ./install -n
```

Access at: `http://your-server-ip`

### Logging

```bash
# View Asterisk logs
sudo tail -f /var/log/asterisk/messages
sudo tail -f /var/log/asterisk/full

# Enable debug logging
asterisk -rvvv
pjsip set logger on
core set debug 5
```

## Part 10: Performance Tuning

### Increase File Limits

```bash
# Edit limits
sudo nano /etc/security/limits.conf
```

Add:

```
asterisk soft nofile 65535
asterisk hard nofile 65535
```

### Optimize RTP

In `/etc/asterisk/rtp.conf`:

```ini
[general]
rtpstart=10000
rtpend=20000
rtcpinterval=5000
strictrtp=yes
probation=4
```

### Use Opus Codec

Opus provides best quality for WebRTC:

```ini
; In pjsip.conf
[webrtc-endpoint](!)
allow=opus
```

## Troubleshooting

### WebSocket Connection Fails

```bash
# Check Asterisk HTTP server
asterisk -rx "http show status"

# Check certificate
openssl s_client -connect asterisk.yourcompany.com:8089

# Check firewall
sudo ufw status
```

### No Audio

```bash
# Check RTP ports
sudo netstat -an | grep "10000:20000"

# Check STUN configuration
asterisk -rx "rtp show settings"

# Enable RTP debug
asterisk -rvvv
rtp set debug on
```

### Registration Fails

```bash
# Check endpoint configuration
asterisk -rx "pjsip show endpoint agent001"

# Check authentication
asterisk -rx "pjsip show auth agent001-auth"

# View registration attempts
asterisk -rvvv
pjsip set logger on
```

## Cost Comparison

| Component | Twilio | Asterisk |
|-----------|--------|----------|
| **SIP Server** | $1/month/user | Free (self-hosted) |
| **TURN Server** | $0.0004/GB | Free (built-in ICE) |
| **Call Recording** | $0.0025/min | Free |
| **Conference** | $0.25/participant/min | Free |
| **Server** | N/A | $10-50/month (VPS) |
| **Total (50 agents)** | ~$500-1000/month | ~$50/month |

## Summary

**Advantages of Asterisk:**
- ✅ Free and open-source
- ✅ Full control over everything
- ✅ No per-minute/per-GB charges
- ✅ Rich PBX features (IVR, queues, voicemail)
- ✅ Can integrate with Genesys
- ✅ Supports WebRTC natively
- ✅ Huge community support

**Considerations:**
- ⚠️ Requires technical knowledge to set up
- ⚠️ You manage the infrastructure
- ⚠️ Need to handle scaling yourself

Perfect for your on-premises deployment! 🎉

