# Genesys PureEngage Setup Guide

This guide walks you through configuring Genesys PureEngage for WebRTC integration.

## Prerequisites

- Genesys PureEngage 8.5 or higher
- Administrator access to Genesys Configuration
- WebRTC Gateway configured in Genesys
- Network access to Genesys servers

## Architecture Overview

```
┌──────────────┐     WebSocket      ┌──────────────┐
│ Web Client   │ ◄─────────────────►│ Genesys      │
│ (Browser)    │  SIP over WS       │ WebRTC GW    │
└──────────────┘                    └──────────────┘
                                            │
                                            │ SIP
                                            ▼
                                    ┌──────────────┐
                                    │ Genesys SIP  │
                                    │ Server       │
                                    └──────────────┘
```

## Step 1: Configure Genesys WebRTC Gateway

### 1.1 Enable WebRTC Gateway

In Genesys Administrator:

1. Navigate to **Configuration Manager**
2. Go to **Applications** → **WebRTC Gateway**
3. Enable the gateway if not already enabled
4. Configure the following settings:

```
Application Type: WebRTC Gateway
Host: webrtc-gw.your-domain.com
Port: 8443
WebSocket Path: /ws
Enable SSL: Yes
```

### 1.2 Configure Transport

Add WebSocket transport:

```
Transport Type: WebSocket
Protocol: WSS
Port: 8443
Max Connections: 1000
```

### 1.3 Configure CORS

Add allowed origins:

```
Allowed Origins:
  - http://localhost:3000
  - https://your-app-domain.com
  
Allowed Methods:
  - GET
  - POST
  - OPTIONS
```

## Step 2: Configure SIP Server

### 2.1 SIP Server Settings

1. Navigate to **SIP Server** configuration
2. Configure the following:

```
Server Name: sip-server-01
Host: sip.your-domain.com
Port: 5060
Transport: TCP, UDP, WSS
Realm: your-realm.com
```

### 2.2 Enable WebRTC Support

```
WebRTC Enabled: Yes
SRTP Enabled: Yes (for secure media)
ICE Enabled: Yes
STUN Server: stun:stun.l.google.com:19302
```

### 2.3 Media Server Configuration

```
Media Server: your-media-server
RTP Port Range: 10000-20000
Codec Priority:
  1. OPUS
  2. G.722
  3. PCMU
  4. PCMA
```

## Step 3: Configure Agents

### 3.1 Create Agent Accounts

1. Navigate to **Configuration** → **Agents**
2. For each agent, configure:

```
Agent ID: agent001
Username: agent001
Password: [secure password]
Employee ID: EMP001
```

### 3.2 Assign DN (Directory Numbers)

1. Navigate to **Configuration** → **DNs**
2. Create or assign DN to agent:

```
DN: 1001
Type: Extension
Switch: your-switch
Register: Yes
Capacity Rule: your-capacity-rule
```

### 3.3 Link Agent to DN

```
Agent: agent001
Place: your-place
DN: 1001
```

### 3.4 Create SIP Credentials

1. Navigate to **Configuration** → **Persons**
2. Find the agent's person record
3. Add SIP credentials:

```
SIP Username: agent001@your-realm.com
SIP Password: [secure password]
SIP Domain: your-realm.com
```

## Step 4: Configure Skills and Routing

### 4.1 Assign Skills

```
Agent: agent001
Skills:
  - English (Level: 10)
  - CustomerService (Level: 8)
  - Sales (Level: 7)
```

### 4.2 Configure Agent Groups

```
Group Name: WebRTC_Agents
Members:
  - agent001
  - agent002
  - agent003
```

## Step 5: Network Configuration

### 5.1 Firewall Rules

Open the following ports:

```
TCP 5060  - SIP signaling
TCP 8443  - WebSocket (WSS)
UDP 10000-20000 - RTP media
TCP 443   - HTTPS (for TURN)
UDP 3478  - STUN/TURN
```

### 5.2 NAT Configuration

If behind NAT, configure:

```
External IP: your-external-ip
Internal IP: your-internal-ip
NAT Traversal: Enabled
STUN Server: stun:stun.l.google.com:19302
```

### 5.3 TURN Server (Recommended)

For agents behind firewalls:

```
TURN Server: turn:your-turn-server.com:3478
Username: your-turn-username
Credential: your-turn-password
```

## Step 6: Configure Application

### 6.1 Update .env File

```env
# Genesys Configuration
GENESYS_SIP_SERVER=sip.your-domain.com
GENESYS_SIP_PORT=5060
GENESYS_WEBSOCKET_SERVER=wss://webrtc-gw.your-domain.com:8443/ws
GENESYS_REALM=your-realm.com
GENESYS_TENANT=your-tenant

# STUN/TURN
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-password
```

### 6.2 Test Configuration

Use this test script:

