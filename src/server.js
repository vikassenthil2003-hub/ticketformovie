const path = require('path');
// Load .env explicitly from backend directory and working directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const initSocketHandler = require('./sockets/socketHandler');

const { ensureShowsForCurrentDate } = require('./scripts/seedDynamicShows');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const server = http.createServer(app);

// Socket.IO CORS configuration - Restrict to trusted frontend origins
const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...configuredOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ])
);

// Initialize Socket.IO with CORS and robust ping/pong intervals
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      const isWildcard = configuredOrigins.includes('*');
      const isConfigured = allowedOrigins.includes(cleanOrigin);
      const isLocalDev =
        cleanOrigin.startsWith('http://localhost:') ||
        cleanOrigin.startsWith('http://127.0.0.1:');
      const isVercelDomain = cleanOrigin.endsWith('.vercel.app');

      if (isWildcard || isConfigured || isLocalDev || isVercelDomain) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Pass IO instance to Express app so controllers can emit events
app.set('io', io);

// Initialize real-time socket events
initSocketHandler(io);

// Start server after verifying database connection and show availability
const startServer = async () => {
  try {
    // 1. Establish database connection first
    await connectDB();

    // 2. Automatically ensure dynamic shows exist for today and upcoming dates
    await ensureShowsForCurrentDate();

    // 3. Attach error listener for port conflicts (EADDRINUSE)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n🚨 [Server Startup Error]: Port ${PORT} (${HOST}) is already in use.`);
        console.error(`👉 A CineVerse AI backend process is already running on port ${PORT}.`);
        console.error(`👉 Check active processes with: Get-NetTCPConnection -LocalPort ${PORT}\n`);
      } else {
        console.error(`[Server Error]:`, err);
      }
      process.exit(1);
    });

    // 4. Start HTTP server on all interfaces (IPv4/IPv6 compatible)
    server.listen(PORT, HOST, () => {
      console.log(`=================================================`);
      console.log(`🎬 CineVerse AI Server listening on http://127.0.0.1:${PORT}`);
      console.log(`📡 REST API: http://127.0.0.1:${PORT}/api/v1`);
      console.log(`⚡ WebSocket Server attached to Socket.IO (Port ${PORT})`);
      console.log(`=================================================`);
    });
  } catch (error) {
    console.error(`[Server Startup Error]: Failed to start CineVerse AI Server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown to avoid ECONNRESET on active sockets during restarts
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Closing CineVerse AI server gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP and WebSocket connections closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection Error]:', err?.message || err);
});

