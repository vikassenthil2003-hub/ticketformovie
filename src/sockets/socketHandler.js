const SeatLock = require('../models/SeatLock');

/**
 * Socket.IO Handler for Live Seat Availability & Room Sync
 */
const initSocketHandler = (io) => {
  io.on('connection', (socket) => {
    // console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room for a specific show
    socket.on('join_show', ({ showId }) => {
      if (showId) {
        socket.join(`show_${showId}`);
        // console.log(`[Socket.IO] Client ${socket.id} joined room show_${showId}`);
      }
    });

    // Leave room
    socket.on('leave_show', ({ showId }) => {
      if (showId) {
        socket.leave(`show_${showId}`);
        // console.log(`[Socket.IO] Client ${socket.id} left room show_${showId}`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      // console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      // Note: We let locks expire via TTL or explicit release so temporary network blips don't immediately drop user locks
    });
  });
};

module.exports = initSocketHandler;
