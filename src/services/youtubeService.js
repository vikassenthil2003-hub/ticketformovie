const verifiedRegistry = require('../data/verifiedTrailersRegistry');

/**
 * CineVerse AI — YouTube Data API v3 & Intelligent Trailer Discovery Service
 * 
 * Legitimate, safe trailer discovery engine using official YouTube Data API v3
 * with backend-only key isolation, tiered search ordering, multi-resolution
 * thumbnail resolution (maxresdefault -> hqdefault -> mqdefault), verified
 * movie-matching heuristics, and graceful fallback to verified official registries.
 */

const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

// Negative keywords to filter out unwanted non-trailer content
const NEGATIVE_KEYWORDS = [
  'full movie', 'full film', 'audio jukebox', 'jukebox', 'song', 'lyric', 'lyrics',
  'video song', 'bgm', 'theme music', 'ost', 'reaction', 'reacting', 'review',
  'scene', 'climax', 'comedy scene', 'status', 'whatsapp status', 'fan made',
  'parody', 'spoof', 'interview', 'press meet', 'audio launch', 'success meet',
  'pre release event', 'spoiler', 'ending explained', 'unboxing', 'gameplay',
  'tribute', 'shorts', 'reels', 'remix'
];

// Production houses and verified music labels for priority scoring
const OFFICIAL_CHANNELS = [
  'sun tv', 'sun pictures', 'sony music', 'sony music south', 'raaj kamal',
  'tips official', 'tips tamil', 'think music', 'think music india', 'lyca productions',
  'mythri movie makers', 'vyjayanthi network', 'hombale films', 'red chillies',
  'maddock films', 'jio studios', 'warner bros', 'universal pictures',
  'marvel studios', 'paramount pictures', 'disney', 'zee studios', 'zee music',
  'saregama', 'saregama tamil', 'saregama telugu', 'lahari music', 't-series',
  'dharma productions', 'yash raj films', 'ags entertainment', 'passion studios',
  '2d entertainment', 'stone bench', 'junglee music', 'junglee music tamil',
  'dvv entertainment', 'bhavana studios', 'parava films', 'visual romance',
  'prime video', 'netflix india'
];

/**
 * Checks whether the YouTube Data API key is configured in the environment.
 */
const isApiKeyConfigured = () => {
  const key = process.env.YOUTUBE_API_KEY;
  return Boolean(key && key.trim().length > 10 && !key.includes('your_youtube_api_key'));
};

/**
 * Extracts an 11-character YouTube Video ID from any standard URL or ID string.
 */
const extractVideoId = (input) => {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|(?:youtube\.com|youtube-nocookie\.com)\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  return match ? match[1] : '';
};

/**
 * Validates whether a string is a syntactically valid YouTube 11-char video ID.
 */
const validateVideoId = (videoId) => {
  if (!videoId || typeof videoId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId.trim());
};

/**
 * Normalizes title for comparing words and tokens.
 */
const normalizeTitle = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[:\-–—]/g, ' ')
    .replace(/\bpart\s+[1i]\b/gi, '1')
    .replace(/\bpart\s+[2ii]\b/gi, '2')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Constructs search queries in priority order according to specification:
 * 1. Movie title + release year + official trailer
 * 2. Movie title + language + trailer
 * 3. Movie title + trailer
 */
const getSearchQueries = (title, year = null, language = null) => {
  const cleanTitle = (title || '').trim();
  const queries = [];

  // Tier 1: Movie title + release year + official trailer
  if (year) {
    queries.push({ tier: 1, query: `${cleanTitle} ${year} official trailer`.trim() });
  } else {
    queries.push({ tier: 1, query: `${cleanTitle} official trailer`.trim() });
  }

  // Tier 2: Movie title + language + trailer
  const langStr = Array.isArray(language) ? language[0] : language;
  if (langStr && langStr.toLowerCase() !== 'all' && langStr.toLowerCase() !== 'english') {
    queries.push({ tier: 2, query: `${cleanTitle} ${langStr} trailer`.trim() });
  } else if (langStr) {
    queries.push({ tier: 2, query: `${cleanTitle} trailer`.trim() });
  }

  // Tier 3: Movie title + trailer
  queries.push({ tier: 3, query: `${cleanTitle} trailer`.trim() });

  // Deduplicate query strings while preserving tier priority
  const seen = new Set();
  return queries.filter((q) => {
    if (seen.has(q.query.toLowerCase())) return false;
    seen.add(q.query.toLowerCase());
    return true;
  });
};

/**
 * Legacy wrapper for backward compatibility.
 */
const buildSearchQuery = (title, year = null, language = null) => {
  const queries = getSearchQueries(title, year, language);
  return queries[0]?.query || `${title} official trailer`;
};

