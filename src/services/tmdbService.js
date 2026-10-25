/**
 * TMDB (The Movie Database) Integration Service
 * Securely communicates with TMDB API using backend environment variables.
 * Secret keys are strictly maintained on the backend and NEVER exposed to frontend clients.
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_W500 = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMAGE_BASE_ORIGINAL = 'https://image.tmdb.org/t/p/original';
const FALLBACK_POSTER = '/images/movies/fallback-poster.svg';

/**
 * Retrieves the TMDB API key from backend environment variables.
 * @returns {string|null}
 */
const getApiKey = () => {
  return process.env.TMDB_API_KEY || null;
};

/**
 * Normalizes a TMDB movie object to the CineVerse Movie schema format
 * @param {object} item - TMDB raw movie object
 * @param {object} details - Optional extra details (credits, videos, certification)
 * @returns {object} Normalized movie object
 */
const formatTMDBMovie = (item, details = {}) => {
  if (!item) return null;

  const posterUrl = item.poster_path
    ? `${TMDB_IMAGE_BASE_W500}${item.poster_path}`
    : FALLBACK_POSTER;

  const bannerUrl = item.backdrop_path
    ? `${TMDB_IMAGE_BASE_ORIGINAL}${item.backdrop_path}`
    : posterUrl;

  // Extract YouTube trailer if available
  let trailerUrl = '';
  if (details.videos?.results?.length > 0) {
    const ytVideo = details.videos.results.find(
      (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    if (ytVideo?.key) {
      trailerUrl = `https://www.youtube.com/watch?v=${ytVideo.key}`;
    }
  }

  // Extract director and cast
  let director = 'Director';
  const cast = [];
  if (details.credits) {
    const dir = details.credits.crew?.find((c) => c.job === 'Director');
    if (dir?.name) director = dir.name;

    if (details.credits.cast?.length > 0) {
      details.credits.cast.slice(0, 5).forEach((actor) => {
        cast.push({ name: actor.name, role: actor.character || 'Actor' });
      });
    }
  }

  // Genre mapping
  const genre = item.genres?.length > 0
    ? item.genres.map((g) => g.name)
    : ['Drama', 'Action'];

  // Language mapping
  const langMap = {
    ta: 'Tamil',
    te: 'Telugu',
    hi: 'Hindi',
    ml: 'Malayalam',
    kn: 'Kannada',
    en: 'English',
  };
  const origLang = item.original_language?.toLowerCase();
  const primaryLang = langMap[origLang] || 'Tamil';

  // Slug generation
  const slug = (item.title || item.original_title || 'movie')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return {
    title: item.title || item.original_title,
    slug: `${slug}-${(item.release_date || '2025').slice(0, 4)}`,
    synopsis: item.overview || 'No synopsis provided.',
    posterUrl,
    bannerUrl,
    trailerUrl,
    genre,
    language: [primaryLang],
    duration: details.runtime || 150,
    certification: 'UA',
    releaseDate: item.release_date ? new Date(item.release_date) : new Date(),
    status: item.release_date && new Date(item.release_date) > new Date() ? 'coming_soon' : 'now_showing',
    formats: ['2D', '3D'],
    director,
    cast,
    rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 8.5,
    reviewCount: item.vote_count || 100,
    isTrending: item.popularity > 50,
    isFeatured: item.vote_average >= 8.0,
    tmdbId: item.id,
  };
};

/**
 * Searches TMDB for movies
 * @param {string} query
 * @param {number} page
 * @returns {Promise<{results: Array, totalResults: number, configured: boolean}>}
 */
const searchTMDBMovies = async (query, page = 1) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      configured: false,
      message: 'TMDB_API_KEY is not configured in backend/.env',
      results: [],
      totalResults: 0,
    };
  }

  try {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
      query
    )}&page=${page}&include_adult=false`;

    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`TMDB responded with HTTP ${response.status}`);
    }

    const data = await response.json();
    const formatted = (data.results || []).map((m) => formatTMDBMovie(m));

    return {
      configured: true,
      results: formatted,
      totalResults: data.total_results || 0,
      page: data.page || 1,
      totalPages: data.total_pages || 1,
    };
  } catch (error) {
    console.error('[TMDB Service Error]:', error.message);
    return {
      configured: true,
      error: error.message,
      results: [],
      totalResults: 0,
    };
  }
};

/**
 * Fetches trending or now playing Tamil movies from TMDB
 * @param {number} page
 * @returns {Promise<{results: Array, configured: boolean}>}
 */
const fetchTMDBTrending = async (page = 1) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      configured: false,
      message: 'TMDB_API_KEY is not configured in backend/.env',
      results: [],
    };
  }

  try {
    // Discover Tamil movies with high popularity
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&with_original_language=ta&sort_by=popularity.desc&page=${page}&include_adult=false`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`TMDB responded with HTTP ${response.status}`);
    }

    const data = await response.json();
    const formatted = (data.results || []).map((m) => formatTMDBMovie(m));

    return {
      configured: true,
      results: formatted,
      totalResults: data.total_results || 0,
    };
  } catch (error) {
    console.error('[TMDB Service Error]:', error.message);
    return {
      configured: true,
      error: error.message,
      results: [],
    };
  }
};

/**
 * Fetches complete details for a TMDB movie ID
 * @param {number|string} tmdbId
 * @returns {Promise<object|null>}
 */
const fetchTMDBMovieDetails = async (tmdbId) => {
  const apiKey = getApiKey();
  if (!apiKey || !tmdbId) return null;

  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits,videos`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`TMDB HTTP ${response.status}`);
    }
    const data = await response.json();
    return formatTMDBMovie(data, data);
  } catch (error) {
    console.error(`[TMDB Details Error for ${tmdbId}]:`, error.message);
    return null;
  }
};

module.exports = {
  getApiKey,
  searchTMDBMovies,
  fetchTMDBTrending,
  fetchTMDBMovieDetails,
  formatTMDBMovie,
};
