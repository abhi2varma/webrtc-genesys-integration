#!/bin/bash

# ================================================
# Asterisk WebRTC Quick Setup Script
# Installs and configures Asterisk for WebRTC
# ================================================

set -e

echo "================================================"
echo "Asterisk WebRTC Quick Setup"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Get configuration
read -p "Enter your domain name (e.g., asterisk.yourcompany.com): " DOMAIN
read -p "Enter your public IP address: " PUBLIC_IP
read -p "Enter email for SSL certificate: " EMAIL

echo ""
echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  Public IP: $PUBLIC_IP"
echo "  Email: $EMAIL"
echo ""
read -p "Continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Setup cancelled"
    exit 0
fi

echo ""
echo "================================================"
echo "Step 1: Installing Dependencies"
echo "================================================"

apt update
apt install -y build-essential libssl-dev libncurses5-dev \
    libnewt-dev libxml2-dev linux-headers-$(uname -r) \
    libsqlite3-dev uuid-dev libjansson-dev libsrtp2-dev \
    certbot wget

echo "✓ Dependencies installed"

echo ""
echo "================================================"
echo "Step 2: Downloading Asterisk"
echo "================================================"

cd /usr/src
if [ ! -f asterisk-20-current.tar.gz ]; then
    wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz
fi

tar -xzf asterisk-20-current.tar.gz
cd asterisk-20.*/

echo "✓ Asterisk downloaded"

echo ""
echo "================================================"
echo "Step 3: Installing Prerequisites"
echo "================================================"

contrib/scripts/install_prereq install

echo ""
echo "================================================"
echo "Step 4: Configuring Asterisk"
echo "================================================"

./configure --with-jansson-bundled --with-pjproject-bundled

echo "✓ Configuration complete"

echo ""
echo "================================================"
echo "Step 5: Compiling Asterisk"
echo "================================================"
echo "This will take 10-30 minutes..."

make -j$(nproc)

echo "✓ Compilation complete"

echo ""
echo "================================================"
echo "Step 6: Installing Asterisk"
echo "================================================"

make install
make samples
make config
ldconfig

echo "✓ Asterisk installed"

echo ""
echo "================================================"
echo "Step 7: Creating Asterisk User"
echo "================================================"

useradd -r -d /var/lib/asterisk -M asterisk || true
chown -R asterisk:asterisk /etc/asterisk
chown -R asterisk:asterisk /var/{lib,log,spool}/asterisk
chown asterisk:asterisk /usr/sbin/asterisk

echo "✓ User created and permissions set"

echo ""
echo "================================================"
echo "Step 8: Obtaining SSL Certificate"
echo "================================================"

systemctl stop asterisk 2>/dev/null || true
certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

if [ $? -eq 0 ]; then
    echo "✓ SSL certificate obtained"
else
    echo "⚠ SSL certificate failed - you may need to configure DNS first"
    echo "Run: certbot certonly --standalone -d $DOMAIN"
fi

echo ""
echo "================================================"
echo "Step 9: Configuring Asterisk for WebRTC"
echo "================================================"

# Backup original configs
cp /etc/asterisk/http.conf /etc/asterisk/http.conf.bak
cp /etc/asterisk/pjsip.conf /etc/asterisk/pjsip.conf.bak
cp /etc/asterisk/rtp.conf /etc/asterisk/rtp.conf.bak
cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.bak

# Configure HTTP
cat > /etc/asterisk/http.conf << EOF
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
tlsprivatekey=/etc/letsencrypt/live/$DOMAIN/privkey.pem
enablestatic=yes
EOF

# Configure PJSIP
cat > /etc/asterisk/pjsip.conf << EOF
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
external_media_address=$PUBLIC_IP
external_signaling_address=$PUBLIC_IP

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
external_media_address=$PUBLIC_IP
external_signaling_address=$PUBLIC_IP

[webrtc-endpoint](!)
type=endpoint
transport=transport-wss
context=from-internal
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
ice_support=yes
rtcp_mux=yes
bundle=yes
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

[agent001](webrtc-endpoint)
auth=agent001-auth
aors=agent001

[agent001](webrtc-aor)

[agent001-auth](webrtc-auth)
username=agent001
password=SecurePass123!

[agent002](webrtc-endpoint)
auth=agent002-auth
aors=agent002

[agent002](webrtc-aor)

[agent002-auth](webrtc-auth)
username=agent002
password=SecurePass456!
EOF

# Configure RTP
cat > /etc/asterisk/rtp.conf << EOF
[general]
rtpstart=10000
rtpend=20000
icesupport=yes
stunaddr=stun.l.google.com:3478
rtcpenable=yes
rtcpmux=yes
EOF

# Configure dialplan
cat > /etc/asterisk/extensions.conf << EOF
[general]
static=yes
writeprotect=no

[from-internal]
exten => _1XXX,1,NoOp(Calling extension \${EXTEN})
    same => n,Dial(PJSIP/\${EXTEN},30)
    same => n,Hangup()

exten => 600,1,NoOp(Echo Test)
    same => n,Answer()
    same => n,Playback(demo-echotest)
    same => n,Echo()
    same => n,Hangup()

exten => 700,1,NoOp(Conference Room)
    same => n,Answer()
    same => n,ConfBridge(room1)
    same => n,Hangup()
EOF

chown -R asterisk:asterisk /etc/asterisk

echo "✓ Asterisk configured for WebRTC"

echo ""
echo "================================================"
echo "Step 10: Configuring Firewall"
echo "================================================"

ufw allow 5060/tcp
ufw allow 5060/udp
ufw allow 8088/tcp
ufw allow 8089/tcp
ufw allow 10000:20000/udp
ufw reload 2>/dev/null || true

echo "✓ Firewall configured"

echo ""
echo "================================================"
echo "Step 11: Starting Asterisk"
echo "================================================"

systemctl enable asterisk
systemctl start asterisk

sleep 3

if systemctl is-active --quiet asterisk; then
    echo "✓ Asterisk is running"
else
    echo "✗ Asterisk failed to start"
    echo "Check logs: journalctl -u asterisk -n 50"
fi

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Asterisk WebRTC server is ready!"
echo ""
echo "WebSocket URL: wss://$DOMAIN:8089/ws"
echo "Public IP: $PUBLIC_IP"
echo ""
echo "Test Agents:"
echo "  Username: agent001, Password: SecurePass123!"
echo "  Username: agent002, Password: SecurePass456!"
echo ""
echo "Test Extensions:"
echo "  600 - Echo test"
echo "  700 - Conference room"
echo "  1001, 1002 - Call agents"
echo ""
echo "Update your .env file:"
echo "  ASTERISK_WSS_URL=wss://$DOMAIN:8089/ws"
echo "  ASTERISK_REALM=$DOMAIN"
echo "  PBX_MODE=asterisk"
echo ""
echo "Connect to Asterisk CLI:"
echo "  asterisk -rvvv"
echo ""
echo "View logs:"
echo "  tail -f /var/log/asterisk/messages"
echo ""
echo "Check status:"
echo "  systemctl status asterisk"
echo "  asterisk -rx 'pjsip show endpoints'"
echo ""

