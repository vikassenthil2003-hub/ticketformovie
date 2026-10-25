const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const movieRoutes = require('./movieRoutes');
const theatreRoutes = require('./theatreRoutes');
const showRoutes = require('./showRoutes');
const seatRoutes = require('./seatRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const ticketRoutes = require('./ticketRoutes');
const couponRoutes = require('./couponRoutes');
const userRoutes = require('./userRoutes');
const groupBookingRoutes = require('./groupBookingRoutes');
const adminRoutes = require('./adminRoutes');
const theatreDashboardRoutes = require('./theatreDashboardRoutes');
const locationRoutes = require('./locationRoutes');
const screenRoutes = require('./screenRoutes');
const trailerRoutes = require('./trailerRoutes');
const snackRoutes = require('./snackRoutes');

// Health Check
router.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CineVerse AI API Server',
    version: '1.0.0',
    database: dbStatusMap[dbState] || 'unknown',
  });
});

// Mount modular sub-routers
router.use('/auth', authRoutes);
router.use('/movies', movieRoutes);
router.use('/theatres', theatreRoutes);
router.use('/location', locationRoutes);
router.use('/shows', showRoutes);
router.use('/screens', screenRoutes);
router.use('/seats', seatRoutes);
router.use('/bookings', bookingRoutes);
router.use('/snacks', snackRoutes);
router.use('/payments', paymentRoutes);
router.use('/tickets', ticketRoutes);
router.use('/coupons', couponRoutes);
router.use('/users', userRoutes);
router.use('/groups', groupBookingRoutes);
router.use('/admin', adminRoutes);
router.use('/theatre', theatreDashboardRoutes);
router.use('/trailers', trailerRoutes);

module.exports = router;
