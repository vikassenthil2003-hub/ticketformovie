const Show = require('../models/Show');
const Screen = require('../models/Screen');
const SeatLock = require('../models/SeatLock');
const Booking = require('../models/Booking');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isShowInPast } = require('../utils/dateUtils');

const LOCK_TIMEOUT_MINUTES = parseInt(process.env.SEAT_LOCK_TIMEOUT_MINUTES || '5', 10);

/**
 * Get Seat Layout & Live Status for a Show
 * Returns screen layout with rows/seats and the status of each seat:
 * - 'available'
 * - 'locked' (temporarily locked by another user)
 * - 'locked_by_me' (locked by current logged in user)
 * - 'booked' (already purchased/confirmed in Booking)
 */
const getShowSeatLayout = async (req, res, next) => {
  try {
    const { showId } = req.params;
    const currentUserId = req.user ? req.user._id.toString() : null;

    const show = await Show.findById(showId)
      .populate('screenId')
      .populate('movieId', 'title duration certification')
      .populate('theatreId', 'name brand address city');

    if (!show) {
      return errorResponse(res, 'Showtime not found', 404);
    }

    const isPast = isShowInPast(show.date, show.startTime);

    const screen = show.screenId;
    if (!screen) {
      return errorResponse(res, 'Screen layout not configured for this show', 404);
    }

    const now = new Date();

    // 1. Fetch all confirmed bookings for this show
    const confirmedBookings = await Booking.find({
      showId,
      bookingStatus: { $in: ['confirmed', 'reserved'] },
    }).select('seats');

    const bookedSeatSet = new Set();
    confirmedBookings.forEach((b) => {
      b.seats.forEach((s) => bookedSeatSet.add(s.seatNumber));
    });

    // 2. Fetch all active, unexpired seat locks for this show
    const activeLocks = await SeatLock.find({
      showId,
      status: 'locked',
      lockExpiresAt: { $gt: now },
    });

    const lockedSeatMap = new Map();
    activeLocks.forEach((lock) => {
      lockedSeatMap.set(lock.seatNumber, {
        lockedBy: lock.lockedBy.toString(),
        expiresAt: lock.lockExpiresAt,
      });
    });

    // 3. Map screen rows and calculate state for each seat
    const layout = screen.rows.map((row) => {
      const seats = row.seats.map((seat) => {
        let status = 'available';
        let lockExpiry = null;

        if (bookedSeatSet.has(seat.seatNumber)) {
          status = 'booked';
        } else if (lockedSeatMap.has(seat.seatNumber)) {
          const lockInfo = lockedSeatMap.get(seat.seatNumber);
          if (currentUserId && lockInfo.lockedBy === currentUserId) {
            status = 'locked_by_me';
            lockExpiry = lockInfo.expiresAt;
          } else {
            status = 'locked';
            lockExpiry = lockInfo.expiresAt;
          }
        }

        // Tier price from show pricing
        const price =
          row.category === 'Recliner'
            ? show.pricing.recliner
            : row.category === 'Premium'
            ? show.pricing.premium
            : show.pricing.standard;

        return {
          seatNumber: seat.seatNumber,
          rowLabel: row.rowLabel,
          category: row.category,
          price,
          colIndex: seat.colIndex,
          isAisle: seat.isAisle,
          isActive: seat.isActive,
          status,
          lockExpiry,
        };
      });

      return {
        rowLabel: row.rowLabel,
        category: row.category,
        seats,
      };
    });

    return successResponse(res, 'Seat layout retrieved successfully', {
      show: {
        id: show._id,
        movie: show.movieId,
        theatre: show.theatreId,
        date: show.date,
        startTime: show.startTime,
        format: show.format,
        language: show.language,
        pricing: show.pricing,
        isPastShow: isPast,
        canBook: !isPast && show.status === 'scheduled',
      },
      screen: {
        id: screen._id,
        name: screen.name,
        projectionType: screen.projectionType,
        soundSystem: screen.soundSystem,
      },
      layout,
      lockTimeoutMinutes: LOCK_TIMEOUT_MINUTES,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Temporarily Lock Seats (Protected)
 * Broadcasts via Socket.IO
 */
const lockSeats = async (req, res, next) => {
  try {
    const { showId } = req.params;
    const { seats, socketId } = req.body; // seats: array of { seatNumber, rowLabel, category, price }
    const userId = req.user._id;

    if (!Array.isArray(seats) || seats.length === 0) {
      return errorResponse(res, 'Please provide an array of seats to lock', 400);
    }

    if (seats.length > 10) {
      return errorResponse(res, 'Maximum 10 seats can be booked in a single transaction', 400);
    }

    const show = await Show.findById(showId);
    if (!show) {
      return errorResponse(res, 'Showtime not found', 404);
    }

    if (show.status === 'cancelled') {
      return errorResponse(res, 'Cannot book seats for a cancelled showtime', 400);
    }

    if (isShowInPast(show.date, show.startTime)) {
      return errorResponse(
        res,
        'Cannot book seats for a showtime that has already started or ended. Please select an upcoming show.',
        400
      );
    }

    const seatNumbers = seats.map((s) => s.seatNumber);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCK_TIMEOUT_MINUTES * 60 * 1000);

    // 1. Check if any seat is already booked
    const existingBookings = await Booking.find({
      showId,
      bookingStatus: { $in: ['confirmed', 'reserved'] },
      'seats.seatNumber': { $in: seatNumbers },
    });

    if (existingBookings.length > 0) {
      const alreadyBooked = [];
      existingBookings.forEach((b) => {
        b.seats.forEach((s) => {
          if (seatNumbers.includes(s.seatNumber)) alreadyBooked.push(s.seatNumber);
        });
      });
      return errorResponse(
        res,
        `Seat(s) ${alreadyBooked.join(', ')} have already been booked by another customer.`,
        409
      );
    }

    // 2. Check if any seat is currently locked by someone else
    const conflictingLocks = await SeatLock.find({
      showId,
      seatNumber: { $in: seatNumbers },
      status: 'locked',
      lockExpiresAt: { $gt: now },
      lockedBy: { $ne: userId },
    });

    if (conflictingLocks.length > 0) {
      const lockedSeats = conflictingLocks.map((l) => l.seatNumber);
      return errorResponse(
        res,
        `Seat(s) ${lockedSeats.join(', ')} are temporarily selected by someone else. Please choose different seats.`,
        409
      );
    }

    // 3. Remove any prior locks for this user on this show to refresh
    await SeatLock.deleteMany({
      showId,
      lockedBy: userId,
    });

    // 4. Create locks atomically
    const lockDocs = seats.map((s) => {
      // Re-verify price from show document
      const price =
        s.category === 'Recliner'
          ? show.pricing.recliner
          : s.category === 'Premium'
          ? show.pricing.premium
          : show.pricing.standard;

      return {
        showId,
        seatNumber: s.seatNumber,
        rowLabel: s.rowLabel,
        category: s.category,
        price,
        lockedBy: userId,
        socketId: socketId || null,
        lockExpiresAt: expiresAt,
        status: 'locked',
      };
    });

    await SeatLock.insertMany(lockDocs);

    // 5. Broadcast to Socket.IO room for this show
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`show_${showId}`).emit('seats_locked', {
        showId,
        seatNumbers,
        lockedBy: userId.toString(),
        expiresAt,
      });
    }

    return successResponse(res, `Successfully locked ${seats.length} seat(s) for 5 minutes.`, {
      showId,
      lockedSeats: seats,
      expiresAt,
      lockTimeoutSeconds: LOCK_TIMEOUT_MINUTES * 60,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Release Locked Seats
 */
const releaseSeats = async (req, res, next) => {
  try {
    const { showId } = req.params;
    const userId = req.user._id;

    const removedLocks = await SeatLock.find({
      showId,
      lockedBy: userId,
      status: 'locked',
    });

    const releasedNumbers = removedLocks.map((l) => l.seatNumber);

    await SeatLock.deleteMany({
      showId,
      lockedBy: userId,
    });

    if (req.app.get('io') && releasedNumbers.length > 0) {
      const io = req.app.get('io');
      io.to(`show_${showId}`).emit('seats_released', {
        showId,
        seatNumbers: releasedNumbers,
      });
    }

    return successResponse(res, 'Seats released successfully', {
      showId,
      releasedSeats: releasedNumbers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getShowSeatLayout,
  lockSeats,
  releaseSeats,
};
