require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(cors());

// Serve static frontend client build files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('Signaling server is running.');
});

// LiveKit token generation endpoint
app.get('/api/token', async (req, res) => {
  try {
    const { room, username } = req.query;
    if (!room || !username) {
      return res.status(400).json({ error: 'room and username are required' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    const serverUrl = process.env.LIVEKIT_URL || 'ws://localhost:7800';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
    });
    
    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token, serverUrl });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Single port fallback wildcard router (serves index.html for SPA page refresh routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'), (err) => {
    if (err) {
      res.status(404).send('Frontend client build is not found. Please run npm run build in the client first.');
    }
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev/local testing
    methods: ['GET', 'POST']
  }
});

// Map room IDs to list of active participants: { [roomId]: [ { socketId, userId, userName } ] }
const rooms = {};

// Map socket.id to user and room info for quick disconnect lookup
const socketInfo = {};

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. Join Room
  socket.on('join-room', ({ roomId, userId, userName, micEnabled, videoEnabled }) => {
    console.log(`User ${userName} (${userId}) joining room: ${roomId} with mic:${micEnabled}, video:${videoEnabled}`);
    
    // Add user to room tracking
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    const newUser = {
      socketId: socket.id,
      userId,
      userName,
      micEnabled: micEnabled !== undefined ? micEnabled : true,
      videoEnabled: videoEnabled !== undefined ? videoEnabled : true
    };

    // Store socket info for disconnect lookup
    socketInfo[socket.id] = { roomId, userId, userName };

    // Get list of existing users in the room BEFORE we add the new user
    const existingUsers = rooms[roomId].filter(user => user.socketId !== socket.id);

    // Add new user to the room if not already present
    if (!rooms[roomId].some(u => u.socketId === socket.id)) {
      rooms[roomId].push(newUser);
    }

    // Join the socket.io channel
    socket.join(roomId);

    // Send the list of existing users to the newly joined user
    socket.emit('all-users', existingUsers);

    // Broadcast user-joined event to all other clients in the room
    socket.to(roomId).emit('user-joined', newUser);
  });

  // 2. Relay WebRTC Signal (SDP offer/answer, ICE Candidate)
  socket.on('relay-signal', ({ targetSocketId, signal }) => {
    // Forward the signal to the target peer with the sender's socket ID
    io.to(targetSocketId).emit('signal', {
      senderSocketId: socket.id,
      signal
    });
  });

  // 3. Chat messages
  socket.on('send-chat-message', ({ roomId, messageText, senderName }) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    io.to(roomId).emit('receive-chat-message', {
      senderId: socket.id,
      senderName,
      messageText,
      timestamp
    });
  });

  // 4. Mute/Camera toggle state sync
  socket.on('toggle-media', ({ roomId, type, enabled }) => {
    // Update stored state
    if (rooms[roomId]) {
      const user = rooms[roomId].find(u => u.socketId === socket.id);
      if (user) {
        if (type === 'audio') user.micEnabled = enabled;
        if (type === 'video') user.videoEnabled = enabled;
      }
    }
    socket.to(roomId).emit('user-media-toggled', {
      socketId: socket.id,
      type, // 'audio' or 'video'
      enabled
    });
  });

  // 5. Hand raise state sync
  socket.on('raise-hand', ({ roomId, raised }) => {
    socket.to(roomId).emit('user-hand-raised', {
      socketId: socket.id,
      raised
    });
  });

  // 7. Emoji reactions relay
  socket.on('send-reaction', ({ roomId, emoji, senderName }) => {
    socket.to(roomId).emit('user-reacted', {
      socketId: socket.id,
      senderName,
      emoji
    });
  });

  // 8. Live captions relay
  socket.on('send-caption', ({ roomId, text, senderName }) => {
    socket.to(roomId).emit('user-captioned', {
      socketId: socket.id,
      senderName,
      text
    });
  });

  // 6. Handle socket disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const info = socketInfo[socket.id];
    
    if (info) {
      const { roomId, userName } = info;
      console.log(`User ${userName} leaving room: ${roomId}`);

      // Remove user from room array
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(user => user.socketId !== socket.id);
        
        // Clean up empty rooms
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        }
      }

      // Clean up socket info
      delete socketInfo[socket.id];

      // Notify others in room
      socket.to(roomId).emit('user-left', { socketId: socket.id });
    }
  });
});

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
