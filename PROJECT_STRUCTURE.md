# Project Structure

```
WebRTC/
│
├── server.js                    # Main signaling server (Node.js + Socket.IO)
├── package.json                 # Dependencies and scripts
├── .gitignore                   # Git ignore rules
│
├── public/                      # Client-side files
│   ├── index.html              # Main application UI
│   ├── styles.css              # Application styles
│   ├── app.js                  # Main application logic
│   ├── webrtc-client.js        # WebRTC P2P client implementation
│   ├── genesys-integration.js  # Genesys SIP.js integration
│   └── audio/                  # Audio assets (ringtones, etc.)
│       └── .gitkeep
│
├── README.md                    # Main documentation
├── QUICK_START.md              # Quick start guide
├── GENESYS_SETUP.md            # Genesys configuration guide
├── PROJECT_STRUCTURE.md        # This file
├── LICENSE                      # MIT License
│
├── setup.bat                    # Windows setup script
└── setup.sh                     # Linux/Mac setup script
```

## File Descriptions

### Server-Side

#### `server.js`
The main signaling server that handles:
- WebRTC signaling (offer/answer/ICE candidates)
- Room management for peer-to-peer calls
- Call state synchronization
- Socket.IO event handling
- REST API endpoints for configuration

### Client-Side

#### `public/index.html`
The main user interface featuring:
- Agent login form
- Video/audio containers
- Call controls (mute, hold, transfer, etc.)
- Activity log display
- Modal dialogs for transfers

#### `public/styles.css`
Modern, responsive styling with:
- CSS custom properties for theming
- Flexbox/Grid layouts
- Responsive design for mobile devices
- Professional color scheme
- Smooth animations and transitions

#### `public/app.js`
Main application controller that:
- Manages UI state and interactions
- Coordinates between WebRTC and Genesys modes
- Handles user events (login, call controls)
- Updates UI based on call states
- Manages logging and status displays

#### `public/webrtc-client.js`
WebRTC peer-to-peer implementation:
- `WebRTCClient` class for P2P calls
- Peer connection management
- ICE candidate handling
- Media stream management
- Call control methods

#### `public/genesys-integration.js`
Genesys PureEngage integration:
- `GenesysIntegration` class using SIP.js
- SIP registration and authentication
- Inbound/outbound call handling
- Advanced call controls (hold, transfer, DTMF)
- Session management

### Configuration

#### `package.json`
Node.js project configuration:
- Dependencies (Express, Socket.IO, SIP.js, etc.)
- NPM scripts (start, dev)
- Project metadata

#### `.env` (not tracked)
Environment configuration:
- Server settings
- Genesys connection details
- STUN/TURN server configuration
- Security settings

### Documentation

#### `README.md`
Comprehensive documentation including:
- Feature overview
- Installation instructions
- Configuration guide
- API reference
- Troubleshooting

#### `QUICK_START.md`
5-minute quick start guide for:
- Basic setup
- Testing P2P calls
- Testing Genesys integration
- Common use cases

#### `GENESYS_SETUP.md`
Detailed Genesys configuration:
- Gateway setup
- Agent configuration
- Network setup
- Security best practices
- Advanced features

### Setup Scripts

#### `setup.bat` (Windows)
Automated setup script that:
- Checks Node.js installation
- Installs dependencies
- Creates .env file
- Displays next steps

#### `setup.sh` (Linux/Mac)
Unix-equivalent setup script with same functionality

## Key Components

### Signaling Flow

```
Client A                Server              Client B
   |                      |                     |
   |---register---------->|                     |
   |<--registered---------|                     |
   |                      |<---register---------|
   |                      |----registered------>|
   |---join-room--------->|                     |
   |<--room-users---------|                     |
   |                      |<---join-room--------|
   |                      |----user-joined----->|
   |---offer------------->|                     |
   |                      |-----offer---------->|
   |                      |<----answer----------|
   |<--answer-------------|                     |
   |---ice-candidate----->|                     |
   |                      |----ice-candidate--->|
   |                      |<---ice-candidate----|
   |<--ice-candidate------|                     |
   |                                            |
   |<========== WebRTC Connection ===========>|
```

### Call State Management

```
Idle → Calling → Connected → [Hold/Active] → Disconnected
  ↑                                               |
  |_______________________________________________|
```

### Component Interaction

```
┌─────────────────────────────────────────────────┐
│                   app.js                        │
│  (UI Logic & State Management)                  │
└───────────────┬──────────────┬──────────────────┘
                │              │
        ┌───────▼──────┐  ┌────▼────────────────┐
        │ WebRTCClient │  │ GenesysIntegration  │
        │              │  │                     │
        │ - P2P Calls  │  │ - SIP Calls         │
        │ - ICE/STUN   │  │ - Registration      │
        │ - Signaling  │  │ - Call Control      │
        └───────┬──────┘  └────┬────────────────┘
                │              │
        ┌───────▼──────────────▼────────┐
        │      Socket.IO / SIP.js       │
        │                                │
        │  Network Communication Layer   │
        └────────────────────────────────┘
```

## Development Workflow

### Adding New Features

1. **Server-side**: Edit `server.js`
   - Add Socket.IO event handlers
   - Implement business logic
   - Update API endpoints

2. **Client-side**: Edit appropriate JS files
   - `app.js` for UI logic
   - `webrtc-client.js` for WebRTC features
   - `genesys-integration.js` for Genesys features

3. **UI**: Edit `index.html` and `styles.css`
   - Add new UI components
   - Style new elements
   - Ensure responsive design

### Testing

1. Start server: `npm start`
2. Open multiple browsers/tabs
3. Test different scenarios:
   - P2P calls
   - Genesys SIP calls
   - Call controls
   - Error conditions

### Deployment

1. Update `.env` for production
2. Set `NODE_ENV=production`
3. Configure HTTPS/WSS
4. Set up reverse proxy (nginx/Apache)
5. Configure firewall rules
6. Set up monitoring

## Dependencies

### Server
- `express` - Web server framework
- `socket.io` - Real-time communication
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment configuration

### Client
- `socket.io-client` - Socket.IO client library
- `sip.js` - SIP protocol implementation
- Native WebRTC APIs (built into browsers)

## Browser Compatibility

- Chrome 74+
- Firefox 66+
- Safari 12+
- Edge 79+

## Performance Considerations

- Maximum 100 concurrent connections per server instance
- Use Redis adapter for horizontal scaling
- Implement load balancing for production
- Monitor bandwidth usage
- Optimize video quality based on network conditions

## Security Notes

- All passwords should be hashed
- Use HTTPS/WSS in production
- Implement rate limiting
- Validate all user inputs
- Use secure WebSocket connections
- Enable CORS only for trusted domains
- Regular security audits

## Future Enhancements

Potential features to add:
- [ ] Recording functionality
- [ ] Screen sharing
- [ ] Conference calls (3+ participants)
- [ ] Chat/messaging
- [ ] File transfer
- [ ] Call analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] Integration with CRM systems
- [ ] AI-powered transcription



