const express = require('express');
const router = express.Router();
const theatreController = require('../controllers/theatreController');
const { protect, requireRole } = require('../middleware/auth');

// Public endpoints
router.get('/', theatreController.getTheatres);
router.get('/nearby', theatreController.getNearbyTheatres);
router.get('/districts', theatreController.getDistrictsSummary);
// Admin-only theatre operations (must be before /:id to avoid route collision)
router.get('/duplicates', protect, requireRole('admin'), theatreController.getDuplicateTheatres);
router.post('/import', protect, requireRole('admin'), theatreController.importTheatres);
router.post('/', protect, requireRole('admin'), theatreController.createTheatre);
router.put('/:id', protect, requireRole('admin'), theatreController.updateTheatre);
router.delete('/:id', protect, requireRole('admin'), theatreController.deleteTheatre);
router.patch('/:id/verify', protect, requireRole('admin'), theatreController.toggleVerification);

// Single theatre by ID
router.get('/:id', theatreController.getTheatreById);

module.exports = router;
