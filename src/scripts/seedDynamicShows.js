const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Screen = require('../models/Screen');
const Show = require('../models/Show');
const { getLocalDateString, calculateEndTime } = require('../utils/dateUtils');

// Seed Movies List (Idempotent by slug)
const SEED_MOVIES = [
  {
    title: 'Leo',
    slug: 'leo-2023',
    synopsis: 'A mild-mannered café owner in Himachal Pradesh becomes the target of a ruthless cartel syndicate who suspect him of being a legendary former gangster.',
    posterUrl: '/images/movies/leo-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=Po3jStA673E',
    genre: ['Action', 'Thriller', 'Crime'],
    language: ['Tamil', 'Telugu', 'Hindi'],
    duration: 164,
    certification: 'UA',
    releaseDate: new Date('2023-10-19'),
    status: 'now_showing',
    formats: ['2D', '3D', 'IMAX 2D'],
    director: 'Lokesh Kanagaraj',
    rating: 8.8,
    reviewCount: 9400,
    isTrending: true,
    isFeatured: true,
  },
  {
    title: 'Jailer',
    slug: 'jailer-2023',
    synopsis: 'Retired jail warden Tiger Muthuvel Pandian springs back into action when an antiquities smuggling gang threatens his family.',
    posterUrl: '/images/movies/jailer-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=xenOE1Tma0A',
    genre: ['Action', 'Comedy', 'Drama'],
    language: ['Tamil', 'Telugu', 'Hindi'],
    duration: 168,
    certification: 'UA',
    releaseDate: new Date('2023-08-10'),
    status: 'now_showing',
    formats: ['2D', 'Dolby Atmos'],
    director: 'Nelson Dilipkumar',
    rating: 8.6,
    reviewCount: 7800,
    isTrending: true,
    isFeatured: true,
  },
  {
    title: 'Vikram',
    slug: 'vikram-2022',
    synopsis: 'A covert black-ops investigator takes on a masked vigilante group and a vicious drug cartel kingpin seeking to retrieve a lost narcotics consignment.',
    posterUrl: '/images/movies/vikram-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=OKBMCL-frPU',
    genre: ['Action', 'Thriller', 'Mystery'],
    language: ['Tamil', 'Telugu', 'Hindi'],
    duration: 175,
    certification: 'UA',
    releaseDate: new Date('2022-06-03'),
    status: 'now_showing',
    formats: ['2D', 'Dolby Atmos', 'IMAX 2D'],
    director: 'Lokesh Kanagaraj',
    rating: 8.9,
    reviewCount: 8600,
    isTrending: true,
    isFeatured: true,
  },
  {
    title: 'Master',
    slug: 'master-2021',
    synopsis: 'An alcoholic professor is assigned to a juvenile correctional facility where he locks horns with a ruthless gangster using children as fall guys for crimes.',
    posterUrl: '/images/movies/master-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=UTiXQcrLlv4',
    genre: ['Action', 'Thriller', 'Drama'],
    language: ['Tamil', 'Telugu', 'Hindi'],
    duration: 178,
    certification: 'UA',
    releaseDate: new Date('2021-01-13'),
    status: 'now_showing',
    formats: ['2D', 'Dolby Atmos'],
    director: 'Lokesh Kanagaraj',
    rating: 8.7,
    reviewCount: 6500,
    isTrending: true,
    isFeatured: false,
  },
  {
    title: 'Maharaja',
    slug: 'maharaja-2024',
    synopsis: 'A quiet barber files an unusual police complaint when his metal dustbin Lakshmi is stolen during a burglary, unraveling a shocking web of retribution.',
    posterUrl: '/images/movies/maharaja-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=kQDd1AhGIHk',
    genre: ['Action', 'Thriller', 'Drama'],
    language: ['Tamil', 'Telugu', 'Hindi'],
    duration: 140,
    certification: 'UA',
    releaseDate: new Date('2024-06-14'),
    status: 'now_showing',
    formats: ['2D', 'Dolby Atmos'],
    director: 'Nithilan Saminathan',
    rating: 9.0,
    reviewCount: 5200,
    isTrending: true,
    isFeatured: true,
  },
  {
    title: 'Amaran',
    slug: 'amaran-2024',
    synopsis: 'A biographical action drama depicting the courage and sacrifice of Major Mukund Varadarajan of the Rajputana Rifles during counter-terror operations in Kashmir.',
    posterUrl: '/images/movies/amaran-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=hylixqkflDE',
    genre: ['Action', 'Biography', 'Drama'],
    language: ['Tamil', 'Telugu', 'Hindi'],
    duration: 169,
    certification: 'UA',
    releaseDate: new Date('2024-10-31'),
    status: 'now_showing',
    formats: ['2D', 'Dolby Atmos'],
    director: 'Rajkumar Periasamy',
    rating: 8.7,
    reviewCount: 4800,
    isTrending: true,
    isFeatured: true,
  },
  {
    title: 'Ponniyin Selvan: Part I',
    slug: 'ponniyin-selvan-part-1-2022',
    synopsis: 'Vandiyathevan sets out to cross the Chola kingdom with a crucial message while a conspiracy brews to overthrow Emperor Sundara Chola.',
    posterUrl: '/images/movies/ponniyin-selvan-1-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=D4qAQYLGZVM',
    genre: ['Action', 'Adventure', 'Drama'],
    language: ['Tamil', 'Telugu', 'Hindi', 'Malayalam'],
    duration: 167,
    certification: 'UA',
    releaseDate: new Date('2022-09-30'),
    status: 'now_showing',
    formats: ['2D', 'IMAX 2D'],
    director: 'Mani Ratnam',
    rating: 8.5,
    reviewCount: 5400,
    isTrending: false,
    isFeatured: false,
  },
  {
    title: 'Ponniyin Selvan: Part II',
    slug: 'ponniyin-selvan-part-2-2023',
    synopsis: 'Arulmozhi Varman continues his journey to reclaim the Chola crown as secrets of the past unfold and the empire faces internal rebellion.',
    posterUrl: '/images/movies/ponniyin-selvan-2-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=EYhkP_m3YcE',
    genre: ['Action', 'Adventure', 'Drama'],
    language: ['Tamil', 'Telugu', 'Hindi', 'Malayalam'],
    duration: 164,
    certification: 'UA',
    releaseDate: new Date('2023-04-28'),
    status: 'now_showing',
    formats: ['2D', 'IMAX 2D'],
    director: 'Mani Ratnam',
    rating: 8.4,
    reviewCount: 4200,
    isTrending: false,
    isFeatured: false,
  },
  {
    title: 'Viduthalai: Part 1',
    slug: 'viduthalai-part-1-2023',
    synopsis: 'A rookie police constable stationed at a remote outpost is caught in a moral conflict between institutional brutality and a separatist rebel leader.',
    posterUrl: '/images/movies/viduthalai-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=5XJ7eUuCgls',
    genre: ['Crime', 'Drama', 'Thriller'],
    language: ['Tamil'],
    duration: 150,
    certification: 'A',
    releaseDate: new Date('2023-03-31'),
    status: 'now_showing',
    formats: ['2D'],
    director: 'Vetrimaaran',
    rating: 8.7,
    reviewCount: 3100,
    isTrending: false,
    isFeatured: false,
  },
  {
    title: 'Kalki 2898 AD',
    slug: 'kalki-2898-ad-2024',
    synopsis: 'A modern avatar emerges in the city of Kasi as myth and futuristic technology converge in a battle between darkness and divine light.',
    posterUrl: '/images/movies/kalki-2898-ad-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=kQDd1AhGIHk',
    genre: ['Sci-Fi', 'Mythology', 'Action'],
    language: ['Telugu', 'Tamil', 'Hindi'],
    duration: 180,
    certification: 'UA',
    releaseDate: new Date('2024-06-27'),
    status: 'now_showing',
    formats: ['IMAX 3D', '3D', '2D'],
    director: 'Nag Ashwin',
    rating: 8.9,
    reviewCount: 6200,
    isTrending: true,
    isFeatured: true,
  },
  {
    title: 'Dragon',
    slug: 'dragon-2025',
    synopsis: 'A young college graduate navigates ambition, career chaos, and unexpected romance while taking on life with unstoppable wit and grit.',
    posterUrl: '/images/movies/dragon-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    genre: ['Action', 'Comedy', 'Drama'],
    language: ['Tamil', 'Telugu'],
    duration: 152,
    certification: 'UA',
    releaseDate: new Date('2025-02-21'),
    status: 'coming_soon',
    formats: ['2D', '3D'],
    director: 'Ashwath Marimuthu',
    rating: 8.5,
    reviewCount: 1200,
    isTrending: false,
    isFeatured: false,
  },
  {
    title: 'Retro',
    slug: 'retro-2025',
    synopsis: 'A stylized romantic gangster saga set against vintage coastal landscapes, exploring love, laughter, and high-octane warfare.',
    posterUrl: '/images/movies/retro-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=OKBMCL-frPU',
    genre: ['Action', 'Drama', 'Romance'],
    language: ['Tamil', 'Telugu', 'Hindi'],
    duration: 155,
    certification: 'UA',
    releaseDate: new Date('2025-05-01'),
    status: 'coming_soon',
    formats: ['2D', 'Dolby Atmos'],
    director: 'Karthik Subbaraj',
    rating: 8.6,
    reviewCount: 1800,
    isTrending: true,
    isFeatured: false,
  },
  {
    title: 'Good Bad Ugly',
    slug: 'good-bad-ugly-2025',
    synopsis: 'An explosive action thriller where three morally conflicted operatives collide in an epic heist duel across international underworld syndicates.',
    posterUrl: '/images/movies/good-bad-ugly-poster.jpg',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=kQDd1AhGIHk',
    genre: ['Action', 'Comedy', 'Thriller'],
    language: ['Tamil', 'Telugu', 'Hindi'],
    duration: 158,
    certification: 'UA',
    releaseDate: new Date('2025-04-10'),
    status: 'coming_soon',
    formats: ['2D', 'IMAX 2D'],
    director: 'Adhik Ravichandran',
    rating: 8.8,
    reviewCount: 2900,
    isTrending: true,
    isFeatured: false,
  },
];

