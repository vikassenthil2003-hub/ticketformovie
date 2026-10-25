const geocodingService = require('../services/geocodingService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const SUPPORTED_CITIES = [
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, isPopular: true },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, isPopular: true },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, isPopular: true },
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090, isPopular: true },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, isPopular: true },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, isPopular: true },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, isPopular: true },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, isPopular: true },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, isPopular: true },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, isPopular: true },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, isPopular: true },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, isPopular: true },
  { name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794, isPopular: true },
  { name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.1460, isPopular: true },
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, isPopular: true },
];

/**
 * Reverse Geocode latitude and longitude to readable city and area
 * GET /api/v1/location/reverse?lat=13.0583&lng=80.2612
 */
const reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return errorResponse(res, 'Both latitude (lat) and longitude (lng) are required', 400);
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return errorResponse(res, 'Coordinates must be valid numbers', 400);
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return errorResponse(res, 'Coordinates are outside valid geographical bounds', 400);
    }

    const locationData = await geocodingService.reverseGeocode(latitude, longitude);

    return successResponse(res, 'Location resolved successfully', locationData);
  } catch (error) {
    next(error);
  }
};

/**
 * Forward search for City, Area, or PIN code
 * GET /api/v1/location/search?query=Royapettah
 * GET /api/v1/location/search?query=600014
 */
const searchLocation = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return errorResponse(res, 'Search query is required', 400);
    }

    const results = await geocodingService.searchLocations(query.trim());

    return successResponse(res, `Found ${results.length} locations`, results);
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of supported cinema cities
 * GET /api/v1/location/cities
 */
const getCities = async (req, res) => {
  return successResponse(res, 'Supported cities fetched', SUPPORTED_CITIES);
};

/**
 * Get popular cinema areas for a city
 * GET /api/v1/location/areas?city=Chennai
 */
const getPopularAreas = async (req, res) => {
  const { city = 'Chennai' } = req.query;
  const filtered = geocodingService.LOCAL_CINEMA_LOCATIONS.filter(
    (loc) => loc.city.toLowerCase() === city.toLowerCase().trim()
  );

  return successResponse(res, `Popular cinema areas for ${city}`, filtered);
};

/**
 * Get all 38 official Tamil Nadu districts with center coordinates and towns
 * GET /api/v1/location/districts
 */
const getDistricts = async (req, res) => {
  const { TAMIL_NADU_DISTRICTS } = require('../data/tamilNaduDistricts');
  return successResponse(res, 'All 38 Tamil Nadu districts fetched successfully', TAMIL_NADU_DISTRICTS);
};

/**
 * Get all 36 Indian States and Union Territories
 * GET /api/v1/location/states
 */
const getStates = async (req, res) => {
  const { getAllStates } = require('../data/indiaLocationDirectory');
  const states = getAllStates();
  return successResponse(res, 'All 36 Indian States and Union Territories fetched successfully', states);
};

/**
 * Get districts and cities for a specific state
 * GET /api/v1/location/states/:state/districts
 */
const getStateDistricts = async (req, res) => {
  const { state } = req.params;
  const { getDistrictsForState, getStateByCodeOrName } = require('../data/indiaLocationDirectory');
  const stateObj = getStateByCodeOrName(state);
  if (!stateObj) {
    return errorResponse(res, `State '${state}' not found in directory`, 404);
  }

  const districts = getDistrictsForState(state);
  return successResponse(res, `Districts for ${stateObj.name} fetched successfully`, {
    state: stateObj.name,
    code: stateObj.code,
    type: stateObj.type,
    capital: stateObj.capital,
    districts,
  });
};

module.exports = {
  reverseGeocode,
  searchLocation,
  getCities,
  getPopularAreas,
  getDistricts,
  getStates,
  getStateDistricts,
  SUPPORTED_CITIES,
};
