const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const movieController = require('../controllers/movieController');
const theatreController = require('../controllers/theatreController');
const showController = require('../controllers/showController');
const couponController = require('../controllers/couponController');
const { protect, requireRole } = require('../middleware/auth');

// All routes here strictly require 'admin' role!
router.use(protect, requireRole('admin'));

// Admin Analytics & Dashboard
router.get('/analytics', adminController.getAnalytics);
router.get('/dashboard', adminController.getAnalytics);

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/role', adminController.updateUserRole);

// Movie Management (/api/v1/admin/movies)
router.get('/movies', movieController.getMovies);
router.post('/movies', movieController.createMovie);
router.put('/movies/:id', movieController.updateMovie);
router.delete('/movies/:id', movieController.deleteMovie);

// Theatre Management (/api/v1/admin/theatres)
router.get('/theatres/stats', theatreController.getDistrictsSummary);
router.get('/theatres/duplicates', theatreController.getDuplicateTheatres);
router.post('/theatres/import', theatreController.importTheatres);
router.patch('/theatres/:id/verify', theatreController.toggleVerification);
router.post('/theatres', theatreController.createTheatre);
router.put('/theatres/:id', theatreController.updateTheatre);
router.delete('/theatres/:id', theatreController.deleteTheatre);

// Show Management (/api/v1/admin/shows)
router.post('/shows/bulk-schedule', showController.createBulkShows);
router.post('/shows', showController.createShow);
router.put('/shows/:id', showController.updateShow);
router.delete('/shows/:id', showController.deleteShow);

// Coupon Management (/api/v1/admin/coupons)
router.get('/coupons', couponController.getAllCoupons);
router.post('/coupons', couponController.createCoupon);
router.delete('/coupons/:id', couponController.deleteCoupon);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
