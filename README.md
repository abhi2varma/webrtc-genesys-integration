# WebRTC Client and Server with Genesys PureEngage Integration

A comprehensive WebRTC-based communication solution that integrates with Genesys PureEngage for enterprise contact center applications. This solution supports both peer-to-peer WebRTC calls and SIP-based calls through Genesys PureEngage.

## Features

### Core Features
- ✅ WebRTC peer-to-peer audio/video calls
- ✅ SIP.js integration with Genesys PureEngage
- ✅ Real-time signaling server with Socket.IO
- ✅ Agent authentication and registration
- ✅ Inbound and outbound call handling
- ✅ Modern, responsive web interface

### Call Controls
- 🎤 Audio mute/unmute
- 📹 Video enable/disable
- ⏸️ Call hold/resume
- ➡️ Call transfer
- 🔢 DTMF tone support (SIP calls)

### Genesys Integration
- 📞 SIP registration with Genesys PureEngage
- 📲 Incoming call notifications
- 🔄 Call state synchronization
- 👤 Agent presence management
- 🔀 Attended and blind transfers

## Architecture

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│  Web Client     │◄───────────────────────────►│ Signaling       │
│  (Browser)      │         Socket.IO           │ Server          │
│                 │                             │ (Node.js)       │
│  - WebRTC       │                             └─────────────────┘
│  - SIP.js       │
│  - UI           │
└─────────────────┘
         │
         │ SIP over WebSocket
         │
         ▼
┌─────────────────┐
│ Genesys         │
│ PureEngage      │
│ SIP Server      │
└─────────────────┘
```

## Prerequisites

- Node.js 14.x or higher
- npm or yarn
- Genesys PureEngage environment (for SIP features)
- Modern web browser with WebRTC support (Chrome, Firefox, Safari, Edge)

## Installation

1. **Clone the repository**
   ```bash
   cd WebRTC
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   
   Create a `.env` file in the root directory (use `.env.example` as template):
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Genesys PureEngage Configuration
   GENESYS_SIP_SERVER=sip.your-genesys-domain.com
   GENESYS_SIP_PORT=5060
   GENESYS_WEBSOCKET_SERVER=wss://your-genesys-domain.com:8443
   GENESYS_REALM=your-realm
   GENESYS_TENANT=your-tenant

   # STUN/TURN Server Configuration
   STUN_SERVER=stun:stun.l.google.com:19302
   TURN_SERVER=turn:your-turn-server.com:3478
   TURN_USERNAME=your-username
   TURN_CREDENTIAL=your-password

   # Security
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Access the application**
   
   Open your browser and navigate to: `http://localhost:3000`

## Configuration

### Genesys PureEngage Setup

1. **Enable WebRTC in Genesys**
   - Configure SIP WebSocket transport
   - Set up WebRTC gateway
   - Enable CORS for your application domain

2. **Agent Configuration**
   - Create agent accounts in Genesys
   - Assign SIP extensions
   - Configure agent groups and skills

3. **Network Configuration**
   - Open WebSocket port (typically 8443)
   - Configure firewall rules for WebRTC (UDP ports)
   - Set up STUN/TURN servers if behind NAT

### STUN/TURN Servers

For production deployments, especially when agents are behind NAT or firewalls, configure TURN servers:

```env
TURN_SERVER=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-password
```

Popular TURN server options:
- Coturn (open-source)
- Twilio TURN
- xirsys

## Usage

### Agent Login

1. Navigate to the application in your browser
2. Enter your credentials:
   - **Agent ID**: Your Genesys agent ID
   - **Extension**: Your SIP extension
   - **SIP Username**: Your SIP username (optional for P2P mode)
   - **SIP Password**: Your SIP password (optional for P2P mode)
3. Click "Login & Register"

### Making Calls

**WebRTC P2P Mode** (without Genesys SIP):
1. Enter a room ID (shared with the other party)
2. Click "Start Call"
3. Share the room ID with the other party

**Genesys SIP Mode** (with credentials):
1. Enter a phone number or SIP address
2. Click "Start Call"
3. The call will be routed through Genesys PureEngage

### Receiving Calls

- **WebRTC P2P**: The other party joins the same room ID
- **Genesys SIP**: Incoming calls will show a browser notification
  - Click "Accept" to answer
  - Click "Reject" to decline

### Call Controls

- **Mute**: Toggle microphone on/off
- **Video Off**: Toggle camera on/off
- **Hold**: Put the call on hold
- **Transfer**: Transfer the call to another agent or number

## API Reference

### Server Endpoints

#### GET /api/config
Returns client configuration including STUN/TURN servers.

**Response:**
```json
{
  "stunServer": "stun:stun.l.google.com:19302",
  "turnServer": "turn:example.com:3478",
  "turnUsername": "username",
  "turnCredential": "password",
  "genesysWebSocketServer": "wss://genesys.example.com:8443",
  "genesysRealm": "your-realm"
}
```

#### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2023-10-23T12:00:00.000Z",
  "connections": 5,
  "rooms": 2
}
```

### Socket.IO Events

#### Client → Server

- `register` - Register agent
- `join-room` - Join a call room
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer
- `ice-candidate` - Send ICE candidate
- `mute-audio` - Notify audio mute state
- `toggle-video` - Notify video state
- `hold-call` - Notify hold state
- `transfer-call` - Initiate call transfer
- `leave-room` - Leave call room

#### Server → Client

- `registered` - Registration confirmation
- `room-users` - List of users in room
- `user-joined` - New user joined
- `user-left` - User left
- `offer` - WebRTC offer received
- `answer` - WebRTC answer received
- `ice-candidate` - ICE candidate received
- `call-state-update` - Call state changed
- `user-audio-muted` - Remote audio muted
- `user-video-toggled` - Remote video toggled
- `call-held` - Call held/resumed

## Client API

### WebRTCClient Class

```javascript
const client = new WebRTCClient();

// Initialize
await client.initialize(socket, config);

// Start call
await client.startCall(roomId);

// Toggle audio
client.toggleAudio(muted);

// Toggle video
client.toggleVideo(enabled);

// End call
client.endCall();
```

### GenesysIntegration Class

```javascript
const genesys = new GenesysIntegration();

// Initialize
await genesys.initialize(config, credentials);

// Make call
await genesys.makeCall(destination);

// Hold/unhold
await genesys.toggleHold(hold);

// Transfer
await genesys.transferCall(target);

// Send DTMF
genesys.sendDTMF('1');

// End call
await genesys.endCall();
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to signaling server
- Check that the server is running
- Verify firewall settings allow WebSocket connections
- Check CORS configuration in `.env`

**Problem**: WebRTC connection fails
- Verify STUN server is accessible
- Configure TURN server for NAT traversal
- Check browser console for ICE candidate errors

### Genesys Integration Issues

**Problem**: SIP registration fails
- Verify Genesys WebSocket URL is correct
- Check SIP credentials
- Ensure Genesys WebRTC gateway is enabled
- Check network connectivity to Genesys server

**Problem**: Cannot make/receive calls
- Verify agent is logged in to Genesys
- Check agent state and availability
- Verify SIP extension configuration
- Check Genesys logs for errors

### Audio/Video Issues

**Problem**: No audio/video
- Grant browser permissions for microphone/camera
- Check device settings
- Verify correct input devices are selected
- Check that tracks are not muted in the browser

**Problem**: One-way audio
- Check firewall for UDP traffic
- Verify TURN server configuration
- Check remote party's settings

## Security Considerations

1. **Use HTTPS in production**
   ```javascript
   // Add SSL certificates
   const https = require('https');
   const fs = require('fs');
   
   const server = https.createServer({
     key: fs.readFileSync('key.pem'),
     cert: fs.readFileSync('cert.pem')
   }, app);
   ```

2. **Secure WebSocket connections**
   - Use WSS (WebSocket Secure)
   - Validate origin headers
   - Implement authentication tokens

3. **Protect sensitive data**
   - Never commit `.env` file
   - Use environment variables for secrets
   - Encrypt credentials in transit

4. **Input validation**
   - Sanitize user inputs
   - Validate phone numbers and extensions
   - Implement rate limiting

## Performance Optimization

1. **Scale with clustering**
   ```javascript
   const cluster = require('cluster');
   const numCPUs = require('os').cpus().length;
   
   if (cluster.isMaster) {
     for (let i = 0; i < numCPUs; i++) {
       cluster.fork();
     }
   } else {
     // Worker process
   }
   ```

2. **Use Redis for Socket.IO adapter**
   ```javascript
   const redis = require('socket.io-redis');
   io.adapter(redis({ host: 'localhost', port: 6379 }));
   ```

3. **Optimize media quality**
   - Adjust video resolution based on bandwidth
   - Use adaptive bitrate
   - Implement quality monitoring

## Browser Support

| Browser | Version | WebRTC | SIP.js |
|---------|---------|--------|--------|
| Chrome  | 74+     | ✅     | ✅     |
| Firefox | 66+     | ✅     | ✅     |
| Safari  | 12+     | ✅     | ✅     |
| Edge    | 79+     | ✅     | ✅     |

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: See `/docs` folder
- Genesys Support: Contact your Genesys representative

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Changelog

### Version 1.0.0
- Initial release
- WebRTC peer-to-peer calling
- Genesys PureEngage SIP integration
- Full call control features
- Modern responsive UI

## Acknowledgments

- Socket.IO for real-time communication
- SIP.js for SIP stack implementation
- Genesys for PureEngage platform



