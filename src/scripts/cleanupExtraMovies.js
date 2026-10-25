const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const verifiedRegistry = require('../data/verifiedTrailersRegistry');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse_ai';

const ORIGINAL_MOVIE_SLUGS = [
  'leo-2023',
  'jailer-2023',
  'vikram-2022',
  'master-2021',
  'ponniyin-selvan-part-1-2022',
  'ponniyin-selvan-part-2-2023',
  'maharaja-2024',
  'amaran-2024',
  'dragon-2025',
  'retro-2025',
  'good-bad-ugly-2025',
  'viduthalai-part-1-2023',
  'kalki-2898-ad-2024',
];

async function cleanupAndRetainOnlyOriginalMovies() {
  console.log('=====================================================');
  console.log('🎬 CINEVERSE AI — RESTORING EXACT ORIGINAL MOVIES');
  console.log('=====================================================');

  await mongoose.connect(MONGODB_URI);
  console.log(`✓ Connected to MongoDB: ${MONGODB_URI}\n`);

  // 1. Find all extra movies not in the original list
  const extraMovies = await Movie.find({
    slug: { $nin: ORIGINAL_MOVIE_SLUGS },
  });

  console.log(`Found ${extraMovies.length} extra movie records to remove:`);
  for (const m of extraMovies) {
    console.log(`  - Removing extra movie: "${m.title}" (slug: ${m.slug})`);
    // Delete any shows referencing this extra movie
    const deletedShows = await Show.deleteMany({ movie: m._id });
    if (deletedShows.deletedCount > 0) {
      console.log(`    ↳ Cleaned up ${deletedShows.deletedCount} associated shows`);
    }
    await Movie.findByIdAndDelete(m._id);
  }

  // 2. Verify and attach official trailers to the 13 original movies
  const remainingMovies = await Movie.find({}).sort({ releaseDate: -1 });
  console.log(`\nRemaining movies in database: ${remainingMovies.length}`);

  let verifiedCount = 0;
  for (const movie of remainingMovies) {
    const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
    const lang = Array.isArray(movie.language) ? movie.language[0] : movie.language;

    const verified = verifiedRegistry.findVerifiedTrailer(movie.title, year, lang);
    if (verified) {
      movie.trailerUrl = verified.trailerUrl;
      movie.trailerVideoId = verified.trailerVideoId;
      movie.trailerTitle = verified.trailerTitle;
      movie.trailerChannel = verified.officialChannel;
      movie.trailerThumbnail = verified.thumbnail;
      movie.trailerStatus = 'verified';
      movie.trailerSource = 'official_curated';
      movie.trailerVerifiedAt = new Date();
      movie.trailerLastCheckedAt = new Date();
      verifiedCount++;
      console.log(`  [TRAILER ATTACHED] ${movie.title} => ${verified.trailerVideoId} (${verified.officialChannel})`);
    } else {
      console.log(`  [NO TRAILER] ${movie.title}`);
    }
    await movie.save();
  }

  console.log('\n-----------------------------------------------------');
  console.log(`Restoration Complete!`);
  console.log(`Total Movies in Database: ${remainingMovies.length} (Original 13 preserved)`);
  console.log(`Trailers Attached & Verified: ${verifiedCount}`);
  console.log('-----------------------------------------------------');

  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB.\n');
}

cleanupAndRetainOnlyOriginalMovies().catch((err) => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
