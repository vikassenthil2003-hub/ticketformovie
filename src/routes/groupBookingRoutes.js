const express = require('express');
const router = express.Router();
const groupBookingController = require('../controllers/groupBookingController');
const { protect, requireCustomer } = require('../middleware/auth');

router.post('/', protect, requireCustomer, groupBookingController.createGroupBooking);
router.get('/:groupCode', groupBookingController.getGroupByCode);
router.post('/:groupCode/join', protect, requireCustomer, groupBookingController.joinGroup);
router.post('/:groupCode/pay-share', protect, requireCustomer, groupBookingController.payMemberShare);

module.exports = router;
