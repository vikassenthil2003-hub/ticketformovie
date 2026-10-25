const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { protect, requireRole, requireCustomer } = require('../middleware/auth');

// Customer digital ticket view (restricted to ticket owner customer)
router.get('/:bookingReference', protect, requireCustomer, ticketController.getTicket);
// Theatre staff or Admin ticket verification at gate
router.post('/verify', protect, requireRole('admin', 'theatre'), ticketController.verifyTicket);

module.exports = router;
