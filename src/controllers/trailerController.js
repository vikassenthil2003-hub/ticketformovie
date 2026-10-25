const Movie = require('../models/Movie');
const youtubeService = require('../services/youtubeService');
const verifiedRegistry = require('../data/verifiedTrailersRegistry');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { formatMovie } = require('./movieController');

/**
 * CineVerse AI — Trailer Management & Watch Movie Controller
 */

/**
 * Public: Get movies with trailers for the Watch Movie customer experience.
 * Supports categories (All, Latest, Tamil, Telugu, Hindi, Malayalam, Kannada, English),
 * title search, genre filtering, and pagination.
 */
const getTrailers = async (req, res, next) => {
  try {
    const {
      search,
      language,
      genre,
      category = 'all',
      status, // 'verified', 'available', 'needs_review', 'all'
      page = 1,
      limit = 24,
    } = req.query;

    const query = {};

    // Category / Language preset mapping
    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      if (catLower === 'tamil') query.language = { $regex: /tamil/i };
      else if (catLower === 'telugu') query.language = { $regex: /telugu/i };
      else if (catLower === 'hindi') query.language = { $regex: /hindi/i };
      else if (catLower === 'malayalam') query.language = { $regex: /malayalam/i };
      else if (catLower === 'kannada') query.language = { $regex: /kannada/i };
      else if (catLower === 'english') query.language = { $regex: /english/i };
    }

    // Direct language filter
    if (language && language !== 'All') {
      query.language = { $regex: new RegExp(language.trim(), 'i') };
    }

    // Direct genre filter
    if (genre && genre !== 'All') {
      query.genre = { $regex: new RegExp(genre.trim(), 'i') };
    }

    // Title search
    if (search && search.trim()) {
      const trimmed = search.trim();
      query.$or = [
        { title: { $regex: trimmed, $options: 'i' } },
        { director: { $regex: trimmed, $options: 'i' } },
        { tags: { $regex: trimmed, $options: 'i' } },
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      query.trailerStatus = status;
    }

    // Sort order: Latest trailers prioritize recent releaseDate, then createdAt
    let sortOption = { releaseDate: -1, createdAt: -1 };
    if (category === 'latest') {
      sortOption = { releaseDate: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [movies, total] = await Promise.all([
      Movie.find(query).sort(sortOption).skip(skip).limit(limitNum).lean(),
      Movie.countDocuments(query),
    ]);

    const formatted = movies.map(formatMovie);

    return paginatedResponse(res, 'Trailers retrieved successfully', formatted, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Safe configuration status endpoint (Never leaks secret key).
 */
const getConfigStatus = async (req, res, next) => {
  try {
    const isConfigured = youtubeService.isApiKeyConfigured();
    return successResponse(res, 'Trailer service configuration status', {
      youtubeApiConfigured: isConfigured,
      mode: isConfigured ? 'live_youtube_api' : 'fallback_verified_registry',
      message: isConfigured
        ? 'Official YouTube Data API v3 is active.'
        : 'YouTube API key is not configured in backend/.env. Using high-fidelity official verified cinema registry.',
      curatedRegistryCount: verifiedRegistry.getAllVerifiedTrailers().length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get overview trailer statistics.
 */
const getTrailerStats = async (req, res, next) => {
  try {
    const [totalMovies, verifiedCount, availableCount, needsReviewCount, missingCount] = await Promise.all([
      Movie.countDocuments(),
      Movie.countDocuments({ trailerStatus: 'verified' }),
      Movie.countDocuments({ trailerStatus: 'available' }),
      Movie.countDocuments({ trailerStatus: 'needs_review' }),
      Movie.countDocuments({ $or: [{ trailerStatus: 'missing' }, { trailerStatus: { $exists: false } }, { trailerUrl: '' }] }),
    ]);

    const isConfigured = youtubeService.isApiKeyConfigured();

    return successResponse(res, 'Trailer directory statistics', {
      totalMovies,
      verifiedCount,
      availableCount,
      needsReviewCount,
      missingCount,
      youtubeApiConfigured: isConfigured,
      curatedRegistryCount: verifiedRegistry.getAllVerifiedTrailers().length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Search trailers for an individual movie using YouTube API / Registry.
 */
const searchMovieTrailer = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { forceLiveSearch } = req.body || {};

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return errorResponse(res, 'Movie not found', 404);
    }

    const result = await youtubeService.findBestTrailerForMovie(movie, { forceLiveSearch });
    return successResponse(res, 'Trailer search completed', {
      movie: {
        _id: movie._id,
        title: movie.title,
        year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
        language: movie.language,
        currentTrailerUrl: movie.trailerUrl,
        currentStatus: movie.trailerStatus,
      },
      searchResult: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Lookup trailer by query (title, year, language) before movie creation.
 */
const lookupTrailerQuery = async (req, res, next) => {
  try {
    const { title, year, language, forceLiveSearch } = req.body || {};
    if (!title || !title.trim()) {
      return errorResponse(res, 'Movie title is required for trailer lookup.', 400);
    }

    const lang = Array.isArray(language) ? language[0] : language || 'Tamil';
    const result = await youtubeService.searchYouTubeTrailer(title.trim(), year, lang, { forceLiveSearch });

    return successResponse(res, 'Trailer query lookup completed', {
      query: { title: title.trim(), year, language: lang },
      searchResult: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Manually assign, edit, or verify a trailer for a movie.
 */
const assignMovieTrailer = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const {
      trailerUrl,
      trailerVideoId,
      trailerTitle,
      trailerChannel,
      status = 'verified',
      notes = '',
    } = req.body;

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return errorResponse(res, 'Movie not found', 404);
    }

    const cleanVideoId = trailerVideoId || youtubeService.extractVideoId(trailerUrl);
    if (!cleanVideoId || !youtubeService.validateVideoId(cleanVideoId)) {
      return errorResponse(res, 'A valid 11-character YouTube Video ID or standard YouTube URL is required.', 400);
    }

    const finalUrl = `https://www.youtube.com/watch?v=${cleanVideoId}`;
    const thumbInfo = await youtubeService.getThumbnailResolutions(cleanVideoId);

    movie.trailerUrl = finalUrl;
    movie.trailerVideoId = cleanVideoId;
    movie.trailerTitle = trailerTitle || movie.trailerTitle || `${movie.title} — Official Trailer`;
    movie.trailerChannel = trailerChannel || movie.trailerChannel || 'Official Channel';
    movie.trailerThumbnail = thumbInfo?.primary || `https://i.ytimg.com/vi/${cleanVideoId}/maxresdefault.jpg`;
    movie.trailerThumbnailResolutions = thumbInfo?.resolutions || [];
    movie.trailerStatus = ['verified', 'available', 'needs_review', 'missing', 'error'].includes(status) ? status : 'verified';
    movie.trailerSource = 'manual_admin';
    movie.trailerVerifiedAt = new Date();
    movie.trailerLastCheckedAt = new Date();
    if (notes) movie.trailerNotes = notes;

    await movie.save();

    return successResponse(res, 'Trailer assigned and verified successfully', formatMovie(movie));
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Remove a trailer from a movie.
 */
const removeMovieTrailer = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return errorResponse(res, 'Movie not found', 404);
    }

    movie.trailerUrl = '';
    movie.trailerVideoId = '';
    movie.trailerTitle = '';
    movie.trailerChannel = '';
    movie.trailerThumbnail = '';
    movie.trailerThumbnailResolutions = [];
    movie.trailerStatus = 'missing';
    movie.trailerSource = 'none';
    movie.trailerVerifiedAt = null;

    await movie.save();

    return successResponse(res, 'Trailer removed successfully', formatMovie(movie));
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Comprehensive bulk repair action.
 * Audits every movie, detects missing, broken (404), or mismatched trailers,
 * searches replacement trailers in specified tier order, checks accessibility,
 * prevents duplicate video records, and allows previewing uncertain matches before saving.
 */
const bulkRepairTrailers = async (req, res, next) => {
  try {
    const { previewOnly = false, approvedMovieIds = null, forceRecheck = false } = req.body || {};

    const movies = await Movie.find({});
    const logs = [];
    let totalChecked = movies.length;
    let trailersRepaired = 0;
    let alreadyValid = 0;
    let uncertainMatches = 0;
    let stillMissing = 0;
    let failedCount = 0;

    // Track assigned video IDs across movies to prevent duplicates
    const assignedVideoIds = new Set();
    for (const m of movies) {
      if (m.trailerVideoId && m.trailerStatus === 'verified' && !forceRecheck) {
        assignedVideoIds.add(m.trailerVideoId);
      }
    }

    for (const movie of movies) {
      try {
        let isCurrentBroken = false;
        let isCurrentMismatched = false;
        let currentStatus = movie.trailerStatus || 'missing';

        // 1. Audit current movie trailer state
        if (!movie.trailerVideoId || !movie.trailerUrl || currentStatus === 'missing') {
          isCurrentBroken = true;
        } else {
          const access = await youtubeService.checkVideoAccessibility(movie.trailerVideoId);
          if (!access.accessible) {
            isCurrentBroken = true;
          } else if (access.title) {
            // Check for clear movie mismatch (e.g., Dune trailer on Dragon or Vikram on Retro)
            const accessTitleLower = access.title.toLowerCase();
            const movieTokens = movie.title.toLowerCase().split(/[\s:\-]+/).filter((t) => t.length > 2);
            const hasCommonToken = movieTokens.some((t) => accessTitleLower.includes(t));
            if (!hasCommonToken && movieTokens.length > 0) {
              isCurrentMismatched = true;
            }
          }
        }

        // If current trailer is verified, accessible, and correctly matches, keep it
        if (!isCurrentBroken && !isCurrentMismatched && !forceRecheck && (currentStatus === 'verified' || currentStatus === 'available')) {
          alreadyValid++;
          logs.push({
            movieId: movie._id,
            title: movie.title,
            year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
            status: currentStatus,
            action: 'skipped',
            reason: 'Trailer is already verified, authentic, and accessible on YouTube.',
            videoId: movie.trailerVideoId,
            thumbnail: movie.trailerThumbnail,
          });
          continue;
        }

        // 2. Search replacement trailer using 3-tier strategy
        const searchResult = await youtubeService.findBestTrailerForMovie(movie);

        if (searchResult && searchResult.success && searchResult.videoId) {
          // Prevent duplicate trailer assignments
          if (assignedVideoIds.has(searchResult.videoId)) {
            // Already assigned to another movie
            logs.push({
              movieId: movie._id,
              title: movie.title,
              year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
              status: currentStatus,
              action: 'duplicate_prevented',
              reason: `Trailer video ${searchResult.videoId} is already assigned to another title. Skipping to prevent duplicate.`,
            });
            continue;
          }

          const isUncertain = searchResult.status === 'needs_review' || searchResult.confidence === 'needs_review';
          const proposedStatus = searchResult.status || (searchResult.isOfficial ? 'verified' : 'available');

          const proposedData = {
            trailerUrl: searchResult.trailerUrl || `https://www.youtube.com/watch?v=${searchResult.videoId}`,
            trailerVideoId: searchResult.videoId,
            trailerTitle: searchResult.title || `${movie.title} — Official Trailer`,
            trailerChannel: searchResult.channelTitle || 'Official Channel',
            trailerThumbnail: searchResult.thumbnail || `https://i.ytimg.com/vi/${searchResult.videoId}/maxresdefault.jpg`,
            trailerThumbnailResolutions: searchResult.thumbnailResolutions || [],
            trailerStatus: proposedStatus,
            trailerSource: searchResult.source || 'official_curated',
            trailerVerifiedAt: new Date(),
            trailerLastCheckedAt: new Date(),
          };

          if (isUncertain) {
            uncertainMatches++;
          }

          const isApproved = !approvedMovieIds || approvedMovieIds.includes(String(movie._id));

          if (previewOnly || !isApproved) {
            logs.push({
              movieId: movie._id,
              title: movie.title,
              year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
              previousStatus: currentStatus,
              proposedStatus,
              action: previewOnly ? 'preview_available' : 'awaiting_approval',
              isUncertain,
              candidate: {
                videoId: searchResult.videoId,
                title: searchResult.title,
                channel: searchResult.channelTitle,
                thumbnail: searchResult.thumbnail,
                isOfficial: searchResult.isOfficial,
                confidence: searchResult.confidence,
                source: searchResult.source,
              },
              reason: isCurrentBroken
                ? 'Broken / 404 video ID replaced'
                : isCurrentMismatched
                ? 'Mismatched trailer replaced'
                : 'Trailer updated',
            });
            if (!isUncertain) {
              trailersRepaired++;
            }
          } else {
            // Persist to MongoDB
            Object.assign(movie, proposedData);
            await movie.save();
            assignedVideoIds.add(searchResult.videoId);
            trailersRepaired++;

            logs.push({
              movieId: movie._id,
              title: movie.title,
              year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
              status: proposedStatus,
              action: 'repaired',
              candidate: {
                videoId: searchResult.videoId,
                title: searchResult.title,
                channel: searchResult.channelTitle,
                thumbnail: searchResult.thumbnail,
                isOfficial: searchResult.isOfficial,
              },
              reason: isCurrentBroken
                ? 'Broken / 404 video ID replaced'
                : isCurrentMismatched
                ? 'Mismatched trailer replaced'
                : 'Trailer verified & saved',
            });
          }
        } else {
          // No trailer available
          stillMissing++;
          if (!previewOnly) {
            movie.trailerStatus = 'missing';
            movie.trailerLastCheckedAt = new Date();
            await movie.save();
          }

          logs.push({
            movieId: movie._id,
            title: movie.title,
            year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
            status: 'missing',
            action: 'missing',
            reason: searchResult?.message || 'No accessible trailer found; movie poster fallback will be shown.',
          });
        }

        // Small pause between evaluations
        await new Promise((r) => setTimeout(r, 60));
      } catch (movieErr) {
        failedCount++;
        logs.push({
          movieId: movie._id,
          title: movie.title,
          status: 'error',
          action: 'error',
          error: movieErr.message,
        });
      }
    }

    return successResponse(
      res,
      previewOnly ? 'Bulk trailer repair scan completed (preview mode)' : 'Bulk trailer repair completed successfully',
      {
        previewOnly,
        summary: {
          totalChecked,
          trailersRepaired,
          alreadyValid,
          uncertainMatches,
          stillMissing,
          failedCount,
        },
        logs,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Legacy bulk search & sync for all movies missing trailers or needing review.
 */
const bulkSyncTrailers = async (req, res, next) => {
  return bulkRepairTrailers(req, res, next);
};

module.exports = {
  getTrailers,
  getConfigStatus,
  getTrailerStats,
  searchMovieTrailer,
  lookupTrailerQuery,
  assignMovieTrailer,
  removeMovieTrailer,
  bulkSyncTrailers,
  bulkRepairTrailers,
};
