const Show = require('../models/Show');
const Screen = require('../models/Screen');
const Theatre = require('../models/Theatre');
const Movie = require('../models/Movie');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const {
  DEFAULT_TIMEZONE,
  getNowInTimezone,
  getLocalDateString,
  timeToMinutes,
  compareShowtimes,
  isShowInPast,
  calculateEndTime,
  isValidDateString,
} = require('../utils/dateUtils');

/**
 * Flexible location matcher supporting district, city, town, locality, and address substrings.
 */
const matchesLocation = (theatre, locQuery) => {
  if (!theatre || !locQuery || locQuery === 'All' || locQuery === '') return true;
  const q = locQuery.toLowerCase().trim();
  const city = (theatre.city || '').toLowerCase().trim();
  const district = (theatre.district || '').toLowerCase().trim();
  const locality = (theatre.locality || '').toLowerCase().trim();
  const town = (theatre.town || '').toLowerCase().trim();
  const address = (theatre.address || '').toLowerCase().trim();

  return (
    city === q ||
    district === q ||
    locality === q ||
    town === q ||
    city.includes(q) ||
    q.includes(city) ||
    district.includes(q) ||
    q.includes(district) ||
    address.includes(q)
  );
};

/**
 * Get shows filtered by date, movie, theatre, city/district
 * Chronologically sorted, past shows on Today filtered out.
 */
