const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, requireCustomer } = require('../middleware/auth');

// Customer-only booking endpoints (Admins restricted)
router.post('/', protect, requireCustomer, bookingController.createBooking);
router.get('/my-bookings', protect, requireCustomer, bookingController.getUserBookings);
router.get('/:id', protect, requireCustomer, bookingController.getBookingById);
router.put('/:id/snacks', protect, requireCustomer, bookingController.updateBookingSnacks);
router.post('/:id/cancel', protect, requireCustomer, bookingController.cancelBooking);

module.exports = router;
