const Movie = require('../models/Movie');
const youtubeService = require('../services/youtubeService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');

/**
 * Normalizes movie documents so all frontend consumers (Admin & Customer)
 * receive consistent field names regardless of schema aliases.
 */
const formatMovie = (movieDoc) => {
  if (!movieDoc) return null;
  const m = typeof movieDoc.toObject === 'function' ? movieDoc.toObject() : { ...movieDoc };

  const poster = m.posterUrl || m.poster || '/images/movies/fallback-poster.svg';
  const banner = m.bannerUrl || m.bannerImage || poster;
  const relStatus = m.status || m.releaseStatus || 'now_showing';

  const langs = Array.isArray(m.language)
    ? m.language
    : Array.isArray(m.languages)
    ? m.languages
    : typeof m.language === 'string'
    ? [m.language]
    : ['Tamil'];

  const genres = Array.isArray(m.genre)
    ? m.genre
    : Array.isArray(m.genres)
    ? m.genres
    : typeof m.genre === 'string'
    ? [m.genre]
    : ['Action'];

  const dirName = m.director || (Array.isArray(m.directors) ? m.directors.join(', ') : 'Director');
  const dirs = Array.isArray(m.directors) ? m.directors : [dirName];

  const numericRating = typeof m.rating === 'number'
    ? m.rating
    : typeof m.rating === 'object' && m.rating?.average
    ? Number(m.rating.average)
    : 8.5;

  const videoId = m.trailerVideoId || (Movie.extractYouTubeVideoId ? Movie.extractYouTubeVideoId(m.trailerUrl) : '');
  const statusTrailer = m.trailerStatus || (videoId ? 'needs_review' : 'missing');
  const isOfficial = statusTrailer === 'verified';
  const hasTrailer = Boolean(videoId && statusTrailer !== 'missing' && statusTrailer !== 'error');

  const thumbnailResolutions = (Array.isArray(m.trailerThumbnailResolutions) && m.trailerThumbnailResolutions.length > 0)
    ? m.trailerThumbnailResolutions
    : videoId
    ? [
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      ]
    : [];

  const trailerThumb = m.trailerThumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : banner);

  return {
    ...m,
    poster,
    posterUrl: poster,
    bannerImage: banner,
    bannerUrl: banner,
    status: relStatus,
    releaseStatus: relStatus,
    language: langs,
    languages: langs,
    genre: genres,
    genres: genres,
    director: dirName,
    directors: dirs,
    rating: numericRating,
    ratingObject: {
      average: numericRating,
      count: m.reviewCount || 120,
    },
    trailerVideoId: videoId,
    trailerThumbnail: trailerThumb,
    trailerThumbnailResolutions: thumbnailResolutions,
    trailerStatus: statusTrailer,
    isOfficial,
    hasTrailer,
    trailerBadge: isOfficial ? 'Official Trailer' : hasTrailer ? 'Trailer' : 'Trailer unavailable',
    trailerEmbedUrl: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : '',
  };
};

const Show = require('../models/Show');
const Theatre = require('../models/Theatre');

/**
 * Get all movies with search, filters, pagination, and sorting
 * Preserves the entire movie catalogue so missing showtimes never cause an empty movie page.
 */