const getShows = async (req, res, next) => {
  try {
    const { movieId, theatreId, date, city, district, format, includePast = 'false' } = req.query;
    const shouldIncludePast = includePast === 'true';

    const nowInfo = getNowInTimezone(DEFAULT_TIMEZONE);
    const serverDate = nowInfo.dateStr;
    const targetDate = date && date !== 'all' ? date : date === 'all' ? null : serverDate;

    const query = { status: { $ne: 'cancelled' } };
    if (targetDate) {
      query.date = targetDate;
    }
    if (movieId) query.movieId = movieId;
    if (theatreId) query.theatreId = theatreId;
    if (format) query.format = format;

    let shows = await Show.find(query)
      .populate('movieId', 'title posterUrl bannerUrl duration certification language genre formats rating')
      .populate('theatreId', 'name brand address city district locality pinCode amenities rating location verificationStatus')
      .populate('screenId', 'name screenNumber projectionType soundSystem totalCapacity')
      .lean();

    // Filter by city or district if supplied
    const locFilter = city || district;
    if (locFilter && locFilter !== 'All') {
      shows = shows.filter((show) => matchesLocation(show.theatreId, locFilter));
    }

    const totalRawShows = shows.length;
    let todayShowsEnded = false;
    let isPastDate = false;

    if (targetDate) {
      if (targetDate < serverDate && !shouldIncludePast) {
        isPastDate = true;
        todayShowsEnded = true;
        shows = [];
      } else if (targetDate === serverDate && !shouldIncludePast) {
        // Today: Only keep showtimes that have not started yet!
        shows = shows.filter((s) => !isShowInPast(s.date, s.startTime));
        if (totalRawShows > 0 && shows.length === 0) {
          todayShowsEnded = true;
        }
      }
    }

    // Sort chronologically using minutes
    shows.sort((a, b) => compareShowtimes(a.startTime, b.startTime));

    return successResponse(res, `Shows ${targetDate ? `for date ${targetDate}` : 'retrieved'}`, {
      date: targetDate || 'all',
      serverDate,
      serverTime: nowInfo.isoString,
      timeZone: DEFAULT_TIMEZONE,
      isToday: targetDate === serverDate,
      isPastDate,
      todayShowsEnded,
      totalShows: shows.length,
      shows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get shows for a movie grouped by theatre for movie detail page
 * Provides live upcoming shows, filters out expired shows for Today,
 * and passes availableDates metadata for BookMyShow dynamic tabs.
 */
const getShowsForMovie = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { date, city, district, includePast = 'false' } = req.query;
    const shouldIncludePast = includePast === 'true';

    const nowInfo = getNowInTimezone(DEFAULT_TIMEZONE);
    const serverDate = nowInfo.dateStr;
    const targetDate = date || serverDate;

    const query = {
      movieId,
      date: targetDate,
      status: { $ne: 'cancelled' },
    };

    const [allShowsForDate, availableDatesRaw] = await Promise.all([
      Show.find(query)
        .populate('theatreId', 'name brand address city district locality pinCode amenities rating location verificationStatus')
        .populate('screenId', 'name screenNumber projectionType soundSystem')
        .lean(),
      Show.distinct('date', {
        movieId,
        status: { $ne: 'cancelled' },
        date: { $gte: serverDate }, // Only dates from Today onwards!
      }),
    ]);

    const availableDates = (availableDatesRaw || []).filter(isValidDateString).sort();

    // Ensure Today and Tomorrow appear in availableDates list if they have shows
    const locFilter = city || district;
    const totalRawShows = allShowsForDate.length;
    let activeShows = allShowsForDate;
    let todayShowsEnded = false;
    let isPastDate = false;

    if (targetDate < serverDate && !shouldIncludePast) {
      isPastDate = true;
      todayShowsEnded = true;
      activeShows = [];
    } else if (targetDate === serverDate && !shouldIncludePast) {
      // TODAY: show only showtimes that have NOT started yet
      activeShows = allShowsForDate.filter((s) => !isShowInPast(s.date, s.startTime));
      if (totalRawShows > 0 && activeShows.length === 0) {
        todayShowsEnded = true;
      }
    }

    // Collect available cities for this movie on this date
    const availableCitiesSet = new Set();
    activeShows.forEach((s) => {
      if (s.theatreId?.city) availableCitiesSet.add(s.theatreId.city);
      if (s.theatreId?.district) availableCitiesSet.add(s.theatreId.district);
    });

    // Group shows by Theatre applying location filter
    const theatreMap = new Map();

    activeShows.forEach((show) => {
      if (!show.theatreId) return;
      if (!matchesLocation(show.theatreId, locFilter)) return;

      const theatreKey = show.theatreId._id.toString();
      if (!theatreMap.has(theatreKey)) {
        theatreMap.set(theatreKey, {
          theatre: show.theatreId,
          shows: [],
        });
      }

      theatreMap.get(theatreKey).shows.push({
        _id: show._id,
        startTime: show.startTime,
        endTime: show.endTime,
        format: show.format,
        language: show.language,
        pricing: show.pricing,
        screenName: show.screenId?.name || 'Screen 1',
        status: show.status,
        isDemoData: show.isDemoData || false,
      });
    });

    // Sort shows chronologically for each theatre
    const grouped = Array.from(theatreMap.values()).map((g) => ({
      ...g,
      shows: g.shows.sort((a, b) => compareShowtimes(a.startTime, b.startTime)),
    }));

    return successResponse(res, 'Grouped shows for movie', {
      movieId,
      date: targetDate,
      serverDate,
      serverTime: nowInfo.isoString,
      timeZone: DEFAULT_TIMEZONE,
      isToday: targetDate === serverDate,
      isPastDate,
      todayShowsEnded,
      nextAvailableDate: availableDates.find((d) => d > serverDate) || null,
      theatresCount: grouped.length,
      theatres: grouped,
      availableDates,
      availableCities: Array.from(availableCitiesSet).slice(0, 15),
      hasShowsAcrossDates: availableDates.length > 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single show details
 */
const getShowById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return errorResponse(res, 'Showtime not found', 404);
    }
    const show = await Show.findById(id)
      .populate('movieId')
      .populate('theatreId')
      .populate('screenId')
      .lean();

    if (!show) {
      return errorResponse(res, 'Showtime not found', 404);
    }

    const isPast = isShowInPast(show.date, show.startTime);
    return successResponse(res, 'Show details retrieved', {
      ...show,
      isPastShow: isPast,
      canBook: show.status === 'scheduled' && !isPast,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin / Theatre Staff: Create Single Show
 * Validates date, prevents scheduling in the past,
 * and checks for duplicate/overlapping shows on the same screen.
 */
const createShow = async (req, res, next) => {
  try {
    const movieId = req.body.movieId || req.body.movie;
    const theatreId = req.body.theatreId || req.body.theatre;
    let screenId = req.body.screenId || req.body.screen;
    const date = req.body.date || req.body.showDate;
    const startTime = req.body.startTime;
    let endTime = req.body.endTime || '';
    const format = req.body.format || '2D';
    const language = req.body.language || 'Tamil';
    const pricing = req.body.pricing || { standard: 160, premium: 250, recliner: 420 };
    const isDemoData = req.body.isDemoData !== undefined ? Boolean(req.body.isDemoData) : true;

    if (!movieId || !theatreId || !date || !startTime) {
      return errorResponse(
        res,
        'movieId, theatreId, date (YYYY-MM-DD), and startTime are required',
        400
      );
    }

    if (!isValidDateString(date)) {
      return errorResponse(res, 'Invalid date format. Expected YYYY-MM-DD', 400);
    }

    // Disallow creating shows in the past
    if (isShowInPast(date, startTime)) {
      return errorResponse(res, 'Cannot schedule a showtime in the past', 400);
    }

    // Role check for theatre staff
    if (
      req.user.role === 'theatre' &&
      req.user.assignedTheatre &&
      req.user.assignedTheatre.toString() !== theatreId.toString()
    ) {
      return errorResponse(res, 'Unauthorized to add shows for other theatres', 403);
    }

    // Auto-provision Screen 1 if screenId not provided or set to 'auto'
    if (!screenId || screenId === 'auto' || screenId === '') {
      let screen = await Screen.findOne({ theatreId });
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
          theatreId,
          name: 'Screen 1 (Laser 4K)',
          screenNumber: 1,
          soundSystem: 'Dolby Atmos 7.1',
          projectionType: 'Laser 4K',
          totalCapacity: 120,
          rows,
        });
        await screen.save();
      }
      screenId = screen._id;
    }

    // Check for exact duplicate show on same screen, date, and startTime
    const duplicate = await Show.findOne({
      theatreId,
      screenId,
      date,
      startTime,
      status: { $ne: 'cancelled' },
    });

    if (duplicate) {
      return errorResponse(
        res,
        `A show is already scheduled on this screen at ${startTime} on ${date}`,
        409
      );
    }

    // Calculate auto endTime if missing
    if (!endTime) {
      const movieDoc = await Movie.findById(movieId);
      const duration = movieDoc?.duration || 150;
      endTime = calculateEndTime(startTime, duration);
    }

    // Check for overlapping shows on this screen
    const newStartMins = timeToMinutes(startTime);
    const newEndMins = timeToMinutes(endTime) || newStartMins + 150;

    const screenShows = await Show.find({
      screenId,
      date,
      status: { $ne: 'cancelled' },
    });

    for (const s of screenShows) {
      const sStart = timeToMinutes(s.startTime);
      const sEnd = timeToMinutes(s.endTime) || sStart + 150;
      // Overlap condition
      if (newStartMins < sEnd && newEndMins > sStart) {
        return errorResponse(
          res,
          `Showtime (${startTime} - ${endTime}) overlaps with existing show (${s.startTime} - ${s.endTime || 'end'}) on this screen`,
          409
        );
      }
    }

    const show = new Show({
      movieId,
      theatreId,
      screenId,
      date,
      startTime,
      endTime,
      format,
      language,
      pricing,
      status: 'scheduled',
      isDemoData,
    });

    await show.save();
    return successResponse(res, 'Showtime created successfully', show, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin / Theatre Staff: Bulk Schedule Creation Tool (Requirement 4)
 * Allows scheduling across multiple dates, screens, time slots, and movies.
 * Checks and skips duplicates and overlapping shows safely.
 */
const createBulkShows = async (req, res, next) => {
  try {
    const {
      theatreId,
      theatreIds,
      movieId,
      movieIds,
      screenId,
      dates = [],
      timeSlots = ['10:30 AM', '02:15 PM', '06:30 PM', '10:00 PM'],
      format = '2D',
      language = 'Tamil',
      pricing = { standard: 160, premium: 250, recliner: 420 },
      isDemoData = true,
    } = req.body;

    const targetTheatreIds = Array.isArray(theatreIds) && theatreIds.length > 0
      ? theatreIds
      : theatreId
      ? [theatreId]
      : [];

    const targetMovieIds = Array.isArray(movieIds) && movieIds.length > 0
      ? movieIds
      : movieId
      ? [movieId]
      : [];

    if (targetTheatreIds.length === 0 || targetMovieIds.length === 0 || dates.length === 0) {
      return errorResponse(
        res,
        'Please specify at least one theatreId, one movieId, and an array of dates (YYYY-MM-DD)',
        400
      );
    }

    const nowInfo = getNowInTimezone(DEFAULT_TIMEZONE);
    const validFutureDates = dates.filter((d) => isValidDateString(d) && d >= nowInfo.dateStr);

    if (validFutureDates.length === 0) {
      return errorResponse(res, 'No valid current or future dates provided for bulk scheduling', 400);
    }

    let createdCount = 0;
    let skippedDuplicateCount = 0;
    const bulkOps = [];

    for (const tId of targetTheatreIds) {
      // Find or provision screen
      let screens = await Screen.find({ theatreId: tId });
      if (screens.length === 0) {
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
        const newScreen = new Screen({
          theatreId: tId,
          name: 'Screen 1 (Laser 4K)',
          screenNumber: 1,
          soundSystem: 'Dolby Atmos 7.1',
          projectionType: 'Laser 4K',
          totalCapacity: 120,
          rows,
        });
        await newScreen.save();
        screens = [newScreen];
      }

      for (const mId of targetMovieIds) {
        for (const dateStr of validFutureDates) {
          for (let slotIdx = 0; slotIdx < timeSlots.length; slotIdx++) {
            const timeSlot = timeSlots[slotIdx];

            // Don't schedule past slots for today
            if (dateStr === nowInfo.dateStr && isShowInPast(dateStr, timeSlot)) {
              continue;
            }

            const chosenScreen = screenId && screenId !== 'auto'
              ? screens.find((s) => s._id.toString() === screenId.toString()) || screens[0]
              : screens[slotIdx % screens.length];

            bulkOps.push({
              updateOne: {
                filter: {
                  theatreId: tId,
                  screenId: chosenScreen._id,
                  date: dateStr,
                  startTime: timeSlot,
                },
                update: {
                  $setOnInsert: {
                    movieId: mId,
                    theatreId: tId,
                    screenId: chosenScreen._id,
                    date: dateStr,
                    startTime: timeSlot,
                    endTime: calculateEndTime(timeSlot, 150),
                    format,
                    language,
                    pricing,
                    status: 'scheduled',
                    isDemoData: Boolean(isDemoData),
                  },
                },
                upsert: true,
              },
            });
          }
        }
      }
    }

    if (bulkOps.length > 0) {
      const result = await Show.bulkWrite(bulkOps, { ordered: false });
      createdCount = result.upsertedCount || 0;
      skippedDuplicateCount = bulkOps.length - createdCount;
    }

    return successResponse(res, 'Bulk schedule creation completed', {
      totalRequested: bulkOps.length,
      totalScheduled: createdCount,
      skippedExisting: skippedDuplicateCount,
      datesProcessed: validFutureDates,
      theatresCount: targetTheatreIds.length,
      moviesCount: targetMovieIds.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update Show
 */
const updateShow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const show = await Show.findByIdAndUpdate(id, req.body, { new: true });
    if (!show) {
      return errorResponse(res, 'Show not found', 404);
    }
    return successResponse(res, 'Show updated successfully', show);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete Show
 */
const deleteShow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const show = await Show.findByIdAndDelete(id);
    if (!show) {
      return errorResponse(res, 'Show not found', 404);
    }
    return successResponse(res, 'Show deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getShows,
  getShowsForMovie,
  getShowById,
  createShow,
  createBulkShows,
  updateShow,
  deleteShow,
};
