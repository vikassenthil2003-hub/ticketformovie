const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');
const { protect, requireCustomer } = require('../middleware/auth');

router.get('/:showId/layout', seatController.getShowSeatLayout);
router.post('/:showId/lock', protect, requireCustomer, seatController.lockSeats);
router.post('/:showId/release', protect, requireCustomer, seatController.releaseSeats);

module.exports = router;
