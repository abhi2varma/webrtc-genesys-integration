/**
 * WebRTC Signaling Server with Genesys PureEngage Integration
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients and their rooms
const rooms = new Map();
const users = new Map();

// Configuration endpoint for client
app.get('/api/config', (req, res) => {
  res.json({
    stunServer: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302',
    turnServer: process.env.TURN_SERVER || null,
    turnUsername: process.env.TURN_USERNAME || null,
    turnCredential: process.env.TURN_CREDENTIAL || null,
    genesysWebSocketServer: process.env.GENESYS_WEBSOCKET_SERVER || null,
    genesysRealm: process.env.GENESYS_REALM || null
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: users.size,
    rooms: rooms.size
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`);

  // Register user
  socket.on('register', (data) => {
    const { userId, agentId, extension } = data;
    users.set(socket.id, {
      userId: userId || socket.id,
      agentId,
      extension,
      socketId: socket.id,
      status: 'available'
    });
    console.log(`[${new Date().toISOString()}] User registered:`, users.get(socket.id));
    socket.emit('registered', { 
      socketId: socket.id,
      success: true 
    });
  });

  // Join a room
  socket.on('join-room', (data) => {
    const { roomId, userId } = data;
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);

    const user = users.get(socket.id);
    if (user) {
      user.roomId = roomId;
      user.status = 'in-call';
    }

    console.log(`[${new Date().toISOString()}] User ${userId} joined room: ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userId: user?.userId || userId,
      timestamp: new Date().toISOString()
    });

    // Send list of existing users in room
    const roomUsers = Array.from(rooms.get(roomId))
      .filter(id => id !== socket.id)
      .map(id => ({
        socketId: id,
        userId: users.get(id)?.userId
      }));

    socket.emit('room-users', { users: roomUsers });
  });

  // WebRTC signaling: offer
  socket.on('offer', (data) => {
    const { offer, roomId, targetSocketId } = data;
    console.log(`[${new Date().toISOString()}] Offer received for room: ${roomId}`);
    
    if (targetSocketId) {
      // Send to specific user
      io.to(targetSocketId).emit('offer', {
        offer,
        fromSocketId: socket.id,
        roomId
      });
    } else {
      // Broadcast to room
      socket.to(roomId).emit('offer', {
        offer,
        fromSocketId: socket.id,
        roomId
      });
    }
  });

  // WebRTC signaling: answer
  socket.on('answer', (data) => {
    const { answer, roomId, targetSocketId } = data;
    console.log(`[${new Date().toISOString()}] Answer received for room: ${roomId}`);
    
    io.to(targetSocketId).emit('answer', {
      answer,
      fromSocketId: socket.id,
      roomId
    });
  });

  // WebRTC signaling: ICE candidate
  socket.on('ice-candidate', (data) => {
    const { candidate, roomId, targetSocketId } = data;
    console.log(`[${new Date().toISOString()}] ICE candidate received for room: ${roomId}`);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', {
        candidate,
        fromSocketId: socket.id,
        roomId
      });
    } else {
      socket.to(roomId).emit('ice-candidate', {
        candidate,
        fromSocketId: socket.id,
        roomId
      });
    }
  });

  // Genesys-specific: Call state updates
  socket.on('call-state-update', (data) => {
    const { state, callId, roomId, interactionId } = data;
    console.log(`[${new Date().toISOString()}] Call state update:`, { state, callId, interactionId });
    
    const user = users.get(socket.id);
    if (user) {
      user.callState = state;
      user.callId = callId;
      user.interactionId = interactionId;
    }

    // Broadcast to room
    if (roomId) {
      socket.to(roomId).emit('call-state-update', {
        state,
        callId,
        interactionId,
        fromSocketId: socket.id,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Call control: Mute
  socket.on('mute-audio', (data) => {
    const { roomId, muted } = data;
    socket.to(roomId).emit('user-audio-muted', {
      socketId: socket.id,
      muted,
      timestamp: new Date().toISOString()
    });
  });

  // Call control: Video toggle
  socket.on('toggle-video', (data) => {
    const { roomId, enabled } = data;
    socket.to(roomId).emit('user-video-toggled', {
      socketId: socket.id,
      enabled,
      timestamp: new Date().toISOString()
    });
  });

  // Call control: Hold
  socket.on('hold-call', (data) => {
    const { roomId, held } = data;
    socket.to(roomId).emit('call-held', {
      socketId: socket.id,
      held,
      timestamp: new Date().toISOString()
    });
  });

  // Call transfer initiation
  socket.on('transfer-call', (data) => {
    const { roomId, targetAgent, callId } = data;
    console.log(`[${new Date().toISOString()}] Call transfer initiated:`, { targetAgent, callId });
    
    socket.to(roomId).emit('call-transfer-initiated', {
      targetAgent,
      callId,
      fromSocketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Leave room
  socket.on('leave-room', (data) => {
    const { roomId } = data;
    handleLeaveRoom(socket, roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${socket.id}`);
    
    const user = users.get(socket.id);
    if (user && user.roomId) {
      handleLeaveRoom(socket, user.roomId);
    }
    
    users.delete(socket.id);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Socket error for ${socket.id}:`, error);
  });
});

/**
 * Handle user leaving a room
 */
function handleLeaveRoom(socket, roomId) {
  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(socket.id);
    
    // Clean up empty rooms
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
      console.log(`[${new Date().toISOString()}] Room ${roomId} deleted (empty)`);
    } else {
      // Notify others
      socket.to(roomId).emit('user-left', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  socket.leave(roomId);
  
  const user = users.get(socket.id);
  if (user) {
    user.roomId = null;
    user.status = 'available';
  }
  
  console.log(`[${new Date().toISOString()}] User left room: ${roomId}`);
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  WebRTC Signaling Server with Genesys PureEngage         ║
║  Server running on http://localhost:${PORT}                  ║
║  Environment: ${process.env.NODE_ENV || 'development'}                            ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});



