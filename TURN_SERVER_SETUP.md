# TURN Server Setup Guide

For internet deployment, a TURN server is **CRITICAL** for NAT traversal. This guide covers different TURN server options.

## Why You Need a TURN Server

When your agents are on the internet (behind various NATs/firewalls), direct peer-to-peer connections often fail. A TURN server relays media traffic when direct connections aren't possible.

```
Agent (Home) → NAT → Firewall → Internet → TURN Server → Genesys
                                              ↓
                                          Relays Media
```

## Option 1: Cloud TURN Services (Easiest)

### Twilio TURN (Recommended)

**Pros:**
- Reliable global infrastructure
- Pay-as-you-go pricing (~$0.0004/GB)
- Free trial available
- No maintenance

**Setup:**

1. Sign up at https://www.twilio.com/console/voice/calls/turn-credentials
2. Get your credentials
3. Update `.env`:

```env
TURN_SERVER=turn:global.turn.twilio.com:3478?transport=tcp
TURN_USERNAME=your-username-from-twilio
TURN_CREDENTIAL=your-credential-from-twilio
```

**Cost Estimate:**
- Light use (1-10 agents): ~$1-5/month
- Medium use (10-50 agents): ~$10-30/month
- Heavy use (50+ agents): ~$50-100/month

### xirsys

**Pros:**
- Free tier available (500MB/month)
- Good performance
- Simple setup

**Setup:**

1. Sign up at https://xirsys.com
2. Create a channel
3. Get credentials from dashboard
4. Update `.env`:

```env
TURN_SERVER=turn:your-account.xirsys.com:80?transport=tcp
TURN_USERNAME=your-xirsys-username
TURN_CREDENTIAL=your-xirsys-credential
```

### Metered TURN

**Pros:**
- Free tier (50GB/month)
- Easy to use
- Good documentation

**Setup:**

1. Sign up at https://www.metered.ca/turn-server
2. Get API key
3. Update `.env`:

```env
TURN_SERVER=turn:a.relay.metered.ca:443?transport=tcp
TURN_USERNAME=your-metered-username
TURN_CREDENTIAL=your-metered-credential
```

## Option 2: Self-Hosted TURN Server (Coturn)

**Pros:**
- Full control
- No per-usage costs
- Can run on same server

**Cons:**
- Requires maintenance
- Need to manage scaling
- Bandwidth costs

### Installing Coturn

#### On Ubuntu 20.04+

```bash
# Install Coturn
sudo apt update
sudo apt install -y coturn

# Enable Coturn service
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
```

### Configure Coturn

Edit configuration:

```bash
sudo nano /etc/turnserver.conf
```

**Basic Configuration:**

```ini
# Listening interfaces
listening-ip=0.0.0.0
relay-ip=0.0.0.0

# External IP (your server's public IP)
external-ip=YOUR_PUBLIC_IP

# Listening ports
listening-port=3478
tls-listening-port=5349

# Relay ports for media
min-port=49152
max-port=65535

# Authentication
lt-cred-mech
user=webrtc:YOUR_STRONG_PASSWORD

# Realm
realm=turn.yourcompany.com

# Logging
log-file=/var/log/turnserver.log
verbose

# Performance settings
max-bps=3000000
total-quota=100
bps-capacity=0

# Security
no-multicast-peers
no-cli
no-loopback-peers
no-stdout-log
fingerprint
```

**With SSL (Recommended):**

```ini
# Add to above configuration
cert=/etc/letsencrypt/live/turn.yourcompany.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.yourcompany.com/privkey.pem
cipher-list="ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512"
```

### Get SSL Certificate for TURN

```bash
# Get certificate for turn subdomain
sudo certbot certonly --standalone -d turn.yourcompany.com

# Give turnserver access to certificates
sudo chmod 755 /etc/letsencrypt/live/
sudo chmod 755 /etc/letsencrypt/archive/
```

### Start Coturn

```bash
# Start service
sudo systemctl start coturn
sudo systemctl enable coturn

# Check status
sudo systemctl status coturn

# View logs
sudo tail -f /var/log/turnserver.log
```

### Configure Firewall

```bash
# Allow TURN ports
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# Allow relay ports
sudo ufw allow 49152:65535/udp
```

### Update Application Configuration

```env
# For TCP (works through most firewalls)
TURN_SERVER=turn:turn.yourcompany.com:3478?transport=tcp
TURN_USERNAME=webrtc
TURN_CREDENTIAL=YOUR_STRONG_PASSWORD

# For TLS (more secure)
# TURN_SERVER=turns:turn.yourcompany.com:5349?transport=tcp
# TURN_USERNAME=webrtc
# TURN_CREDENTIAL=YOUR_STRONG_PASSWORD
```

### Testing Coturn

#### Test 1: Basic Connectivity

```bash
# Install test utility
sudo apt install -y stun-client

# Test STUN
stunclient turn.yourcompany.com 3478
```

#### Test 2: TURN Functionality

```bash
# Install turnutils
sudo apt install -y coturn-utils

# Test TURN with credentials
turnutils_uclient -v -u webrtc -w YOUR_STRONG_PASSWORD turn.yourcompany.com

# Test with TLS
turnutils_uclient -v -u webrtc -w YOUR_STRONG_PASSWORD -s turn.yourcompany.com -p 5349
```

#### Test 3: Web-based Test

Use this online tool: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

1. Open the URL
2. Add your TURN server:
   ```
   turn:turn.yourcompany.com:3478
   Username: webrtc
   Password: YOUR_STRONG_PASSWORD
   ```
3. Click "Gather candidates"
4. You should see "relay" type candidates

### Monitoring Coturn

#### Check Active Sessions

```bash
# View log for active sessions
sudo tail -f /var/log/turnserver.log | grep "session"
```

