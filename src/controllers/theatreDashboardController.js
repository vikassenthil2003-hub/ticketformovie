const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const AuditEvent = require('../models/AuditEvent');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { getLocalDateString } = require('../utils/dateUtils');

/**
 * Get Theatre Dashboard Overview
 */
const getTheatreOverview = async (req, res, next) => {
  try {
    const user = req.user;
    let theatreId = user.assignedTheatre;

    // If admin is viewing, allow query param theatreId or fallback to first theatre
    if (user.role === 'admin' && req.query.theatreId) {
      theatreId = req.query.theatreId;
    }

    if (!theatreId) {
      // Find first theatre as fallback for admin demo
      const firstTheatre = await Theatre.findOne();
      theatreId = firstTheatre?._id;
    }

    if (!theatreId) {
      return errorResponse(res, 'No theatre assigned to this account', 400);
    }

    let theatre = theatreId ? await Theatre.findById(theatreId) : null;
    if (!theatre) {
      theatre = await Theatre.findOne();
      if (theatre && user && user.role === 'theatre') {
        user.assignedTheatre = theatre._id;
        await user.save().catch(() => {});
      }
    }

    if (!theatre) {
      return errorResponse(res, 'Theatre record not found', 404);
    }

    // Today's shows for this theatre
    const todayStr = getLocalDateString(0);
    const todayShows = await Show.find({ theatreId, date: todayStr })
      .populate('movieId', 'title posterUrl duration')
      .populate('screenId', 'name totalCapacity');

    // Total tickets admitted today
    const admittedToday = await Booking.countDocuments({
      theatreId,
      isAdmitted: true,
      admittedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });

    const recentAdmissions = await Booking.find({
      theatreId,
      isAdmitted: true,
    })
      .populate('movieId', 'title')
      .populate('showId', 'startTime date')
      .sort({ admittedAt: -1 })
      .limit(10);

    const formattedShows = todayShows.map((s) => ({
      _id: s._id,
      startTime: s.startTime,
      endTime: s.endTime,
      format: s.format,
      language: s.language,
      status: s.status,
      pricing: s.pricing,
      movie: s.movieId,
      movieId: s.movieId,
      screen: s.screenId,
      screenId: s.screenId,
    }));

    const theatreObj = theatre.toObject ? theatre.toObject() : { ...theatre };
    theatreObj.addressLine = theatreObj.addressLine || theatreObj.address;
    theatreObj.pincode = theatreObj.pincode || theatreObj.pinCode;

    return successResponse(res, 'Theatre overview loaded', {
      theatre: theatreObj,
      todayShows: formattedShows,
      shows: formattedShows,
      stats: {
        verifiedTickets: admittedToday,
        admittedToday,
        totalShows: todayShows.length,
        screenCount: theatre.screenCount || 2,
      },
      metrics: {
        totalShowsToday: todayShows.length,
        admittedToday,
      },
      recentAdmissions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTheatreOverview,
};
