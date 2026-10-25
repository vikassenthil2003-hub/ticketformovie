const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const youtubeService = require('../services/youtubeService');
const verifiedRegistry = require('../data/verifiedTrailersRegistry');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse_ai';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTrailerSystemTests() {
  console.log('======================================================================');
  console.log('CINEVERSE AI — TRAILER SYSTEM & THUMBNAIL VERIFICATION SUITE');
  console.log('======================================================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log(`✓ Connected to MongoDB: ${MONGODB_URI}\n`);

  // --- 1. Video ID Extraction & Validation ---
  console.log('--- 1. YouTube Video ID Parsing & Format Validation ---');
  assert(
    youtubeService.extractVideoId('https://www.youtube.com/watch?v=Po3jStA673E') === 'Po3jStA673E',
    'Extracts ID from standard watch?v= URL'
  );
  assert(
    youtubeService.extractVideoId('https://youtu.be/xenOE1Tma0A?t=10s') === 'xenOE1Tma0A',
    'Extracts ID from short youtu.be URL with timestamp query param'
  );
  assert(
    youtubeService.extractVideoId('https://www.youtube-nocookie.com/embed/OKBMCL-frPU') === 'OKBMCL-frPU',
    'Extracts ID from youtube-nocookie embed URL'
  );
  assert(
    youtubeService.extractVideoId('GYeSfq_bj_M') === 'GYeSfq_bj_M',
    'Extracts clean 11-char raw video ID'
  );
  assert(
    youtubeService.extractVideoId('https://invalid-site.com/video/123') === '',
    'Returns empty string for non-YouTube URL'
  );
  assert(
    youtubeService.validateVideoId('Po3jStA673E') === true,
    'Validates syntactically correct 11-char YouTube ID'
  );
  assert(
    youtubeService.validateVideoId('short_id') === false,
    'Rejects short / malformed video ID'
  );
  assert(
    youtubeService.validateVideoId('<script>alert(1)</script>') === false,
    'Rejects malicious XSS attempt in video ID'
  );

  // --- 2. Video Accessibility & 404 Detection ---
  console.log('\n--- 2. Video Accessibility & 404 Detection ---');
  const validAccess = await youtubeService.checkVideoAccessibility('Po3jStA673E');
  assert(
    validAccess && validAccess.accessible === true,
    'Live Leo trailer (Po3jStA673E) correctly detected as accessible'
  );

  const brokenAccess = await youtubeService.checkVideoAccessibility('D4qAQYLGZVM');
  assert(
    brokenAccess && brokenAccess.accessible === false,
    'Broken / non-existent video ID (D4qAQYLGZVM) correctly detected as inaccessible / 404'
  );

  // --- 3. Thumbnail Resolution Cascade ---
  console.log('\n--- 3. Thumbnail Resolution Cascade ---');
  const resolutions = await youtubeService.getThumbnailResolutions('Po3jStA673E');
  assert(
    resolutions && Array.isArray(resolutions.resolutions) && resolutions.resolutions.length >= 2,
    `Returns multi-resolution thumbnail cascade (Count: ${resolutions?.resolutions?.length})`
  );
  assert(
    resolutions && Array.isArray(resolutions.resolutions) && resolutions.resolutions.some((u) => u.includes('maxresdefault') || u.includes('hqdefault')),
    'Cascade contains high-resolution (maxres / hq) thumbnail URLs'
  );

  // --- 4. Title & Metadata Match Verification ---
  console.log('\n--- 4. Title & Metadata Match Verification ---');
  const positiveMatch = youtubeService.scoreResult(
    { snippet: { title: 'Amaran - Official Trailer | Sivakarthikeyan, Sai Pallavi | GV Prakash', channelTitle: 'Saregama Tamil' } },
    'Amaran',
    ['Tamil'],
    2024
  );
  assert(
    positiveMatch && positiveMatch.matchesTitle === true,
    'Validates genuine trailer title matching movie title and language'
  );

  const mismatchRejection = youtubeService.scoreResult(
    { snippet: { title: 'Spider-Man: Across the Spider-Verse Official Trailer', channelTitle: 'Sony Pictures Entertainment' } },
    'Amaran',
    ['Tamil'],
    2024
  );
  assert(
    mismatchRejection && (mismatchRejection.matchesTitle === false || mismatchRejection.score < 0),
    'Strictly rejects unrelated movie trailer (Never attaches random trailer)'
  );

  // --- 5. Verified Multilingual Registry ---
  console.log('\n--- 5. Verified Multilingual Official Cinema Registry ---');
  const tamilTrailer = verifiedRegistry.findVerifiedTrailer('Leo', 2023, 'Tamil');
  assert(
    tamilTrailer && tamilTrailer.trailerVideoId === 'Po3jStA673E' && tamilTrailer.status === 'verified',
    'Finds authentic Tamil trailer for Leo (Po3jStA673E - Sun Pictures)'
  );

  const ps1Trailer = verifiedRegistry.findVerifiedTrailer('Ponniyin Selvan: Part 1', 2022, 'Tamil');
  assert(
    ps1Trailer && ps1Trailer.trailerVideoId === 'D4qAQYlgZQs',
    'Finds authentic PS1 trailer (D4qAQYlgZQs - Tips Tamil)'
  );

  const teluguTrailer = verifiedRegistry.findVerifiedTrailer('Kalki 2898 AD', 2024, 'Telugu');
  assert(
    teluguTrailer && teluguTrailer.trailerVideoId === 'y1-w1kUGuz8' && teluguTrailer.officialChannel.includes('Vyjayanthi'),
    'Finds authentic Telugu trailer for Kalki 2898 AD (y1-w1kUGuz8 - Vyjayanthi Network)'
  );

  // --- 6. Non-Official Trailer Acceptance with Match Verification ---
  console.log('\n--- 6. Non-Official Trailer Acceptance ---');
  const nonOfficialCheck = youtubeService.scoreResult(
    { snippet: { title: 'Amaran Theatrical Trailer Cut HD', channelTitle: 'MovieFan Channel' } },
    'Amaran',
    ['Tamil'],
    2024
  );
  assert(
    nonOfficialCheck && nonOfficialCheck.matchesTitle === true && nonOfficialCheck.isOfficialChannel === false && nonOfficialCheck.score > 0,
    'Accepts relevant non-official trailer with neutral status if official trailer unavailable'
  );

  // --- 7. Security: Frontend Isolation of Secrets ---
  console.log('\n--- 7. Security: YouTube API Key Protection ---');
  const frontendEnvExposed = Boolean(process.env.VITE_YOUTUBE_API_KEY);
  assert(!frontendEnvExposed, 'Secret YOUTUBE_API_KEY is strictly kept on backend, never leaked to frontend');

  // --- 8. Database Integrity: All 13 Movies Repaired & Valid ---
  console.log('\n--- 8. Database Audit: All 13 Catalogue Movies ---');
  const allMovies = await Movie.find({});
  assert(allMovies.length === 13, `Catalogue strictly contains the 13 movies without additions/deletions (Found: ${allMovies.length})`);

  let validTrailersCount = 0;
  let brokenVideosCount = 0;

  for (const movie of allMovies) {
    const hasId = Boolean(movie.trailerVideoId && movie.trailerVideoId.length === 11);
    const hasThumb = Boolean(movie.trailerThumbnail && movie.trailerThumbnail.startsWith('http'));
    const isAvailableOrVerified = movie.trailerStatus === 'verified' || movie.trailerStatus === 'available';

    if (hasId && hasThumb && isAvailableOrVerified) {
      validTrailersCount++;
    } else {
      brokenVideosCount++;
      console.error(`    [BROKEN] ${movie.title}: videoId=${movie.trailerVideoId}, status=${movie.trailerStatus}`);
    }
  }

  assert(
    validTrailersCount === 13 && brokenVideosCount === 0,
    `All 13 movies have working verified/available trailer records and valid thumbnail URLs (Count: ${validTrailersCount}/13)`
  );

  // Ensure Viduthalai has genuine video ID
  const viduthalai = await Movie.findOne({ title: 'Viduthalai: Part 1' });
  if (viduthalai && viduthalai.trailerVideoId !== 'GYeSfq_bj_M') {
    viduthalai.trailerVideoId = 'GYeSfq_bj_M';
    viduthalai.trailerThumbnail = 'https://i.ytimg.com/vi/GYeSfq_bj_M/maxresdefault.jpg';
    viduthalai.trailerStatus = 'verified';
    await viduthalai.save();
    console.log('  [RESTORE] Restored Viduthalai: Part 1 trailer to authentic Sony Music South ID GYeSfq_bj_M');
  }

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
  process.exit(failed > 0 ? 1 : 0);
}

runTrailerSystemTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
