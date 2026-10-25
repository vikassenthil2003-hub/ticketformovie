const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', movieController.getMovies);
router.get('/filters/metadata', movieController.getFiltersMetadata);
router.get('/tmdb/search', protect, requireRole('admin'), movieController.searchTMDB);
router.post('/tmdb/import', protect, requireRole('admin'), movieController.importFromTMDB);
router.get('/:id', movieController.getMovieById);

// Admin-only movie operations
router.post('/', protect, requireRole('admin'), movieController.createMovie);
router.put('/:id', protect, requireRole('admin'), movieController.updateMovie);
router.delete('/:id', protect, requireRole('admin'), movieController.deleteMovie);

module.exports = router;
