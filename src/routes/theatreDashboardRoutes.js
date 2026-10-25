const express = require('express');
const router = express.Router();
const theatreDashboardController = require('../controllers/theatreDashboardController');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect, requireRole('admin', 'theatre'));

router.get('/overview', theatreDashboardController.getTheatreOverview);
router.get('/dashboard', theatreDashboardController.getTheatreOverview);
router.get('/', theatreDashboardController.getTheatreOverview);

module.exports = router;
