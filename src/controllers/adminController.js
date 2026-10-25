const Booking = require('../models/Booking');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const User = require('../models/User');
const Show = require('../models/Show');
const AuditEvent = require('../models/AuditEvent');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Admin Dashboard Analytics & Metrics (GET /api/v1/admin/analytics & /dashboard)
 * Computes live metrics, status breakdowns, top movies, and recent bookings directly from MongoDB.
 */
const getAnalytics = async (req, res, next) => {
  try {
    const [
      totalBookings,
      confirmedBookingsDocs,
      totalMovies,
      activeMovies,
      totalTheatres,
      activeTheatres,
      totalUsers,
      totalShows,
      upcomingShows,
      statusBreakdownAgg,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.find({ bookingStatus: 'confirmed' }).select('pricingDetails seats movieId'),
      Movie.countDocuments(),
      Movie.countDocuments({ isActive: true }),
      Theatre.countDocuments(),
      Theatre.countDocuments({ isActive: true }),
      User.countDocuments(),
      Show.countDocuments({ status: { $ne: 'cancelled' } }),
      Show.countDocuments({ status: 'scheduled' }),
      Booking.aggregate([
        {
          $group: {
            _id: '$bookingStatus',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Calculate actual total revenue from confirmed bookings
    const demoTotalRevenue = confirmedBookingsDocs.reduce(
      (sum, b) => sum + (b.pricingDetails?.totalAmount || 0),
      0
    );

    // Recent Bookings populated for dashboard display
    const recentBookingsDocs = await Booking.find()
      .populate('userId', 'name email phone role')
      .populate('movieId', 'title posterUrl duration rating')
      .populate('theatreId', 'name city address')
      .populate('screenId', 'name projectionType')
      .populate({
        path: 'showId',
        select: 'startTime date language format',
        populate: { path: 'movieId', select: 'title' },
      })
      .sort({ createdAt: -1 })
      .limit(10);

    const recentBookings = recentBookingsDocs.map((b) => {
      const userObj = b.userId && typeof b.userId === 'object' ? b.userId : null;
      const movieObj = b.movieId && typeof b.movieId === 'object' ? b.movieId : null;
      const showMovieObj =
        b.showId &&
        typeof b.showId === 'object' &&
        b.showId.movieId &&
        typeof b.showId.movieId === 'object'
          ? b.showId.movieId
          : movieObj;

      return {
        _id: b._id.toString(),
        bookingReference: b.bookingReference,
        user: {
          name: userObj?.name || 'Customer',
          email: userObj?.email || 'customer@cineverse.com',
        },
        userId: b.userId,
        show: {
          movie: {
            title: showMovieObj?.title || movieObj?.title || 'Movie',
          },
          startTime: b.showId?.startTime,
          date: b.showId?.date,
        },
        showId: b.showId,
        movie: movieObj,
        movieId: b.movieId,
        theatre: b.theatreId,
        theatreId: b.theatreId,
        screen: b.screenId,
        screenId: b.screenId,
        seats: b.seats || [],
        pricing: {
          finalPayable: b.pricingDetails?.totalAmount || 0,
          subtotal: b.pricingDetails?.subtotal || 0,
          convenienceFee: b.pricingDetails?.convenienceFee || 0,
          tax: b.pricingDetails?.tax || 0,
          discount: b.pricingDetails?.discount || 0,
        },
        pricingDetails: b.pricingDetails,
        status: b.bookingStatus,
        bookingStatus: b.bookingStatus,
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt,
      };
    });

    // Top Movies by bookings/seats
    const movieBookingCounts = {};
    const movieSeatsCounts = {};
    const movieRevenueCounts = {};

    confirmedBookingsDocs.forEach((b) => {
      if (b.movieId) {
        const mid = b.movieId.toString();
        movieBookingCounts[mid] = (movieBookingCounts[mid] || 0) + 1;
        movieSeatsCounts[mid] = (movieSeatsCounts[mid] || 0) + (b.seats?.length || 1);
        movieRevenueCounts[mid] =
          (movieRevenueCounts[mid] || 0) + (b.pricingDetails?.totalAmount || 0);
      }
    });

    const bookedMovieIds = Object.keys(movieSeatsCounts).sort(
      (a, b) => movieSeatsCounts[b] - movieSeatsCounts[a]
    );

    const allMovies = await Movie.find({ isActive: true })
      .select('title posterUrl rating genre')
      .sort({ rating: -1, releaseDate: -1 });

    const movieMap = new Map(allMovies.map((m) => [m._id.toString(), m]));
    const orderedIds = [...bookedMovieIds];
    for (const m of allMovies) {
      if (!orderedIds.includes(m._id.toString())) {
        orderedIds.push(m._id.toString());
      }
      if (orderedIds.length >= 6) break;
    }

    const topMoviesData = orderedIds.slice(0, 6).map((id) => {
      const m = movieMap.get(id);
      const count = movieBookingCounts[id] || 0;
      const seats = movieSeatsCounts[id] || 0;
      const rev = movieRevenueCounts[id] || 0;
      const title = m ? m.title : 'Movie';
      return {
        _id: id,
        movieId: id,
        movieTitle: title,
        title,
        bookingsCount: seats > 0 ? seats : count,
        ticketCount: seats,
        revenue: rev,
        rating: m ? m.rating : 0,
        posterUrl: m ? m.posterUrl : '',
      };
    });

    // Status breakdown ensuring standard states exist
    const statusMap = Object.fromEntries(statusBreakdownAgg.map((s) => [s._id, s.count]));
    const standardStatuses = ['confirmed', 'reserved', 'cancelled'];
    const statusBreakdown = standardStatuses.map((s) => ({
      _id: s,
      count: statusMap[s] || 0,
    }));

    statusBreakdownAgg.forEach((s) => {
      if (!standardStatuses.includes(s._id)) {
        statusBreakdown.push(s);
      }
    });

    // Daily revenue calculation for past 7 days based on confirmed bookings
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyAgg = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          bookingStatus: 'confirmed',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricingDetails.totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const dailyMap = {};
    dailyAgg.forEach((d) => {
      dailyMap[d._id] = { revenue: d.revenue, count: d.count };
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const revenueByDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];
      const entry = dailyMap[dateStr] || { revenue: 0, count: 0 };
      revenueByDay.push({
        date: dateStr,
        day: dayName,
        revenue: entry.revenue,
        simulatedRevenue: entry.revenue,
        bookingsCount: entry.count,
      });
    }

    const overview = {
      totalBookings,
      confirmedBookings: confirmedBookingsDocs.length,
      demoRevenue: demoTotalRevenue,
      totalRevenue: demoTotalRevenue,
      totalMovies: activeMovies || totalMovies,
      activeMovies: activeMovies || totalMovies,
      totalTheatres: activeTheatres || totalTheatres,
      activeTheatres: activeTheatres || totalTheatres,
      totalUsers,
      totalShows,
      upcomingShows,
    };

    const metrics = {
      totalBookings,
      confirmedCount: confirmedBookingsDocs.length,
      demoTotalRevenue,
      demoRevenue: demoTotalRevenue,
      totalRevenue: demoTotalRevenue,
      totalMovies,
      totalTheatres,
      totalUsers,
      upcomingShows,
      totalShows,
    };

    return successResponse(res, 'Admin analytics data retrieved successfully', {
      overview,
      metrics,
      topMovies: topMoviesData,
      popularMovies: topMoviesData,
      recentBookings,
      statusBreakdown,
      revenueByDay,
      isDemoMetrics: false,
    });
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = getAnalytics;

/**
 * Get Users list (Admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return successResponse(res, 'Users retrieved', users);
  } catch (error) {
    next(error);
  }
};

/**
 * Update User Role (Admin only)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, assignedTheatre } = req.body;

    if (!['user', 'admin', 'theatre'].includes(role)) {
      return errorResponse(res, 'Invalid role specified', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    user.role = role;
    if (assignedTheatre !== undefined) {
      user.assignedTheatre = assignedTheatre || null;
    }
    await user.save();

    await AuditEvent.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'ADMIN_UPDATE_USER_ROLE',
      entity: 'User',
      entityId: user._id.toString(),
      details: { newRole: role },
    });

    return successResponse(res, `User role updated to '${role}'`, user);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Audit Logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditEvent.find().sort({ createdAt: -1 }).limit(50);
    return successResponse(res, 'Audit events retrieved', logs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  getAuditLogs,
};
