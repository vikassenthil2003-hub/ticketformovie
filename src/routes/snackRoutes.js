const express = require('express');
const router = express.Router();
const snackController = require('../controllers/snackController');
const { protect, requireRole } = require('../middleware/auth');

// Public endpoints (Customer food ordering)
router.get('/', snackController.getSnacks);
router.get('/categories', snackController.getCategories);

// Admin & Theatre staff protected endpoints
router.get(
  '/admin/all',
  protect,
  requireRole('admin', 'theatre'),
  snackController.adminGetAllSnacks
);
router.post(
  '/',
  protect,
  requireRole('admin', 'theatre'),
  snackController.createSnack
);
router.put(
  '/:id',
  protect,
  requireRole('admin', 'theatre'),
  snackController.updateSnack
);
router.patch(
  '/:id/availability',
  protect,
  requireRole('admin', 'theatre'),
  snackController.toggleAvailability
);
router.delete(
  '/:id',
  protect,
  requireRole('admin'),
  snackController.deleteSnack
);

module.exports = router;