/**
 * Scores a YouTube search result to match movie title, release year, language,
 * and differentiate official trailers from relevant non-official trailers.
 * Rejects unrelated videos.
 */
const scoreResult = (item, movieTitle, movieLanguage, movieYear = null) => {
  const title = (item.snippet?.title || '').toLowerCase();
  const channel = (item.snippet?.channelTitle || '').toLowerCase();
  const desc = (item.snippet?.description || '').toLowerCase();
  const normMovieTitle = normalizeTitle(movieTitle);
  const titleTokens = normMovieTitle.split(' ').filter((t) => t.length > 1);

  let score = 0;
  let matchesTitle = false;

  // Strict title match check
  if (title.includes(normMovieTitle)) {
    score += 50;
    matchesTitle = true;
  } else {
    // Check token overlap
    const matchedTokens = titleTokens.filter((token) => title.includes(token));
    const tokenRatio = matchedTokens.length / Math.max(titleTokens.length, 1);
    if (tokenRatio >= 0.7) {
      score += Math.round(40 * tokenRatio);
      matchesTitle = true;
    } else if (tokenRatio >= 0.5) {
      score += 20;
      matchesTitle = true;
    }
  }

  // If candidate title does not contain the movie title tokens, reject strongly
  if (!matchesTitle) {
    return { score: -100, matchesTitle: false, isOfficialChannel: false };
  }

  // Contains "official" and "trailer"
  if (title.includes('official') && title.includes('trailer')) {
    score += 30;
  } else if (title.includes('official') && (title.includes('teaser') || title.includes('glimpse') || title.includes('showcase'))) {
    score += 22;
  } else if (title.includes('trailer')) {
    score += 18;
  } else if (title.includes('teaser') || title.includes('glimpse') || title.includes('showcase')) {
    score += 12;
  }

  // Release year match if available
  if (movieYear) {
    const yrStr = String(movieYear);
    if (title.includes(yrStr) || desc.includes(yrStr)) {
      score += 15;
    }
  }

  // Language match
  if (movieLanguage) {
    const langLower = String(Array.isArray(movieLanguage) ? movieLanguage[0] : movieLanguage).toLowerCase();
    if (title.includes(langLower) || desc.includes(langLower)) {
      score += 10;
    }
  }

  // Official Channel Bonus
  let isOfficialChannel = false;
  for (const oc of OFFICIAL_CHANNELS) {
    if (channel.includes(oc)) {
      score += 25;
      isOfficialChannel = true;
      break;
    }
  }

  // Penalize negative non-trailer keywords
  for (const neg of NEGATIVE_KEYWORDS) {
    if (title.includes(neg)) {
      score -= 40;
    }
  }

  return { score, matchesTitle, isOfficialChannel };
};

/**
 * Actively checks video accessibility & public embeddability via YouTube oEmbed and HTTP HEAD.
 */
const checkVideoAccessibility = async (videoId) => {
  const cleanId = extractVideoId(videoId);
  if (!validateVideoId(cleanId)) {
    return { accessible: false, reason: 'invalid_format' };
  }

  // 1. Check via YouTube official oEmbed
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${cleanId}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        accessible: true,
        videoId: cleanId,
        title: data.title || '',
        author: data.author_name || '',
      };
    } else if (res.status === 404 || res.status === 401 || res.status === 403) {
      return { accessible: false, status: res.status, reason: 'not_found_or_restricted' };
    }
  } catch (err) {
    // Timeout or network glitch — proceed to thumbnail HEAD check
  }

  // 2. Fallback check: HEAD on standard thumbnail
  try {
    const thumbUrl = `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
    const res = await fetch(thumbUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return { accessible: true, videoId: cleanId };
    }
    return { accessible: false, status: res.status, reason: 'thumbnail_404' };
  } catch (err) {
    return { accessible: false, error: err.message };
  }
};

/**
 * Resolves the best available YouTube thumbnail resolution:
 * maxresdefault.jpg (1280x720) -> hqdefault.jpg (480x360) -> mqdefault.jpg (320x180).
 */
const getThumbnailResolutions = async (videoId) => {
  const cleanId = extractVideoId(videoId);
  if (!cleanId) return null;

  const maxresUrl = `https://i.ytimg.com/vi/${cleanId}/maxresdefault.jpg`;
  const hqUrl = `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;
  const mqUrl = `https://i.ytimg.com/vi/${cleanId}/mqdefault.jpg`;

  let primary = hqUrl;
  try {
    const res = await fetch(maxresUrl, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      primary = maxresUrl;
    }
  } catch {
    primary = hqUrl;
  }

  return {
    primary,
    maxres: maxresUrl,
    hq: hqUrl,
    mq: mqUrl,
    resolutions: [maxresUrl, hqUrl, mqUrl],
  };
};

