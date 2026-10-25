const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/validate', couponController.validateCoupon);
router.get('/active', couponController.getActiveCoupons);

// Admin Coupon operations
router.get('/', protect, requireRole('admin'), couponController.getAllCoupons);
router.post('/', protect, requireRole('admin'), couponController.createCoupon);
router.delete('/:id', protect, requireRole('admin'), couponController.deleteCoupon);

module.exports = router;
