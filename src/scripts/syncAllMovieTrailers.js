const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const verifiedRegistry = require('../data/verifiedTrailersRegistry');
const youtubeService = require('../services/youtubeService');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse_ai';

async function syncAllTrailers() {
  console.log('=====================================================');
  console.log('🎬 CINEVERSE AI — AUTOMATIC TRAILER SYNC & AUDIT');
  console.log('=====================================================');

  await mongoose.connect(MONGODB_URI);
  console.log(`✓ Connected to MongoDB: ${MONGODB_URI}`);

  // Fetch all existing movies in database - strictly NO extra movies added
  const allMovies = await Movie.find({});
  console.log(`\nAuditing ${allMovies.length} existing movies in database for official trailers...`);

  let verifiedCount = 0;
  let needsReviewCount = 0;
  let missingCount = 0;

  for (const movie of allMovies) {
    const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
    const lang = Array.isArray(movie.language) ? movie.language[0] : movie.language;

    // Check registry for verified match
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
      console.log(`  [VERIFIED] ${movie.title} (${year || 'N/A'}, ${lang}) => ${verified.trailerVideoId} [${verified.officialChannel}]`);
    } else if (movie.trailerUrl) {
      const extractedId = youtubeService.extractVideoId(movie.trailerUrl);
      if (extractedId && youtubeService.validateVideoId(extractedId)) {
        movie.trailerVideoId = extractedId;
        movie.trailerStatus = movie.trailerStatus === 'verified' ? 'verified' : 'needs_review';
        movie.trailerSource = movie.trailerSource || 'manual_admin';
        movie.trailerThumbnail = `https://i.ytimg.com/vi/${extractedId}/hqdefault.jpg`;
        movie.trailerLastCheckedAt = new Date();
        needsReviewCount++;
        console.log(`  [NEEDS REVIEW] ${movie.title} => Existing URL has videoId: ${extractedId}`);
      } else {
        movie.trailerStatus = 'missing';
        movie.trailerVideoId = '';
        missingCount++;
        console.log(`  [MISSING] ${movie.title} => Invalid or empty trailer URL`);
      }
    } else {
      movie.trailerStatus = 'missing';
      movie.trailerVideoId = '';
      missingCount++;
      console.log(`  [MISSING] ${movie.title} => No trailer attached`);
    }

    await movie.save();
  }

  console.log('\n-----------------------------------------------------');
  console.log('TRAILER SYNC RESULTS:');
  console.log(`  Total Movies:        ${allMovies.length}`);
  console.log(`  Verified Trailers:   ${verifiedCount}`);
  console.log(`  Needs Review:        ${needsReviewCount}`);
  console.log(`  Missing Trailers:    ${missingCount}`);
  console.log('-----------------------------------------------------');

  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB.\n');
}

syncAllTrailers().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