/**
 * Creates default screens for a theatre if none exist
 */
const ensureTheatreScreens = async (theatreId) => {
  let screens = await Screen.find({ theatreId });
  if (screens.length > 0) return screens;

  const buildSeatLayout = (colsPerRow = 12) => {
    const rowConfigs = [
      { rowLabel: 'A', category: 'Recliner' },
      { rowLabel: 'B', category: 'Recliner' },
      { rowLabel: 'C', category: 'Premium' },
      { rowLabel: 'D', category: 'Premium' },
      { rowLabel: 'E', category: 'Premium' },
      { rowLabel: 'F', category: 'Premium' },
      { rowLabel: 'G', category: 'Standard' },
      { rowLabel: 'H', category: 'Standard' },
      { rowLabel: 'J', category: 'Standard' },
      { rowLabel: 'K', category: 'Standard' },
    ];
    return rowConfigs.map((cfg) => ({
      rowLabel: cfg.rowLabel,
      category: cfg.category,
      seats: Array.from({ length: colsPerRow }, (_, i) => {
        const colIndex = i + 1;
        return {
          seatNumber: `${cfg.rowLabel}${colIndex}`,
          colIndex,
          isAisle: colIndex === 3 || colIndex === colsPerRow - 2,
          isActive: true,
        };
      }),
    }));
  };

  const createdScreens = await Screen.insertMany([
    {
      theatreId,
      screenNumber: 1,
      name: 'Screen 1 (Laser 4K)',
      projectionType: 'Laser 4K',
      soundSystem: 'Dolby Atmos 7.1',
      totalCapacity: 120,
      rows: buildSeatLayout(12),
    },
    {
      theatreId,
      screenNumber: 2,
      name: 'Screen 2 (Digital 2K)',
      projectionType: 'Digital 2K',
      soundSystem: 'Dolby Atmos 7.1',
      totalCapacity: 120,
      rows: buildSeatLayout(12),
    },
  ]);

  return createdScreens;
};