/**
 * Searches for a movie trailer via YouTube Data API v3 or verified registry.
 * Executes queries in tiered order and accepts both official and relevant non-official trailers.
 */
const searchYouTubeTrailer = async (title, year = null, language = null, options = {}) => {
  if (!title) {
    return { success: false, message: 'Movie title is required.' };
  }

  // 1. Check local verified registry first for immediate, high-fidelity match
  const verifiedMatch = verifiedRegistry.findVerifiedTrailer(title, year, language);
  if (verifiedMatch && !options.forceLiveSearch) {
    return {
      success: true,
      source: 'official_curated',
      confidence: 'high',
      videoId: verifiedMatch.trailerVideoId,
      trailerUrl: verifiedMatch.trailerUrl,
      title: verifiedMatch.trailerTitle,
      channelTitle: verifiedMatch.officialChannel,
      thumbnail: verifiedMatch.thumbnail,
      embedUrl: `https://www.youtube-nocookie.com/embed/${verifiedMatch.trailerVideoId}`,
      isOfficial: true,
      status: 'verified',
    };
  }

  // 2. Check if YouTube API Key is available
  if (!isApiKeyConfigured()) {
    if (verifiedMatch) {
      return {
        success: true,
        source: 'official_curated',
        confidence: 'high',
        videoId: verifiedMatch.trailerVideoId,
        trailerUrl: verifiedMatch.trailerUrl,
        title: verifiedMatch.trailerTitle,
        channelTitle: verifiedMatch.officialChannel,
        thumbnail: verifiedMatch.thumbnail,
        embedUrl: `https://www.youtube-nocookie.com/embed/${verifiedMatch.trailerVideoId}`,
        isOfficial: true,
        status: 'verified',
      };
    }
    return {
      success: false,
      fallbackMode: true,
      message: 'YouTube Data API key is not configured in backend/.env. Falling back to local verified cinema registry.',
      setupInstructions: 'To enable live YouTube searches, add YOUTUBE_API_KEY=your_key_here to backend/.env and restart.',
    };
  }

  // 3. Multi-tier search execution using YouTube Data API v3
  const searchQueries = getSearchQueries(title, year, language);
  const apiKey = process.env.YOUTUBE_API_KEY.trim();

  let bestCandidate = null;
  let highestScore = -1;

  try {
    for (const { tier, query } of searchQueries) {
      const url = new URL(YOUTUBE_SEARCH_URL);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('q', query);
      url.searchParams.set('type', 'video');
      url.searchParams.set('videoEmbeddable', 'true');
      url.searchParams.set('maxResults', '5');
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const isQuota = response.status === 403 && JSON.stringify(errData).includes('quota');
        if (isQuota) {
          throw { isQuota: true, message: 'YouTube API daily quota exceeded.' };
        }
        continue;
      }

      const data = await response.json();
      const items = data?.items || [];
      if (items.length === 0) continue;

      // Score items in this tier
      for (const item of items) {
        const videoId = item.id?.videoId;
        if (!videoId || !validateVideoId(videoId)) continue;

        const { score, matchesTitle, isOfficialChannel } = scoreResult(item, title, language, year);
        if (score > highestScore && matchesTitle && score >= 20) {
          highestScore = score;
          bestCandidate = {
            item,
            score,
            videoId,
            tier,
            isOfficialChannel,
          };
        }
      }

      // If we found a high-confidence official trailer in Tier 1 or 2, stop early
      if (bestCandidate && bestCandidate.score >= 60) {
        break;
      }
    }

    if (!bestCandidate) {
      if (verifiedMatch) {
        return {
          success: true,
          source: 'official_curated',
          confidence: 'high',
          videoId: verifiedMatch.trailerVideoId,
          trailerUrl: verifiedMatch.trailerUrl,
          title: verifiedMatch.trailerTitle,
          channelTitle: verifiedMatch.officialChannel,
          thumbnail: verifiedMatch.thumbnail,
          embedUrl: `https://www.youtube-nocookie.com/embed/${verifiedMatch.trailerVideoId}`,
          isOfficial: true,
          status: 'verified',
        };
      }
      return {
        success: false,
        message: `No accessible or relevant trailer found for "${title}".`,
      };
    }

    const { videoId, score, item, isOfficialChannel } = bestCandidate;

    // Check accessibility & get resolution thumbnails
    const [accessInfo, thumbInfo] = await Promise.all([
      checkVideoAccessibility(videoId),
      getThumbnailResolutions(videoId),
    ]);

    if (!accessInfo.accessible) {
      if (verifiedMatch) {
        return {
          success: true,
          source: 'official_curated',
          confidence: 'high',
          videoId: verifiedMatch.trailerVideoId,
          trailerUrl: verifiedMatch.trailerUrl,
          title: verifiedMatch.trailerTitle,
          channelTitle: verifiedMatch.officialChannel,
          thumbnail: verifiedMatch.thumbnail,
          embedUrl: `https://www.youtube-nocookie.com/embed/${verifiedMatch.trailerVideoId}`,
          isOfficial: true,
          status: 'verified',
        };
      }
      return {
        success: false,
        message: `Video ID for "${title}" is unavailable or restricted on YouTube.`,
      };
    }

    // Determine official vs available status
    const isOfficial = isOfficialChannel || score >= 60 || (item.snippet?.title || '').toLowerCase().includes('official trailer');
    const status = isOfficial ? 'verified' : score >= 35 ? 'available' : 'needs_review';
    const confidence = isOfficial ? 'high' : score >= 35 ? 'medium' : 'needs_review';

    return {
      success: true,
      source: 'youtube_api',
      confidence,
      status,
      videoId,
      trailerUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: item.snippet?.title || accessInfo.title || `${title} Trailer`,
      channelTitle: item.snippet?.channelTitle || accessInfo.author || 'YouTube Channel',
      thumbnail: thumbInfo?.primary || item.snippet?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      thumbnailResolutions: thumbInfo?.resolutions || [],
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      isOfficial,
      score,
    };
  } catch (err) {
    const isQuota = err.isQuota || (err.response?.status === 403 && JSON.stringify(err.response?.data).includes('quota'));
    const errMsg = isQuota
      ? 'YouTube API daily quota exceeded. Retaining saved trailers & falling back to verified cinema registry.'
      : err.message || 'YouTube search request failed.';

    if (verifiedMatch) {
      return {
        success: true,
        source: 'official_curated',
        confidence: 'high',
        videoId: verifiedMatch.trailerVideoId,
        trailerUrl: verifiedMatch.trailerUrl,
        title: verifiedMatch.trailerTitle,
        channelTitle: verifiedMatch.officialChannel,
        thumbnail: verifiedMatch.thumbnail,
        embedUrl: `https://www.youtube-nocookie.com/embed/${verifiedMatch.trailerVideoId}`,
        isOfficial: true,
        status: 'verified',
        warning: errMsg,
        isQuota,
      };
    }

    return {
      success: false,
      error: errMsg,
      isQuota,
      message: errMsg,
    };
  }
};

