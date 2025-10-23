/**
 * WebRTC Signaling Server with HTTPS Support
 * For production deployment on internet
 */

const express = require('express');
const https = require('https');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
let server;

// Check if SSL certificates are provided for HTTPS
const useHTTPS = process.env.SSL_KEY && process.env.SSL_CERT && 
                 fs.existsSync(process.env.SSL_KEY) && 
                 fs.existsSync(process.env.SSL_CERT);

if (useHTTPS) {
  // HTTPS server for production
  const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT)
  };
  server = https.createServer(sslOptions, app);
  console.log('✓ HTTPS server configured');
} else {
  // HTTP server for development
  server = http.createServer(app);
  console.log('⚠ HTTP server configured (development mode)');
}

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

const io = socketIO(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.warn(`Blocked by CORS: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy if behind Nginx/load balancer
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Store connected clients and their rooms
const rooms = new Map();
const users = new Map();

// Statistics
const stats = {
  startTime: new Date(),
  totalConnections: 0,
  totalCalls: 0,
  currentConnections: 0,
  currentCalls: 0
};

// Configuration endpoint for client
app.get('/api/config', (req, res) => {
  res.json({
    stunServer: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302',
    turnServer: process.env.TURN_SERVER || null,
    turnUsername: process.env.TURN_USERNAME || null,
    turnCredential: process.env.TURN_CREDENTIAL || null,
    genesysWebSocketServer: process.env.GENESYS_WEBSOCKET_SERVER || null,
    genesysRealm: process.env.GENESYS_REALM || null,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const uptime = Math.floor((new Date() - stats.startTime) / 1000);
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    uptime: uptime,
    timestamp: new Date().toISOString(),
    connections: stats.currentConnections,
    rooms: rooms.size,
    stats: {
      totalConnections: stats.totalConnections,
      totalCalls: stats.totalCalls,
      currentConnections: stats.currentConnections,
      currentCalls: stats.currentCalls
    }
  });
});

// Stats endpoint (for monitoring)
app.get('/api/stats', (req, res) => {
  const uptime = Math.floor((new Date() - stats.startTime) / 1000);
  
  // Get room details
  const roomDetails = Array.from(rooms.entries()).map(([roomId, users]) => ({
    roomId,
    userCount: users.size,
    users: Array.from(users)
  }));

  res.json({
    uptime,
    startTime: stats.startTime,
    totalConnections: stats.totalConnections,
    totalCalls: stats.totalCalls,
    currentConnections: stats.currentConnections,
    currentCalls: stats.currentCalls,
    rooms: roomDetails,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  stats.totalConnections++;
  stats.currentConnections++;
  
  const clientIp = socket.handshake.headers['x-forwarded-for'] || 
                   socket.handshake.address;
  
  console.log(`[${new Date().toISOString()}] Client connected: ${socket.id} from ${clientIp}`);

  // Register user
  socket.on('register', (data) => {
    const { userId, agentId, extension } = data;
    users.set(socket.id, {
      userId: userId || socket.id,
      agentId,
      extension,
      socketId: socket.id,
      status: 'available',
      connectedAt: new Date().toISOString()
    });
    console.log(`[${new Date().toISOString()}] User registered:`, {
      agentId,
      extension,
      socketId: socket.id
    });
    socket.emit('registered', { 
      socketId: socket.id,
      success: true,
      timestamp: new Date().toISOString()
    });
  });

  // Join a room
  socket.on('join-room', (data) => {
    const { roomId, userId } = data;
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
      stats.totalCalls++;
      stats.currentCalls++;
    }
    rooms.get(roomId).add(socket.id);

    const user = users.get(socket.id);
    if (user) {
      user.roomId = roomId;
      user.status = 'in-call';
    }

    console.log(`[${new Date().toISOString()}] User ${userId} joined room: ${roomId} (${rooms.get(roomId).size} users)`);
    
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
      io.to(targetSocketId).emit('offer', {
        offer,
        fromSocketId: socket.id,
        roomId
      });
    } else {
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
    stats.currentConnections--;
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
      stats.currentCalls--;
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

// Error handling for the server
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const protocol = useHTTPS ? 'https' : 'http';
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  WebRTC Signaling Server with Genesys PureEngage         ║
║  Server running on ${protocol}://localhost:${PORT.toString().padEnd(22)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(44)}║
║  SSL: ${(useHTTPS ? 'Enabled' : 'Disabled').padEnd(50)}║
╚═══════════════════════════════════════════════════════════╝

  📡 API Endpoints:
     - ${protocol}://localhost:${PORT}/api/config
     - ${protocol}://localhost:${PORT}/api/health
     - ${protocol}://localhost:${PORT}/api/stats

  🔌 Socket.IO: ws://localhost:${PORT}/socket.io/

  Press Ctrl+C to stop the server
  `);
});

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('\n🛑 Received shutdown signal, closing connections...');
  
  // Notify all connected clients
  io.emit('server-shutdown', {
    message: 'Server is shutting down',
    timestamp: new Date().toISOString()
  });
  
  // Close all socket connections
  io.close(() => {
    console.log('✓ All socket connections closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('✓ HTTP server closed');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});


