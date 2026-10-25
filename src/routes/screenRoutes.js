const express = require('express');
const router = express.Router();
const Screen = require('../models/Screen');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const { protect, requireRole } = require('../middleware/auth');

/**
 * Get all screens for a specific theatre
 * GET /api/v1/screens/theatre/:theatreId
 */
router.get('/theatre/:theatreId', async (req, res, next) => {
  try {
    const { theatreId } = req.params;
    const screens = await Screen.find({ theatreId }).sort({ screenNumber: 1 });
    return successResponse(res, 'Screens fetched successfully', screens);
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new screen for a theatre
 * POST /api/v1/screens
 */
router.post('/', protect, requireRole('admin', 'theatre'), async (req, res, next) => {
  try {
    const { theatreId, name, screenNumber, projectionType, soundSystem, totalCapacity, rows } = req.body;

    if (!theatreId) {
      return errorResponse(res, 'theatreId is required', 400);
    }

    const defaultRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((label, rIdx) => ({
      rowLabel: label,
      category: rIdx >= 6 ? 'Recliner' : rIdx >= 3 ? 'Premium' : 'Standard',
      seats: Array.from({ length: 15 }, (_, cIdx) => ({
        seatNumber: `${label}${cIdx + 1}`,
        colIndex: cIdx,
        isAisle: cIdx === 4 || cIdx === 10,
        isActive: true,
      })),
    }));

    const existingCount = await Screen.countDocuments({ theatreId });
    const screen = new Screen({
      theatreId,
      name: name || `Screen ${existingCount + 1}`,
      screenNumber: screenNumber || existingCount + 1,
      projectionType: projectionType || 'Laser 4K',
      soundSystem: soundSystem || 'Dolby Atmos 7.1',
      totalCapacity: totalCapacity || 120,
      rows: Array.isArray(rows) && rows.length > 0 ? rows : defaultRows,
    });

    await screen.save();
    return successResponse(res, 'Screen created successfully', screen, 201);
  } catch (error) {
    next(error);
  }
});

/**
 * Get screen by ID
 * GET /api/v1/screens/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const screen = await Screen.findById(req.params.id);
    if (!screen) {
      return errorResponse(res, 'Screen not found', 404);
    }
    return successResponse(res, 'Screen details fetched', screen);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