```bash
# Test WebSocket connectivity
wscat -c wss://webrtc-gw.your-domain.com:8443/ws

# Test SIP server
sipsak -s sip:sip.your-domain.com

# Test STUN server
stunclient your-stun-server.com
```

## Step 7: Testing

### 7.1 Test Agent Login

1. Open the application
2. Enter agent credentials:
   ```
   Agent ID: agent001
   Extension: 1001
   SIP Username: agent001@your-realm.com
   SIP Password: [password]
   ```
3. Verify SIP registration in Genesys logs

### 7.2 Test Outbound Call

1. Login as agent
2. Enter destination: `+15551234567`
3. Click "Start Call"
4. Verify call routing in Genesys

### 7.3 Test Inbound Call

1. Login as agent
2. Set agent state to "Ready"
3. Place test call to agent's DN
4. Verify call is received

### 7.4 Test Call Controls

Test each control:
- ✅ Mute/Unmute
- ✅ Hold/Resume
- ✅ Transfer (blind and attended)
- ✅ Conference
- ✅ DTMF

## Troubleshooting

### Registration Fails

**Check:**
- SIP credentials are correct
- Realm/domain matches configuration
- WebSocket URL is accessible
- Firewall allows WebSocket connections

**Logs to check:**
- Genesys SIP Server logs
- WebRTC Gateway logs
- Browser console

### No Audio in Calls

**Check:**
- Media server is running
- RTP ports are open
- SRTP is properly configured
- NAT traversal is working
- TURN server is accessible (if behind NAT)

**Debug:**
```bash
# Check RTP flow
tcpdump -i any -n udp port 10000-20000

# Test TURN connectivity
turnutils_uclient -v -u username -w password your-turn-server.com
```

### Call Routing Issues

**Check:**
- Agent is in "Ready" state
- Skills are properly configured
- Routing strategy is correct
- DN is registered

**Verify in Genesys:**
1. Check agent state in Genesys Administrator
2. Review routing logs
3. Verify DN registration status

## Advanced Configuration

### Enable Recording

```
Recording Mode: All calls
Recording Server: your-recording-server
Format: WAV/MP3
Encryption: Enabled
```

### Configure Quality Monitoring

```
Quality Threshold: 3.5 (MOS)
Packet Loss Threshold: 5%
Latency Threshold: 150ms
Jitter Threshold: 30ms
```

### Enable Presence

```
Presence Server: your-presence-server
Publish Interval: 60 seconds
States: Available, Busy, Away, DND
```

### Screen Pop Integration

```javascript
// Configure interaction data
socket.on('call-state-update', (data) => {
  if (data.state === 'connected') {
    // Trigger screen pop with customer data
    showCustomerInfo(data.interactionId);
  }
});
```

## Security Best Practices

1. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of letters, numbers, symbols

2. **Enable TLS/SRTP**
   - All signaling over WSS
   - All media over SRTP

3. **Implement IP Whitelisting**
   - Restrict access to known IPs
   - Use VPN for remote agents

4. **Regular Audits**
   - Review agent access logs
   - Monitor for unusual activity
   - Update credentials regularly

## Monitoring and Maintenance

### Key Metrics

Monitor these metrics:

```
- Registration success rate
- Call setup time
- Audio quality (MOS score)
- Packet loss percentage
- Connection failures
- Transfer success rate
```

### Health Checks

```bash
# Check Genesys services
curl https://webrtc-gw.your-domain.com:8443/health

# Check SIP registration
sipsak -s sip:agent001@your-realm.com

# Monitor WebSocket connections
netstat -an | grep 8443
```

### Log Monitoring

Key logs to monitor:

```
- /var/log/genesys/sip-server.log
- /var/log/genesys/webrtc-gateway.log
- /var/log/genesys/media-server.log
```

## Support Resources

- **Genesys Documentation**: https://docs.genesys.com
- **Genesys Community**: https://community.genesys.com
- **Technical Support**: Contact your Genesys support team
- **WebRTC Troubleshooting**: https://webrtc.org/getting-started/overview

## Appendix

### Sample SIP.js Configuration

```javascript
{
  uri: 'sip:agent001@your-realm.com',
  transportOptions: {
    server: 'wss://webrtc-gw.your-domain.com:8443/ws'
  },
  authorizationUsername: 'agent001',
  authorizationPassword: 'password',
  sessionDescriptionHandlerFactoryOptions: {
    peerConnectionConfiguration: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:your-turn-server.com:3478',
          username: 'username',
          credential: 'password'
        }
      ]
    }
  }
}
```

### Codec Priorities

Recommended codec priorities for best quality:

```
1. OPUS - Best quality, adaptive bitrate
2. G.722 - Wideband audio
3. PCMU/PCMA - Fallback options
```

### Bandwidth Requirements

```
Audio only: 100 kbps (up/down)
Audio + Video: 500 kbps - 2 Mbps
Screen sharing: +1-2 Mbps
```


