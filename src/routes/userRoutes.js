const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');
const { protect, requireRole, requireCustomer } = require('../middleware/auth');

// Customer endpoints
router.get('/watchlist', protect, requireCustomer, userController.getWatchlist);
router.post('/watchlist/toggle', protect, requireCustomer, userController.toggleWatchlist);
router.get('/rewards', protect, requireCustomer, userController.getRewards);

// Admin user management aliases
router.get('/', protect, requireRole('admin'), adminController.getAllUsers);
router.put('/:userId/role', protect, requireRole('admin'), adminController.updateUserRole);

module.exports = router;
