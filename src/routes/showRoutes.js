const express = require('express');
const router = express.Router();
const showController = require('../controllers/showController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', showController.getShows);
router.get('/movie/:movieId', showController.getShowsForMovie);
router.get('/:id', showController.getShowById);

// Admin or Theatre staff operations
router.post('/bulk-schedule', protect, requireRole('admin', 'theatre'), showController.createBulkShows);
router.post('/', protect, requireRole('admin', 'theatre'), showController.createShow);
router.put('/:id', protect, requireRole('admin', 'theatre'), showController.updateShow);
router.delete('/:id', protect, requireRole('admin', 'theatre'), showController.deleteShow);

module.exports = router;