#### Monitor Bandwidth Usage

```bash
# Install bandwidth monitoring
sudo apt install -y vnstat

# Initialize monitoring on TURN ports
sudo vnstat -u -i eth0

# View bandwidth usage
vnstat -l
```

#### Setup Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/turnserver
```

Add:

```
/var/log/turnserver.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 turnserver turnserver
    sharedscripts
    postrotate
        systemctl reload coturn > /dev/null 2>&1 || true
    endscript
}
```

### Advanced Coturn Configuration

#### Multiple Relay IPs

If you have multiple IPs:

```ini
relay-ip=10.0.0.1
relay-ip=10.0.0.2
external-ip=PUBLIC_IP_1
external-ip=PUBLIC_IP_2
```

#### Database for User Management

For dynamic user management:

```ini
# Use PostgreSQL
psql-userdb="host=localhost dbname=turndb user=turnserver password=password"

# Or use MySQL
mysql-userdb="host=localhost dbname=turndb user=turnserver password=password"

# Or use MongoDB
mongo-userdb="mongodb://localhost:27017/turndb"
```

#### Redis for Session Management

```ini
redis-userdb="ip=127.0.0.1 dbname=0 password=redis_password"
```

### Performance Tuning

#### Increase System Limits

```bash
# Edit limits
sudo nano /etc/security/limits.conf
```

Add:

```
turnserver soft nofile 65536
turnserver hard nofile 65536
turnserver soft nproc 65536
turnserver hard nproc 65536
```

#### Optimize Network

```bash
# Edit sysctl
sudo nano /etc/sysctl.conf
```

Add:

```
net.ipv4.ip_local_port_range = 10000 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864
```

Apply:

```bash
sudo sysctl -p
```

## Option 3: Multi-TURN Setup (High Availability)

For production, use multiple TURN servers:

### Configuration

```env
# Primary TURN
TURN_SERVER=turn:turn1.yourcompany.com:3478?transport=tcp
TURN_USERNAME=webrtc
TURN_CREDENTIAL=password

# Backup TURN (handled in client code)
# Update webrtc-client.js to include multiple TURN servers
```

### Update Client Configuration

In `public/webrtc-client.js`, modify the ICE servers:

```javascript
const iceServers = [
    { urls: this.config.stunServer },
    {
        urls: [
            'turn:turn1.yourcompany.com:3478?transport=tcp',
            'turn:turn2.yourcompany.com:3478?transport=tcp',
            'turns:turn1.yourcompany.com:5349?transport=tcp'
        ],
        username: this.config.turnUsername,
        credential: this.config.turnCredential
    }
];
```

## Comparison Table

| Option | Cost | Setup Difficulty | Maintenance | Reliability | Best For |
|--------|------|------------------|-------------|-------------|----------|
| **Twilio** | Pay-per-use | Very Easy | None | Excellent | Production, Any size |
| **xirsys** | Free/Paid tiers | Easy | None | Good | Small-medium deployments |
| **Metered** | Free tier | Easy | None | Good | Testing, Small deployments |
| **Coturn (Self-hosted)** | Server costs only | Medium | Regular | Good | Cost-sensitive, High usage |
| **Multi-TURN** | Varies | Hard | Regular | Excellent | Enterprise, Mission-critical |

## Bandwidth Estimation

### Per Call:

```
Audio only:     ~100 kbps = ~45 MB/hour
Audio + Video:  ~1 Mbps = ~450 MB/hour
HD Video:       ~2 Mbps = ~900 MB/hour
```

### Monthly Usage (estimated):

```
10 agents × 4 hours/day × 20 days × 450 MB/hour ≈ 360 GB/month
50 agents × 4 hours/day × 20 days × 450 MB/hour ≈ 1.8 TB/month
```

### Cost Comparison (for 50 agents):

```
Twilio:  1.8 TB × $0.40/GB = ~$720/month
Coturn:  Server ($20) + Bandwidth ($50-100) = ~$100/month
```

## Troubleshooting TURN Issues

### TURN Not Working

1. **Check connectivity:**
   ```bash
   telnet turn.yourcompany.com 3478
   ```

2. **Verify credentials:**
   ```bash
   turnutils_uclient -v -u webrtc -w password turn.yourcompany.com
   ```

3. **Check firewall:**
   ```bash
   sudo ufw status
   sudo iptables -L -n | grep 3478
   ```

4. **View logs:**
   ```bash
   sudo tail -f /var/log/turnserver.log
   ```

### High Latency

- Use geographically closer TURN servers
- Enable TCP transport: `?transport=tcp`
- Check bandwidth limitations

### Connection Failures

- Verify public IP in coturn config matches actual public IP
- Check NAT configuration
- Ensure UDP ports are open (49152-65535)

## Recommended Setup for Your Deployment

### Development/Testing:
- Use **Metered** or **xirsys** free tier

### Small Production (< 10 agents):
- Use **xirsys** paid tier or **Twilio**

### Medium Production (10-50 agents):
- Use **Twilio** or self-hosted **Coturn**

### Large Production (50+ agents):
- Use **Multi-TURN** setup with self-hosted Coturn + Twilio backup

## Next Steps

1. Choose your TURN option
2. Set up the TURN server
3. Update `.env` with TURN credentials
4. Test with the web-based trickle ICE tool
5. Deploy and monitor

For your specific use case (connecting internet agents to on-premises Genesys), I recommend:

**Option 1: Twilio** (if budget allows)
- Most reliable
- No maintenance
- Global infrastructure

**Option 2: Self-hosted Coturn** (for cost savings)
- Install on your internet server
- ~$20-50/month total cost
- Good for 20-50 agents

Need help with a specific setup? Let me know!

