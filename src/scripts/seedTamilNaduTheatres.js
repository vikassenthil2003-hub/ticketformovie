/**
 * Database Seed & Synchronization Script for Tamil Nadu Theatres
 * - Updates existing demo theatres with district and verified status
 * - Imports verified authentic theatres across all 38 districts of Tamil Nadu
 * - Configures screens and shows for key district hubs
 * - Safe and idempotent: will not duplicate records
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Theatre = require('../models/Theatre');
const Screen = require('../models/Screen');
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const theatreImportService = require('../services/theatreImportService');

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cineverse_ai';
    console.log('[Seed] Connecting to MongoDB at', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected successfully.');

    // 1. Backfill existing demo theatres
    console.log('[Seed] Updating existing demo theatres...');
    const demoUpdates = [
      { city: 'Chennai', district: 'Chennai' },
      { city: 'Coimbatore', district: 'Coimbatore' },
      { city: 'Salem', district: 'Salem' },
      { city: 'Madurai', district: 'Madurai' },
      { city: 'Bengaluru', district: 'Bengaluru' },
    ];

    for (const item of demoUpdates) {
      await Theatre.updateMany(
        { city: item.city, $or: [{ district: { $exists: false } }, { district: null }, { district: '' }] },
        {
          $set: {
            district: item.district,
            verificationStatus: 'verified',
            source: 'verified_directory',
            verificationNotes: 'Pre-existing verified CineVerse flagship cinema.',
          },
        }
      );
    }

    // 2. Import curated verified theatres for all 38 Tamil Nadu districts
    console.log('[Seed] Importing curated verified theatres for all 38 Tamil Nadu districts...');
    const curatedReport = await theatreImportService.importCuratedTheatres();
    console.log('[Seed] Curated import report:', {
      totalProcessed: curatedReport.totalProcessed,
      newlyImported: curatedReport.newlyImported,
      updated: curatedReport.updated,
      duplicatesSkipped: curatedReport.duplicatesSkipped,
    });

    // 3. Import sample live OpenStreetMap cinemas from Tamil Nadu
    console.log('[Seed] Importing real cinemas from OpenStreetMap Overpass...');
    try {
      const osmReport = await theatreImportService.importFromOpenStreetMap({ limit: 40 });
      console.log('[Seed] OSM Overpass import report:', {
        osmNodesReceived: osmReport.osmNodesReceived,
        newlyImported: osmReport.newlyImported,
        duplicatesSkipped: osmReport.duplicatesSkipped,
      });
    } catch (osmErr) {
      console.warn('[Seed] OSM Overpass network notice:', osmErr.message);
    }

    // 4. Ensure screens and dynamic shows for key theatres across multiple districts
    console.log('[Seed] Setting up screens and dynamic shows for key regional theatres...');
    let movies = await Movie.find({ status: 'now_showing' }).limit(5);
    if (movies.length === 0) {
      movies = await Movie.find({}).limit(5);
    }
    if (movies.length === 0) {
      console.warn('[Seed] No movies found in database. Skipping show creation.');
    } else {
      // Pick verified landmark theatres across Tamil Nadu districts
      const targetTheatres = await Theatre.find({
        verificationStatus: 'verified',
        district: {
          $in: [
            'Chennai',
            'Coimbatore',
            'Madurai',
            'Salem',
            'Tiruchirappalli',
            'Tirunelveli',
            'Vellore',
            'Thanjavur',
            'Chengalpattu',
            'Tiruvallur',
            'Erode',
            'Tiruppur',
            'Krishnagiri',
            'Kanyakumari',
            'Dindigul',
          ],
        },
      }).limit(45);

      const today = new Date();
      const dates = [];
      for (let i = 0; i < 4; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }

      const showtimes = [
        { startTime: '10:30 AM', endTime: '01:30 PM' },
        { startTime: '02:15 PM', endTime: '05:15 PM' },
        { startTime: '06:30 PM', endTime: '09:30 PM' },
        { startTime: '10:15 PM', endTime: '01:15 AM' },
      ];

      for (const th of targetTheatres) {
        // Ensure at least 1 screen exists for this theatre
        let screen = await Screen.findOne({ theatreId: th._id });
        if (!screen) {
          const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((label, rIdx) => ({
            rowLabel: label,
            category: rIdx >= 6 ? 'Recliner' : rIdx >= 3 ? 'Premium' : 'Standard',
            seats: Array.from({ length: 15 }, (_, cIdx) => ({
              seatNumber: `${label}${cIdx + 1}`,
              colIndex: cIdx,
              isAisle: cIdx === 4 || cIdx === 10,
              isActive: true,
            })),
          }));

          screen = new Screen({
            theatreId: th._id,
            name: 'Screen 1 (Laser 4K Atmos)',
            screenNumber: 1,
            soundSystem: 'Dolby Atmos 7.1',
            projectionType: 'Laser 4K',
            totalCapacity: 120,
            rows,
          });
          await screen.save();
        }

        // Check if shows already exist for today
        const existingTodayCount = await Show.countDocuments({ theatreId: th._id, date: dates[0] });
        if (existingTodayCount === 0) {
          console.log(`[Seed] Creating shows for ${th.name} (${th.district})...`);
          for (const dateStr of dates) {
            for (let sIdx = 0; sIdx < showtimes.length; sIdx++) {
              const movie = movies[sIdx % movies.length];
              const st = showtimes[sIdx];

              const show = new Show({
                movieId: movie._id,
                theatreId: th._id,
                screenId: screen._id,
                date: dateStr,
                startTime: st.startTime,
                endTime: st.endTime,
                pricing: {
                  standard: 180,
                  premium: 260,
                  recliner: 420,
                },
                format: sIdx === 0 ? 'IMAX 2D' : '2D',
                language: movie.language?.[0] || 'Tamil',
                status: 'scheduled',
              });

              await show.save();
            }
          }
        }
      }
    }

    // 5. Final coverage audit report
    const stats = await theatreImportService.getTamilNaduCoverageStats();
    console.log('----------------------------------------------------');
    console.log('[Seed Success] Tamil Nadu Theatre System Ready!');
    console.log(`- Total Theatres in DB: ${stats.totalTheatres}`);
    console.log(`- Total Verified Theatres: ${stats.totalVerified}`);
    console.log(`- Total Unverified Theatres: ${stats.totalUnverified}`);
    console.log(`- Districts with theatre records: ${stats.districtsCoveredCount} of ${stats.allDistrictsTotal}`);
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
}

seed();