const getMovies = async (req, res, next) => {
  try {
    const {
      search,
      genre,
      language,
      status, // 'now_showing', 'coming_soon', 'archived'
      sort = 'popularity', // 'popularity', 'rating', 'releaseDate', 'title'
      isTrending,
      isFeatured,
      city,
      district,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const trimmed = search.trim();
      query.$or = [
        { title: { $regex: trimmed, $options: 'i' } },
        { synopsis: { $regex: trimmed, $options: 'i' } },
        { director: { $regex: trimmed, $options: 'i' } },
        { genre: { $regex: trimmed, $options: 'i' } },
        { language: { $regex: trimmed, $options: 'i' } },
      ];
    }

    if (genre && genre !== 'All') {
      query.genre = { $regex: new RegExp(genre.trim(), 'i') };
    }

    if (language && language !== 'All') {
      const cleanLang = language.trim();
      const langRegex = cleanLang.toLowerCase() === 'ta' ? /tamil/i : new RegExp(cleanLang, 'i');
      query.language = { $regex: langRegex };
    }

    if (status && status !== 'All' && status !== '') {
      if (status === 'archived') {
        query.status = 'ended';
      } else {
        query.status = status;
      }
    }

    if (isTrending === 'true') {
      query.isTrending = true;
    }

    if (isFeatured === 'true') {
      query.isFeatured = true;
    }

    // Determine sorting
    let sortOption = {};
    if (sort === 'rating') {
      sortOption = { rating: -1, reviewCount: -1 };
    } else if (sort === 'releaseDate') {
      sortOption = { releaseDate: -1 };
    } else if (sort === 'title') {
      sortOption = { title: 1 };
    } else {
      // Popularity default
      sortOption = { rating: -1, reviewCount: -1, createdAt: -1 };
    }

    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;

    // Detect which movies have active showtimes in the requested location (if provided)
    const locFilter = city || district;
    const moviesWithLocalShows = new Set();

    if (locFilter && locFilter !== 'All') {
      try {
        const locRegex = new RegExp(locFilter.trim(), 'i');
        const matchingTheatres = await Theatre.find({
          $or: [
            { city: locRegex },
            { district: locRegex },
            { locality: locRegex },
            { town: locRegex },
            { address: locRegex },
          ],
        }).select('_id');

        const theatreIds = matchingTheatres.map((t) => t._id);
        if (theatreIds.length > 0) {
          const movieIdsWithShows = await Show.distinct('movieId', {
            theatreId: { $in: theatreIds },
            status: { $ne: 'cancelled' },
          });
          movieIdsWithShows.forEach((id) => moviesWithLocalShows.add(id.toString()));
        }
      } catch (err) {
        console.warn('[MovieController Location Detection Warning]:', err.message);
      }
    }

    const total = await Movie.countDocuments(query);
    const rawMovies = await Movie.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(pageSize);

    const movies = rawMovies.map((doc) => {
      const formatted = formatMovie(doc);
      return {
        ...formatted,
        hasShowsInCity: locFilter && locFilter !== 'All' ? moviesWithLocalShows.has(formatted._id.toString()) : true,
      };
    });

    return paginatedResponse(
      res,
      'Movies fetched successfully',
      movies,
      {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        activeLocation: locFilter || 'All',
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single movie by ID or Slug
 */
const getMovieById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let movie;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      movie = await Movie.findById(id);
    } else {
      movie = await Movie.findOne({ slug: id });
    }

    if (!movie) {
      return errorResponse(res, 'Movie not found', 404);
    }

    return successResponse(res, 'Movie details retrieved', formatMovie(movie));
  } catch (error) {
    next(error);
  }
};

/**
 * Get distinct genres and languages for filters
 */
const getFiltersMetadata = async (req, res, next) => {
  try {
    const [genres, languages] = await Promise.all([
      Movie.distinct('genre'),
      Movie.distinct('language'),
    ]);

    return successResponse(res, 'Movie filters metadata', {
      genres: genres.sort(),
      languages: languages.sort(),
      statuses: ['now_showing', 'coming_soon'],
      formats: ['2D', '3D', 'IMAX 2D', 'IMAX 3D', '4DX'],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create Movie
 */
const createMovie = async (req, res, next) => {
  try {
    const title = req.body.title?.trim();
    const synopsis = req.body.synopsis?.trim();
    const posterUrl = req.body.posterUrl || req.body.poster;
    const bannerUrl = req.body.bannerUrl || req.body.bannerImage || posterUrl;
    const trailerUrl = req.body.trailerUrl || '';
    const duration = Number(req.body.duration);
    const certification = req.body.certification || 'UA';
    const releaseDate = req.body.releaseDate ? new Date(req.body.releaseDate) : new Date();
    const status = req.body.status || req.body.releaseStatus || 'now_showing';
    const formats = req.body.formats || ['2D', '3D'];

    // Arrays & aliases
    const rawGenre = req.body.genre || req.body.genres || ['Action'];
    const genre = Array.isArray(rawGenre)
      ? rawGenre
      : String(rawGenre).split(',').map((s) => s.trim()).filter(Boolean);

    const rawLang = req.body.language || req.body.languages || ['Tamil'];
    const language = Array.isArray(rawLang)
      ? rawLang
      : String(rawLang).split(',').map((s) => s.trim()).filter(Boolean);

    const rawDir = req.body.director || req.body.directors || 'Director';
    const director = Array.isArray(rawDir) ? rawDir.join(', ') : String(rawDir);

    const rawRating = req.body.rating;
    const rating = typeof rawRating === 'object' ? Number(rawRating.average || 8.5) : Number(rawRating || 8.5);

    if (!title || !synopsis || !posterUrl || !duration) {
      return errorResponse(res, 'Title, synopsis, poster, and duration are required', 400);
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Math.floor(100 + Math.random() * 900);

    let finalTrailerUrl = trailerUrl ? trailerUrl.trim() : '';
    let finalVideoId = '';
    let finalTrailerTitle = '';
    let finalTrailerChannel = '';
    let finalTrailerStatus = 'missing';
    let finalTrailerSource = 'none';

    if (finalTrailerUrl) {
      finalVideoId = youtubeService.extractVideoId(finalTrailerUrl);
      finalTrailerStatus = finalVideoId ? 'needs_review' : 'missing';
      finalTrailerSource = 'manual_admin';
    } else {
      try {
        const autoTrailer = await youtubeService.findBestTrailerForMovie({
          title,
          releaseDate,
          language: language.length > 0 ? language : ['Tamil'],
        });
        if (autoTrailer && autoTrailer.success && autoTrailer.videoId) {
          finalTrailerUrl = autoTrailer.trailerUrl;
          finalVideoId = autoTrailer.videoId;
          finalTrailerTitle = autoTrailer.title;
          finalTrailerChannel = autoTrailer.channelTitle;
          finalTrailerStatus = autoTrailer.status || 'verified';
          finalTrailerSource = autoTrailer.source || 'youtube_api';
        }
      } catch (lookupErr) {
        console.warn(`[Auto Trailer Lookup] Skipped for "${title}":`, lookupErr.message);
      }
    }

    const movie = new Movie({
      title,
      slug,
      synopsis,
      posterUrl,
      bannerUrl,
      trailerUrl: finalTrailerUrl,
      trailerVideoId: finalVideoId,
      trailerTitle: finalTrailerTitle,
      trailerChannel: finalTrailerChannel,
      trailerStatus: finalTrailerStatus,
      trailerSource: finalTrailerSource,
      trailerVerifiedAt: finalTrailerStatus === 'verified' ? new Date() : null,
      genre: genre.length > 0 ? genre : ['Action'],
      language: language.length > 0 ? language : ['Tamil'],
      duration,
      certification,
      releaseDate,
      status: ['now_showing', 'coming_soon', 'ended'].includes(status) ? status : 'now_showing',
      formats,
      director,
      cast: Array.isArray(req.body.cast) ? req.body.cast : [],
      rating,
      isTrending: !!req.body.isTrending,
      isFeatured: !!req.body.isFeatured,
    });

    await movie.save();
    return successResponse(res, 'Movie created successfully', formatMovie(movie), 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update Movie
 */
const updateMovie = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Normalize field aliases
    if (updateData.poster && !updateData.posterUrl) updateData.posterUrl = updateData.poster;
    if (updateData.bannerImage && !updateData.bannerUrl) updateData.bannerUrl = updateData.bannerImage;
    if (updateData.releaseStatus && !updateData.status) updateData.status = updateData.releaseStatus;
    if (updateData.genres && !updateData.genre) updateData.genre = updateData.genres;
    if (updateData.languages && !updateData.language) updateData.language = updateData.languages;
    if (updateData.directors && !updateData.director) {
      updateData.director = Array.isArray(updateData.directors) ? updateData.directors.join(', ') : updateData.directors;
    }
    if (typeof updateData.rating === 'object') {
      updateData.rating = Number(updateData.rating.average || 8.5);
    }

    if (typeof updateData.genre === 'string') {
      updateData.genre = updateData.genre.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (typeof updateData.language === 'string') {
      updateData.language = updateData.language.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Synchronize trailer fields if updated
    if (updateData.trailerUrl !== undefined) {
      const trimmedTrailer = String(updateData.trailerUrl || '').trim();
      if (trimmedTrailer) {
        const videoId = youtubeService.extractVideoId(trimmedTrailer);
        if (videoId && youtubeService.validateVideoId(videoId)) {
          updateData.trailerUrl = `https://www.youtube.com/watch?v=${videoId}`;
          updateData.trailerVideoId = videoId;
          updateData.trailerThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          if (!updateData.trailerStatus || updateData.trailerStatus === 'missing') {
            updateData.trailerStatus = 'needs_review';
          }
          updateData.trailerLastCheckedAt = new Date();
        } else {
          updateData.trailerStatus = 'missing';
          updateData.trailerVideoId = '';
        }
      } else {
        updateData.trailerUrl = '';
        updateData.trailerVideoId = '';
        updateData.trailerThumbnail = '';
        updateData.trailerStatus = 'missing';
        updateData.trailerSource = 'none';
        updateData.trailerVerifiedAt = null;
      }
    }

    const movie = await Movie.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!movie) {
      return errorResponse(res, 'Movie not found', 404);
    }
    return successResponse(res, 'Movie updated successfully', formatMovie(movie));
  } catch (error) {
    next(error);
  }
};

const tmdbService = require('../services/tmdbService');

/**
 * Admin: Search TMDB
 */
const searchTMDB = async (req, res, next) => {
  try {
    const { query, page } = req.query;
    if (!query) {
      return errorResponse(res, 'Search query is required', 400);
    }
    const result = await tmdbService.searchTMDBMovies(query, Number(page || 1));
    return successResponse(res, 'TMDB search results', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Import Movie from TMDB
 */
const importFromTMDB = async (req, res, next) => {
  try {
    const { tmdbId } = req.body;
    if (!tmdbId) {
      return errorResponse(res, 'tmdbId is required', 400);
    }
    const movieData = await tmdbService.fetchTMDBMovieDetails(tmdbId);
    if (!movieData) {
      return errorResponse(res, 'Failed to fetch movie details from TMDB', 404);
    }
    const savedMovie = await Movie.findOneAndUpdate(
      { slug: movieData.slug },
      { $set: movieData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return successResponse(res, 'Movie imported successfully from TMDB', formatMovie(savedMovie), 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete Movie
 */
const deleteMovie = async (req, res, next) => {
  try {
    const { id } = req.params;
    const movie = await Movie.findByIdAndDelete(id);
    if (!movie) {
      return errorResponse(res, 'Movie not found', 404);
    }
    return successResponse(res, 'Movie deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMovies,
  getMovieById,
  getFiltersMetadata,
  createMovie,
  updateMovie,
  deleteMovie,
  searchTMDB,
  importFromTMDB,
  formatMovie,
};
