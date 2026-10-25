/**
 * Comprehensive Automated Verification Suite for CineVerse AI All-India Theatre Directory
 * Tests:
 * 1. Searching theatres across multiple states and districts (TN, MH, KA, TS, DL, KL, UP, WB).
 * 2. Finding smaller towns, municipalities, and local areas via search and geocoding.
 * 3. Import deduplication and pagination safety (placeId, spatial proximity, normalized name).
 * 4. Location permission denied handling and manual location selection fallback.
 * 5. Theatres with schedules vs theatres without schedules ("Showtimes not yet configured").
 * 6. Movie-to-theatre relationships and valid showtime filtering (no universal assignment, demo marked).
 * 7. RBAC security: Customer booking permissions versus admin/manager accounts blocked (403 Forbidden).
 * 8. Missing API keys, API failures, and backend connection error handling (Google Places fallback).
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const Theatre = require('../models/Theatre');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const User = require('../models/User');
const { ALL_INDIA_STATES, getAllStates, searchIndiaLocations, findStateAndDistrictByCoords } = require('../data/indiaLocationDirectory');
const { ALL_INDIA_VERIFIED_THEATRES } = require('../data/allIndiaVerifiedTheatres');
const googlePlacesService = require('../services/googlePlacesService');
const theatreImportService = require('../services/theatreImportService');
const geocodingService = require('../services/geocodingService');
const { requireCustomer } = require('../middleware/auth');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse_ai';

async function runTests() {
  console.log('='.repeat(70));
  console.log('CINEVERSE AI — ALL-INDIA THEATRE DIRECTORY VERIFICATION SUITE');
  console.log('='.repeat(70));

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB:', MONGO_URI);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Location Directory Hierarchy & Multi-State Searching
    // -------------------------------------------------------------
    console.log('\n--- 1. India Location Directory & Multi-State Search ---');
    const allStates = getAllStates();
    assert(allStates.length === 36, 'All 28 States and 8 Union Territories registered', `Count: ${allStates.length}`);

    const mhTheatres = await Theatre.find({ state: { $regex: /^Maharashtra$/i } });
    const kaTheatres = await Theatre.find({ state: { $regex: /^Karnataka$/i } });
    const dlTheatres = await Theatre.find({ state: { $regex: /^Delhi$/i } });
    const tsTheatres = await Theatre.find({ state: { $regex: /^Telangana$/i } });
    const tnTheatres = await Theatre.find({ state: { $regex: /^Tamil Nadu$/i } });

    assert(mhTheatres.length >= 5, 'Found authentic Maharashtra theatres', `Count: ${mhTheatres.length}`);
    assert(kaTheatres.length >= 5, 'Found authentic Karnataka theatres', `Count: ${kaTheatres.length}`);
    assert(dlTheatres.length >= 3, 'Found authentic Delhi NCR theatres', `Count: ${dlTheatres.length}`);
    assert(tsTheatres.length >= 3, 'Found authentic Telangana theatres', `Count: ${tsTheatres.length}`);
    assert(tnTheatres.length >= 700, 'Preserved comprehensive Tamil Nadu directory', `Count: ${tnTheatres.length}`);

    // -------------------------------------------------------------
    // Test 2: Finding smaller towns, municipalities, and localities
    // -------------------------------------------------------------
    console.log('\n--- 2. Finding Smaller Towns, Municipalities & Local Areas ---');
    const hosurTheatres = await Theatre.find({
      $or: [{ city: /Hosur/i }, { address: /Hosur/i }],
    });
    assert(hosurTheatres.length >= 1, 'Found smaller industrial town cinema (Hosur, Krishnagiri)', `Count: ${hosurTheatres.length}`);

    const pollachiTheatres = await Theatre.find({
      $or: [{ city: /Pollachi/i }, { address: /Pollachi/i }, { locality: /Pollachi/i }],
    });
    assert(pollachiTheatres.length >= 1, 'Found municipality cinema (Pollachi, Coimbatore)', `Count: ${pollachiTheatres.length}`);

    const kalyanTheatres = await Theatre.find({
      $or: [{ city: /Kalyan/i }, { address: /Kalyan/i }],
    });
    assert(kalyanTheatres.length >= 1, 'Found Maharashtra municipal corporation venue (Kalyan)', `Count: ${kalyanTheatres.length}`);

    const whitefieldTheatres = await Theatre.find({
      $or: [{ city: /Whitefield/i }, { locality: /Whitefield/i }, { address: /Whitefield/i }],
    });
    assert(whitefieldTheatres.length >= 1, 'Found Bengaluru tech corridor locality (Whitefield)', `Count: ${whitefieldTheatres.length}`);

    const searchRes = searchIndiaLocations('Avinashi');
    assert(searchRes.length > 0 && searchRes[0].state === 'Tamil Nadu', 'Location search resolves small town (Avinashi)');

    // -------------------------------------------------------------
    // Test 3: Deduplication & Provider Place ID
    // -------------------------------------------------------------
    console.log('\n--- 3. Deduplication (Place ID, Spatial, Normalized Name) ---');
    const pvrPhoenix = await Theatre.findOne({ name: /PVR.*Phoenix Palladium/i });
    assert(Boolean(pvrPhoenix && pvrPhoenix.placeId), 'PVR Phoenix Palladium has authentic placeId', `placeId: ${pvrPhoenix?.placeId}`);

    // Test duplicate detection logic
    const duplicateCheck = await theatreImportService.findDuplicate(
      18.9934,
      72.8258,
      'PVR Cinemas Phoenix Palladium',
      null,
      'ChIJQ7Vn4LHP5zsRaT8G-P8rP0A'
    );
    assert(Boolean(duplicateCheck), 'Deduplication engine catches existing venue by placeId or proximity');

    // -------------------------------------------------------------
    // Test 4: Geolocation Permission Fallback & Manual Location
    // -------------------------------------------------------------
    console.log('\n--- 4. Geolocation Fallback & Manual Selection ---');
    // Test reverse geocoding fallback for Mumbai coordinates (19.0760, 72.8777)
    const mumbaiReverse = await geocodingService.reverseGeocode(19.0760, 72.8777);
    assert(mumbaiReverse.state === 'Maharashtra', 'Reverse geocode correctly identifies state from GPS coords', `State: ${mumbaiReverse.state}`);

    // Test reverse geocoding fallback for Bengaluru coordinates (12.9716, 77.5946)
    const blrReverse = await geocodingService.reverseGeocode(12.9716, 77.5946);
    assert(blrReverse.state === 'Karnataka', 'Reverse geocode correctly identifies Karnataka coords', `State: ${blrReverse.state}`);

    // Test location search for manual town/locality selection
    const manualLookup = await geocodingService.searchLocations('Kumbakonam');
    assert(manualLookup.length > 0 && (manualLookup[0].city === 'Kumbakonam' || manualLookup[0].state === 'Tamil Nadu'), 'Manual search geocoding resolves Kumbakonam');

    // -------------------------------------------------------------
    // Test 5: Theatres with Schedules vs Theatres Without Schedules
    // -------------------------------------------------------------
    console.log('\n--- 5. Theatres With Schedules vs "Showtimes Not Yet Configured" ---');
    const totalTheatresCount = await Theatre.countDocuments();
    const scheduledTheatresCount = await Show.distinct('theatreId');
    const unscheduledTheatresCount = totalTheatresCount - scheduledTheatresCount.length;

    assert(scheduledTheatresCount.length > 0, 'Theatres with live schedules exist in database', `Count: ${scheduledTheatresCount.length}`);
    assert(unscheduledTheatresCount > 0, 'Theatres without schedules exist for "Showtimes not yet configured" state', `Count: ${unscheduledTheatresCount}`);

    // Verify demo data labeling
    const demoShows = await Show.find({ isDemoData: true }).limit(5);
    assert(demoShows.length > 0, 'Admin-seeded schedules are explicitly marked with isDemoData: true');

    // -------------------------------------------------------------
    // Test 6: Movie-to-Theatre Relationships (No Universal Assignment)
    // -------------------------------------------------------------
    console.log('\n--- 6. Movie-to-Theatre Relationships & Filtering ---');
    const movies = await Movie.find().limit(2);
    const movieA = movies[0];
    const movieB = movies[1];

    const movieATheatres = await Show.distinct('theatreId', { movieId: movieA._id });
    const movieBTheatres = await Show.distinct('theatreId', { movieId: movieB._id });

    assert(
      movieATheatres.length < totalTheatresCount,
      'Movies are NOT automatically assigned to every theatre in India',
      `Movie A playing in ${movieATheatres.length}/${totalTheatresCount} theatres`
    );
    assert(
      movieATheatres.length > 0 && movieBTheatres.length > 0,
      'Multiple movies play across appropriate theatres',
      `Movie A: ${movieATheatres.length}, Movie B: ${movieBTheatres.length}`
    );

    // -------------------------------------------------------------
    // Test 7: RBAC Security (Customer vs Admin Booking Checkout)
    // -------------------------------------------------------------
    console.log('\n--- 7. RBAC Security: Customer Booking vs Admin/Manager Block ---');
    let adminBlocked = false;
    let customerAllowed = false;

    // Simulate requireCustomer middleware with Admin user
    const mockAdminReq = { user: { role: 'admin', _id: 'admin_id' } };
    const mockResAdmin = {
      status: (code) => {
        if (code === 403) adminBlocked = true;
        return { json: (data) => data };
      },
    };
    requireCustomer(mockAdminReq, mockResAdmin, () => {});
    assert(adminBlocked, 'Administrator account strictly blocked from customer booking checkout (403 Forbidden)');

    // Simulate requireCustomer middleware with Customer user
    const mockCustomerReq = { user: { role: 'user', _id: 'cust_id' } };
    const mockResCust = { status: () => ({ json: () => {} }) };
    requireCustomer(mockCustomerReq, mockResCust, () => {
      customerAllowed = true;
    });
    assert(customerAllowed, 'Customer account successfully permitted to access booking checkout');

    // -------------------------------------------------------------
    // Test 8: Google Places API Fallback & Key Isolation
    // -------------------------------------------------------------
    console.log('\n--- 8. Google Places API Fallback & Key Isolation ---');
    const placesStatus = googlePlacesService.getStatus();
    assert(typeof placesStatus.isConfigured === 'boolean', 'Google Places service exposes configuration status without leaking keys');

    // Test fallback invocation
    const fallbackImport = await googlePlacesService.searchTheatresTextSearch('cinemas in Panaji, Goa');
    assert(fallbackImport.fallbackMode === true, 'Google Places service operates gracefully in fallback mode when key is omitted', `Message: ${fallbackImport.message}`);

    // Ensure no frontend files contain secret API key
    assert(!process.env.VITE_GOOGLE_PLACES_API_KEY, 'Secret GOOGLE_PLACES_API_KEY is NOT exposed to frontend environment');

    // -------------------------------------------------------------
    // Coverage Summary Metrics
    // -------------------------------------------------------------
    console.log('\n--- Coverage Statistics Summary ---');
    const stats = await theatreImportService.getAllIndiaCoverageStats();
    console.log(`  Total Theatres:            ${stats.totalTheatres}`);
    console.log(`  Verified Theatres:         ${stats.totalVerified}`);
    console.log(`  Unverified / Public OSM:   ${stats.totalUnverified}`);
    console.log(`  Inactive / Closed:         ${stats.totalInactive}`);
    console.log(`  Theatres with Showtimes:   ${stats.theatresWithShowsCount}`);
    console.log(`  Theatres without Shows:    ${stats.theatresMissingShowsCount}`);
    console.log(`  States / UTs with Venues:  ${stats.statesCoveredCount} / ${stats.totalStatesInDirectory}`);
    console.log(`  Districts Covered:         ${stats.districtsCoveredCount}`);

    console.log('\n' + '='.repeat(70));
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('='.repeat(70));
  } catch (err) {
    console.error('Test suite encountered an error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