/**
 * Ensures movies exist idempotently
 */
const ensureMovies = async () => {
  const movies = [];
  for (const m of SEED_MOVIES) {
    const saved = await Movie.findOneAndUpdate(
      { slug: m.slug },
      { $set: m },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    movies.push(saved);
  }
  return movies;
};

/**
 * Idempotently seeds dynamic showtimes for Today, Tomorrow, and upcoming 5 days.
 * Never fabricates verified live schedules; clearly labels demo data.
 */
const seedDynamicShows = async () => {
  console.log('🎬 [Dynamic Shows] Generating dynamic showtimes across Tamil Nadu...');

  // 1. Ensure Movies
  const allMovies = await ensureMovies();
  const nowShowingMovies = allMovies.filter((m) => m.status === 'now_showing');

  // 2. Select Theatres: All active theatres in the database
  const targetTheatres = await Theatre.find({ isActive: true });

  if (targetTheatres.length === 0) {
    console.warn('⚠️ No theatres found in database. Please run theatre importer first.');
    return;
  }

  console.log(`🎬 [Dynamic Shows] Seeding realistic show schedules across ${targetTheatres.length} Indian theatres...`);

  const showtimeSlots = ['10:30 AM', '02:15 PM', '06:30 PM', '10:00 PM'];
  let totalShowsUpserted = 0;

  // Cache screens for each theatre
  const theatreScreensMap = new Map();
  for (const th of targetTheatres) {
    const screens = await ensureTheatreScreens(th._id);
    theatreScreensMap.set(th._id.toString(), screens);
  }

  // Pre-seed 6 days: Today (0) through Day 5
  for (let dayOffset = 0; dayOffset <= 5; dayOffset++) {
    const dateStr = getLocalDateString(dayOffset);
    const bulkOps = [];

    for (let tIdx = 0; tIdx < targetTheatres.length; tIdx++) {
      const theatre = targetTheatres[tIdx];
      const screens = theatreScreensMap.get(theatre._id.toString()) || [];
      if (screens.length === 0) continue;

      // Realistically select 2 to 4 movies for this theatre rather than every movie
      // Use consistent hash based on theatre index to distribute movies stably
      const numMoviesForTheatre = Math.min(2 + (tIdx % 3), nowShowingMovies.length);
      const selectedMovies = [];
      for (let m = 0; m < numMoviesForTheatre; m++) {
        const movieIndex = (tIdx * 2 + m) % nowShowingMovies.length;
        selectedMovies.push(nowShowingMovies[movieIndex]);
      }

      for (let mIdx = 0; mIdx < selectedMovies.length; mIdx++) {
        const movie = selectedMovies[mIdx];
        const screen = screens[mIdx % screens.length];

        // 2 showtimes per movie per day (e.g. afternoon + evening or morning + night)
        const slot1 = showtimeSlots[(tIdx + mIdx) % showtimeSlots.length];
        const slot2 = showtimeSlots[(tIdx + mIdx + 2) % showtimeSlots.length];
        const timesForMovie = [slot1, slot2];

        const isImax = (screen.name || '').includes('IMAX') || (movie.formats || []).includes('IMAX 2D');
        const pricing = isImax
          ? { standard: 220, premium: 350, recliner: 550 }
          : { standard: 160, premium: 250, recliner: 420 };

        for (const timeSlot of timesForMovie) {
          bulkOps.push({
            updateOne: {
              filter: {
                movieId: movie._id,
                theatreId: theatre._id,
                screenId: screen._id,
                date: dateStr,
                startTime: timeSlot,
              },
              update: {
                $set: {
                  endTime: calculateEndTime(timeSlot, movie.duration || 150),
                  format: isImax ? 'IMAX 2D' : (movie.formats?.[0] || '2D'),
                  language: movie.language?.[0] || 'Tamil',
                  pricing,
                  status: 'scheduled',
                  isDemoData: true, // Clearly marks simulated dev showtimes
                },
              },
              upsert: true,
            },
          });
        }
      }
    }

    if (bulkOps.length > 0) {
      const result = await Show.bulkWrite(bulkOps, { ordered: false });
      totalShowsUpserted += (result.upsertedCount || 0) + (result.modifiedCount || 0);
    }
  }

  const distinctShowDates = await Show.distinct('date');
  console.log(`✅ [Dynamic Shows] Successfully provisioned ${totalShowsUpserted} shows across ${targetTheatres.length} theatres.`);
  console.log(`📅 [Dynamic Shows] Active show dates: ${distinctShowDates.sort().join(', ')}`);
  return { totalShows: totalShowsUpserted, dates: distinctShowDates };
};

/**
 * Server startup helper: Checks if today's date has shows.
 * If not, automatically runs seedDynamicShows so the app is always functional.
 */
const ensureShowsForCurrentDate = async () => {
  try {
    const today = getLocalDateString(0);
    const showsTodayCount = await Show.countDocuments({ date: today });
    if (showsTodayCount === 0) {
      console.log(`ℹ️ [Startup] No shows found for today (${today}). Automatically provisioning dynamic showtimes...`);
      await seedDynamicShows();
    } else {
      console.log(`⚡ [Startup] Database contains ${showsTodayCount} shows scheduled for today (${today}).`);
    }
  } catch (error) {
    console.warn('[Startup Warning] ensureShowsForCurrentDate failed:', error.message);
  }
};

// If run directly from CLI
if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB()
    .then(async () => {
      console.log('Connected to MongoDB successfully.');
      await seedDynamicShows();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = {
  seedDynamicShows,
  ensureShowsForCurrentDate,
};
