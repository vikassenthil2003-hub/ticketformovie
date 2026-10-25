const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const theatreImportService = require('../services/theatreImportService');
const { getLocalDateString } = require('../utils/dateUtils');

// Haversine formula distance calculation in kilometers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
};

/**
 * Attaches movies and active showtimes for each theatre on a given date.
 * Groups showtimes by movie (BookMyShow-style cinema directory).
 */
const attachShowsToTheatres = async (theatres, dateStr, movieIdFilter = null) => {
  if (!theatres || theatres.length === 0) return [];
  const queryDate = dateStr || getLocalDateString(0);
  const theatreIds = theatres.map((t) => t._id);

  const showQuery = {
    theatreId: { $in: theatreIds },
    date: queryDate,
    status: 'scheduled',
  };

  if (movieIdFilter && movieIdFilter !== 'All') {
    showQuery.movieId = movieIdFilter;
  }

  const shows = await Show.find(showQuery)
    .populate('movieId', 'title slug posterUrl language duration certification formats rating')
    .sort({ startTime: 1 })
    .lean();

  // Group shows by theatreId -> movieId
  const theatreShowsMap = new Map();
  for (const show of shows) {
    if (!show.theatreId || !show.movieId) continue;
    const tid = show.theatreId.toString();
    const mid = (show.movieId._id || show.movieId).toString();

    if (!theatreShowsMap.has(tid)) {
      theatreShowsMap.set(tid, new Map());
    }
    const movieGroup = theatreShowsMap.get(tid);
    if (!movieGroup.has(mid)) {
      movieGroup.set(mid, {
        movie: show.movieId,
        shows: [],
      });
    }
    movieGroup.get(mid).shows.push({
      _id: show._id,
      startTime: show.startTime,
      endTime: show.endTime,
      format: show.format,
      language: show.language,
      pricing: show.pricing,
      screenName: show.screenId?.name || 'Screen',
      isDemoData: Boolean(show.isDemoData),
    });
  }

  let enriched = theatres.map((th) => {
    const tid = th._id.toString();
    const movieGroup = theatreShowsMap.get(tid);
    const movies = movieGroup ? Array.from(movieGroup.values()) : [];
    const totalShowsCount = movies.reduce((acc, m) => acc + m.shows.length, 0);

    return {
      ...th,
      queryDate,
      movies,
      hasShows: movies.length > 0,
      totalShowsCount,
    };
  });

  if (movieIdFilter && movieIdFilter !== 'All') {
    enriched = enriched.filter((th) => th.hasShows);
  }

  return enriched;
};

/**
 * Get theatres by district, city, area, verificationStatus, or search
 * Supports pagination, date filtering, and movies-per-theatre attachment across Tamil Nadu
 */