/**
 * Finds and resolves the best trailer for a Movie document.
 */
const findBestTrailerForMovie = async (movie, options = {}) => {
  if (!movie) return null;
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const lang = Array.isArray(movie.language) ? movie.language[0] : movie.language;
  return searchYouTubeTrailer(movie.title, year, lang, options);
};

/**
 * Verifies and fetches details for an arbitrary YouTube video ID.
 */
const verifyVideoId = async (videoId) => {
  const cleanId = extractVideoId(videoId);
  if (!validateVideoId(cleanId)) {
    return { valid: false, message: 'Invalid 11-character YouTube Video ID format.' };
  }

  // 1. Check registry
  const reg = verifiedRegistry.getVerifiedTrailerByVideoId(cleanId);
  if (reg) {
    return {
      valid: true,
      videoId: cleanId,
      title: reg.trailerTitle,
      channelTitle: reg.officialChannel,
      thumbnail: reg.thumbnail,
      embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}`,
      source: 'official_curated',
      isOfficial: true,
    };
  }

  // 2. Check active accessibility
  const access = await checkVideoAccessibility(cleanId);
  if (!access.accessible) {
    return {
      valid: false,
      videoId: cleanId,
      message: 'Video is unavailable, deleted, or restricted on YouTube.',
      status: access.status || 404,
    };
  }

  const thumbInfo = await getThumbnailResolutions(cleanId);

  return {
    valid: true,
    videoId: cleanId,
    title: access.title || 'YouTube Trailer',
    channelTitle: access.author || 'YouTube Channel',
    thumbnail: thumbInfo?.primary || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
    thumbnailResolutions: thumbInfo?.resolutions || [],
    embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}`,
    source: 'youtube_verified',
    isOfficial: false,
  };
};

module.exports = {
  isApiKeyConfigured,
  extractVideoId,
  validateVideoId,
  getSearchQueries,
  buildSearchQuery,
  scoreResult,
  checkVideoAccessibility,
  getThumbnailResolutions,
  searchYouTubeTrailer,
  findBestTrailerForMovie,
  verifyVideoId,
};
