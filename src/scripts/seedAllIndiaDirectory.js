/**
 * Database Seed & Synchronization Script for All-India Theatres & Shows
 * - Imports curated verified national premier cinemas across all major Indian States & UTs
 * - Idempotently creates screens and dynamic shows for national theatres
 * - Performs full coverage audit across all 36 Indian States and UTs
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Theatre = require('../models/Theatre');
const theatreImportService = require('../services/theatreImportService');
const { seedDynamicShows } = require('./seedDynamicShows');

async function seedAllIndia() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cineverse_ai';
    console.log('🇮🇳 [All-India Seed] Connecting to MongoDB at', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('🇮🇳 [All-India Seed] Connected successfully.');

    // 1. Import national verified multiplexes & premier theatres
    console.log('🇮🇳 [All-India Seed] Importing curated verified national theatres...');
    const nationalReport = await theatreImportService.importAllIndiaTheatres();
    console.log('🇮🇳 [All-India Seed] National Import Report:', {
      totalProcessed: nationalReport.totalProcessed,
      newlyImported: nationalReport.newlyImported,
      updated: nationalReport.updated,
      duplicatesSkipped: nationalReport.duplicatesSkipped,
      stateBreakdown: nationalReport.stateBreakdown,
    });

    // 2. Generate dynamic show schedules for newly added national venues
    console.log('🎬 [All-India Seed] Generating realistic showtimes for national cinemas...');
    await seedDynamicShows();

    // 3. Complete All-India Coverage Audit
    const allIndiaStats = await theatreImportService.getAllIndiaCoverageStats();
    console.log('====================================================');
    console.log('🇮🇳 ALL-INDIA THEATRE DIRECTORY AUDIT REPORT');
    console.log('====================================================');
    console.log(`- Total Theatres in Database: ${allIndiaStats.totalTheatres}`);
    console.log(`- Active Theatres: ${allIndiaStats.totalActive}`);
    console.log(`- Verified Theatres: ${allIndiaStats.totalVerified}`);
    console.log(`- Unverified/Community Theatres: ${allIndiaStats.totalUnverified}`);
    console.log(`- Theatres with Configured Schedules: ${allIndiaStats.theatresWithShowsCount}`);
    console.log(`- Theatres without Configured Schedules: ${allIndiaStats.theatresMissingShowsCount}`);
    console.log(`- States & UTs Covered: ${allIndiaStats.statesCoveredCount} of ${allIndiaStats.totalStatesInDirectory}`);
    console.log(`- Districts Covered: ${allIndiaStats.districtsCoveredCount}`);
    console.log('- Top State Coverage:');
    allIndiaStats.states.filter((s) => s.theatresCount > 0).forEach((s) => {
      console.log(`   * ${s.name} (${s.code}): ${s.theatresCount} theatres (${s.verifiedCount} verified) across ${s.districtsCoveredCount} districts [Status: ${s.coverageStatus}]`);
    });
    console.log('- Sources Breakdown:', allIndiaStats.sourceBreakdown);
    console.log('- Google Places Status:', allIndiaStats.googlePlacesStatus.message);
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ [All-India Seed Error]:', err);
    process.exit(1);
  }
}

seedAllIndia();