const getTheatres = async (req, res, next) => {
  try {
    const {
      state,
      district,
      city,
      search,
      pinCode,
      amenity,
      verificationStatus,
      isActive,
      date,
      movie,
      movieId,
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    } else {
      query.isActive = true;
    }

    if (state && state !== 'All') {
      query.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
    }

    if (district && district !== 'All') {
      query.district = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
    }

    if (city && city !== 'All') {
      query.city = { $regex: new RegExp(`^${city.trim()}$`, 'i') };
    }

    if (pinCode) {
      query.pinCode = pinCode.trim();
    }

    if (verificationStatus && verificationStatus !== 'All') {
      query.verificationStatus = verificationStatus;
    }

    if (amenity && amenity !== 'All') {
      query.amenities = { $in: [amenity] };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { address: { $regex: s, $options: 'i' } },
        { city: { $regex: s, $options: 'i' } },
        { district: { $regex: s, $options: 'i' } },
        { state: { $regex: s, $options: 'i' } },
        { locality: { $regex: s, $options: 'i' } },
        { pinCode: { $regex: s, $options: 'i' } },
      ];
    }

    const queryDate = date || getLocalDateString(0);
    const targetMovieId = movieId || movie;

    // Filter by movie if requested
    if (targetMovieId && targetMovieId !== 'All') {
      const theatreIdsWithMovie = await Show.distinct('theatreId', {
        movieId: targetMovieId,
        date: queryDate,
        status: 'scheduled',
      });
      query._id = { $in: theatreIdsWithMovie };
    } else if (req.query.hasShows === 'true' || req.query.hasShows === true) {
      const theatreIdsWithShows = await Show.distinct('theatreId', {
        date: queryDate,
        status: 'scheduled',
      });
      query._id = { $in: theatreIdsWithShows };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 100, 200);
    const skip = (pageNum - 1) * limitNum;

    const total = await Theatre.countDocuments(query);
    const rawTheatres = await Theatre.find(query)
      .sort({ verificationStatus: 1, rating: -1, name: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Attach active shows and movies playing for the selected date
    const enrichedTheatres = await attachShowsToTheatres(rawTheatres, queryDate, targetMovieId);

    return successResponse(res, 'Theatres fetched successfully', {
      theatres: enrichedTheatres,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
      queryDate: date || getLocalDateString(0),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Nearby Theatres Search (GeoJSON Geospatial query with radius expansion)
 * Radius: starts at specified radius (5 to 100 km), auto-expands if no results
 */
const getNearbyTheatres = async (req, res, next) => {
  try {
    const { lat, lng, radius = 25, state, district, verificationStatus } = req.query;

    if (!lat || !lng) {
      return errorResponse(res, 'Latitude (lat) and Longitude (lng) are required for nearby search', 400);
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return errorResponse(res, 'Invalid coordinates provided', 400);
    }

    const searchRadiusKm = parseFloat(radius) || 25;
    const radiusTiers = [searchRadiusKm, 50, 100];
    let matchedTheatres = [];
    let effectiveRadius = searchRadiusKm;

    const baseFilter = { isActive: true };
    if (state && state !== 'All') {
      baseFilter.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
    }
    if (district && district !== 'All') {
      baseFilter.district = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
    }
    if (verificationStatus && verificationStatus !== 'All') {
      baseFilter.verificationStatus = verificationStatus;
    }

    for (const currentRadius of radiusTiers) {
      try {
        const radiusMeters = currentRadius * 1000;
        const results = await Theatre.find({
          ...baseFilter,
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [userLng, userLat],
              },
              $maxDistance: radiusMeters,
            },
          },
        }).lean();

        if (results && results.length > 0) {
          matchedTheatres = results.map((theatre) => {
            const distance = calculateDistance(
              userLat,
              userLng,
              theatre.location.coordinates[1],
              theatre.location.coordinates[0]
            );
            return {
              ...theatre,
              distanceKm: distance,
            };
          });
          effectiveRadius = currentRadius;
          break;
        }
      } catch (geoErr) {
        console.warn('[Geo Warning] Manual distance fallback:', geoErr.message);
        const allTheatres = await Theatre.find(baseFilter).lean();
        matchedTheatres = allTheatres
          .map((th) => ({
            ...th,
            distanceKm: calculateDistance(
              userLat,
              userLng,
              th.location.coordinates[1],
              th.location.coordinates[0]
            ),
          }))
          .filter((th) => th.distanceKm <= currentRadius)
          .sort((a, b) => a.distanceKm - b.distanceKm);

        if (matchedTheatres.length > 0) {
          effectiveRadius = currentRadius;
          break;
        }
      }
    }

    // If still empty within radius, return closest available in Tamil Nadu
    if (matchedTheatres.length === 0) {
      const allTheatres = await Theatre.find({ isActive: true }).lean();
      matchedTheatres = allTheatres
        .map((th) => ({
          ...th,
          distanceKm: calculateDistance(
            userLat,
            userLng,
            th.location.coordinates[1],
            th.location.coordinates[0]
          ),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 6);
      effectiveRadius = 'closest_available';
    }

    // Enrich nearby theatres with shows and movies for the given date
    const targetMovieId = req.query.movieId || req.query.movie;
    const enrichedTheatres = await attachShowsToTheatres(matchedTheatres, req.query.date, targetMovieId);

    return successResponse(res, `Found ${enrichedTheatres.length} theatres nearby`, {
      theatres: enrichedTheatres,
      effectiveRadiusKm: effectiveRadius,
      userCoordinates: { lat: userLat, lng: userLng },
      queryDate: req.query.date || getLocalDateString(0),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Theatre by ID with active movies and showtimes
 */
const getTheatreById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return errorResponse(res, 'Theatre not found', 404);
    }
    const theatre = await Theatre.findById(id).lean();
    if (!theatre) {
      return errorResponse(res, 'Theatre not found', 404);
    }

    const queryDate = req.query.date || getLocalDateString(0);
    const [enriched] = await attachShowsToTheatres([theatre], queryDate);

    return successResponse(res, 'Theatre details retrieved', enriched || theatre);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Tamil Nadu District Coverage & Summary
 * GET /api/v1/theatres/districts
 */
const getDistrictsSummary = async (req, res, next) => {
  try {
    const tnStats = await theatreImportService.getTamilNaduCoverageStats();
    const allIndiaStats = await theatreImportService.getAllIndiaCoverageStats();

    return successResponse(res, 'Theatre coverage statistics retrieved', {
      ...allIndiaStats,
      tamilNaduSummary: tnStats,
      districts: tnStats.districts, // preserved for backwards compatibility with existing UI
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create Theatre
 */
const createTheatre = async (req, res, next) => {
  try {
    const {
      name,
      brand,
      address,
      addressLine,
      city,
      district,
      locality,
      town,
      state,
      pinCode,
      pincode,
      coordinates,
      location,
      amenities,
      contactPhone,
      phone,
      verificationStatus,
    } = req.body;

    const finalAddress = address || addressLine;
    const finalPinCode = pinCode || pincode || '';
    const finalPhone = contactPhone || phone || '+91 44 2855 0000';
    let finalCoords = coordinates;

    if (!finalCoords && location && location.coordinates) {
      finalCoords = location.coordinates;
    }

    if (!name || !finalAddress || !city || !finalCoords) {
      return errorResponse(
        res,
        'Name, address, city, and coordinates [longitude, latitude] are required',
        400
      );
    }

    const inferredDist = district || theatreImportService.inferDistrict(finalCoords[1], finalCoords[0], city);

    const theatre = new Theatre({
      name,
      brand: brand || 'CineVerse Partner',
      address: finalAddress,
      city,
      district: inferredDist,
      locality: locality || '',
      town: town || '',
      state: state || 'Tamil Nadu',
      pinCode: finalPinCode,
      location: {
        type: 'Point',
        coordinates: [Number(finalCoords[0]), Number(finalCoords[1])],
      },
      amenities: Array.isArray(amenities)
        ? amenities
        : typeof amenities === 'string'
        ? amenities.split(',').map((s) => s.trim())
        : ['Dolby Atmos', 'Recliner Seats', 'Parking'],
      contactPhone: finalPhone,
      isDemoData: false,
      verificationStatus: verificationStatus || 'verified',
      source: 'manual_admin',
      verificationNotes: 'Manually created by authorized administrator.',
    });

    await theatre.save();
    return successResponse(res, 'Theatre created successfully', theatre, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update Theatre
 */
const updateTheatre = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    // Support both addressLine & pincode synonyms
    if (body.addressLine && !body.address) body.address = body.addressLine;
    if (body.pincode && !body.pinCode) body.pinCode = body.pincode;
    if (body.phone && !body.contactPhone) body.contactPhone = body.phone;
    if (body.longitude && body.latitude) {
      body.location = {
        type: 'Point',
        coordinates: [Number(body.longitude), Number(body.latitude)],
      };
    }

    const theatre = await Theatre.findByIdAndUpdate(id, body, { new: true });
    if (!theatre) {
      return errorResponse(res, 'Theatre not found', 404);
    }
    return successResponse(res, 'Theatre updated successfully', theatre);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete Theatre
 */
const deleteTheatre = async (req, res, next) => {
  try {
    const { id } = req.params;
    const theatre = await Theatre.findByIdAndDelete(id);
    if (!theatre) {
      return errorResponse(res, 'Theatre not found', 404);
    }
    return successResponse(res, 'Theatre deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Toggle Verification Status
 * PATCH /api/v1/admin/theatres/:id/verify
 */
const toggleVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['verified', 'unverified', 'pending_review', 'inactive'].includes(status)) {
      return errorResponse(res, 'Status must be verified, unverified, pending_review, or inactive', 400);
    }

    const updated = await theatreImportService.setTheatreVerification(id, status, notes);
    return successResponse(res, `Theatre marked as ${status}`, updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Detect Suspected Duplicates
 * GET /api/v1/admin/theatres/duplicates
 */
const getDuplicateTheatres = async (req, res, next) => {
  try {
    const result = await theatreImportService.detectSuspectedDuplicates();
    return successResponse(res, 'Suspected duplicate theatres detected', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Import Theatre Data
 * POST /api/v1/admin/theatres/import
 * Supports modes: 'curated' | 'national' | 'osm' | 'google_places' | 'all'
 */
const importTheatres = async (req, res, next) => {
  try {
    const { mode = 'curated', limit = 0, forceSnapshot = false, state, district } = req.body;

    let curatedReport = null;
    let nationalReport = null;
    let osmReport = null;
    let googlePlacesReport = null;

    if (mode === 'curated' || mode === 'all') {
      curatedReport = await theatreImportService.importCuratedTheatres();
    }

    if (mode === 'national' || mode === 'all') {
      nationalReport = await theatreImportService.importAllIndiaTheatres();
    }

    if (mode === 'osm' || mode === 'all') {
      osmReport = await theatreImportService.importFromOpenStreetMap({ limit, forceSnapshot });
    }

    if (mode === 'google_places') {
      googlePlacesReport = await theatreImportService.importFromGooglePlaces({ state, district });
    }

    const coverage = await theatreImportService.getAllIndiaCoverageStats();

    return successResponse(res, 'Theatre data import completed', {
      mode,
      curatedReport,
      nationalReport,
      osmReport,
      googlePlacesReport,
      coverage,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTheatres,
  getNearbyTheatres,
  getTheatreById,
  getDistrictsSummary,
  createTheatre,
  updateTheatre,
  deleteTheatre,
  toggleVerification,
  getDuplicateTheatres,
  importTheatres,
};
