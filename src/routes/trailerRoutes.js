const express = require('express');
const router = express.Router();
const trailerController = require('../controllers/trailerController');
const { protect, requireRole } = require('../middleware/auth');
const { trailerActionLimiter } = require('../middleware/rateLimiter');

// Public customer routes
router.get('/', trailerController.getTrailers);
router.get('/config-status', trailerController.getConfigStatus);

// Admin-only management and bulk-sync routes with authorization and rate limits
router.get('/admin/stats', protect, requireRole('admin'), trailerController.getTrailerStats);
router.post('/admin/lookup-query', protect, requireRole('admin'), trailerActionLimiter, trailerController.lookupTrailerQuery);
router.post('/admin/bulk-sync', protect, requireRole('admin'), trailerActionLimiter, trailerController.bulkSyncTrailers);
router.post('/admin/bulk-repair', protect, requireRole('admin'), trailerActionLimiter, trailerController.bulkRepairTrailers);
router.post('/:movieId/search', protect, requireRole('admin'), trailerActionLimiter, trailerController.searchMovieTrailer);
router.put('/:movieId/assign', protect, requireRole('admin'), trailerController.assignMovieTrailer);
router.delete('/:movieId', protect, requireRole('admin'), trailerController.removeMovieTrailer);

module.exports = router;

