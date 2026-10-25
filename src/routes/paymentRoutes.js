const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, requireCustomer } = require('../middleware/auth');

router.post('/:bookingId/simulate', protect, requireCustomer, paymentController.processDemoPayment);

module.exports = router;
