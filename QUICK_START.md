# Quick Start Guide

Get started with WebRTC Genesys Integration in 5 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development

# For WebRTC P2P mode (no Genesys required)
STUN_SERVER=stun:stun.l.google.com:19302
ALLOWED_ORIGINS=http://localhost:3000

# For Genesys SIP mode (optional)
GENESYS_WEBSOCKET_SERVER=wss://your-genesys-server.com:8443
GENESYS_REALM=your-realm
```

## Step 3: Start the Server

```bash
npm start
```

The server will start at `http://localhost:3000`

## Step 4: Test WebRTC P2P (No Genesys Required)

### On First Browser:
1. Open `http://localhost:3000`
2. Login:
   - Agent ID: `agent001`
   - Extension: `1001`
   - Leave SIP fields empty
3. Click "Login & Register"
4. Enter Room ID: `test-room-123`
5. Click "Start Call"

### On Second Browser (or Incognito Window):
1. Open `http://localhost:3000`
2. Login:
   - Agent ID: `agent002`
   - Extension: `1002`
3. Click "Login & Register"
4. Enter the same Room ID: `test-room-123`
5. Click "Start Call"

You should now be connected in a peer-to-peer WebRTC call!

## Step 5: Test Genesys SIP (Optional)

If you have Genesys PureEngage credentials:

1. Update `.env` with your Genesys configuration
2. Restart the server
3. Login with your SIP credentials:
   - Agent ID: Your Genesys agent ID
   - Extension: Your assigned extension
   - SIP Username: Your SIP username
   - SIP Password: Your SIP password
4. Enter a phone number or SIP address
5. Click "Start Call"

## Testing Call Controls

Once in a call, test these features:

- **Mute**: Click the microphone button
- **Video**: Toggle the video button
- **Hold**: Put the call on hold
- **Transfer**: Transfer to another agent

## Troubleshooting

### "Cannot connect to server"
- Ensure the server is running (`npm start`)
- Check firewall settings
- Verify the port is not in use

### "Media permission denied"
- Grant browser access to microphone/camera
- Check browser settings (chrome://settings/content)

### "No audio/video"
- Check device settings
- Ensure correct microphone/camera is selected
- Try refreshing the page

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Configure for production deployment
- Set up Genesys PureEngage integration
- Customize the UI to match your branding

## Common Use Cases

### 1. Agent-to-Agent Calling
Use WebRTC P2P mode for quick internal communications without Genesys.

### 2. Customer Calls via Genesys
Use Genesys SIP mode for customer interactions routed through your contact center.

### 3. Hybrid Mode
Support both modes - let agents choose based on call type.

## Support

- Check [README.md](README.md) for full documentation
- See [Troubleshooting section](#troubleshooting) for common issues
- Review browser console for error messages



