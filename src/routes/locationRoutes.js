const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Free OpenStreetMap Reverse Geocoding
router.get('/reverse', locationController.reverseGeocode);

// Free OpenStreetMap Forward Search (City, Area, or PIN code)
router.get('/search', locationController.searchLocation);

// Supported Cinema Cities
router.get('/cities', locationController.getCities);

// Popular Cinema Hubs / Areas by City
router.get('/areas', locationController.getPopularAreas);

// All 38 Official Tamil Nadu Districts
router.get('/districts', locationController.getDistricts);

// All 36 Indian States and Union Territories
router.get('/states', locationController.getStates);

// Districts for a specific state / UT
router.get('/states/:state/districts', locationController.getStateDistricts);

module.exports = router;
