const crypto = require('crypto');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const SeatLock = require('../models/SeatLock');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Snack = require('../models/Snack');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isShowInPast } = require('../utils/dateUtils');

// Generate human-friendly unique booking reference e.g. CV-2026-8A39F
const generateBookingReference = () => {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CV-2026-${randomHex}`;
};

/**
 * Initialize / Create Booking from locked seats
 */
const createBooking = async (req, res, next) => {
  try {
    const { showId, seatNumbers, couponCode, redeemRewardPoints = 0 } = req.body;
    const userId = req.user._id;

    if (!showId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return errorResponse(res, 'ShowId and at least one seatNumber are required', 400);
    }

    const show = await Show.findById(showId)
      .populate('screenId')
      .populate('movieId')
      .populate('theatreId');

    if (!show) {
      return errorResponse(res, 'Showtime not found', 404);
    }

    if (show.status === 'cancelled') {
      return errorResponse(res, 'Cannot book tickets for a cancelled showtime', 400);
    }

    if (isShowInPast(show.date, show.startTime)) {
      return errorResponse(
        res,
        'Cannot complete booking for a showtime that has already started or ended',
        400
      );
    }

    const now = new Date();

    // 1. Verify that user currently holds valid, unexpired locks for all these seats
    const userLocks = await SeatLock.find({
      showId,
      lockedBy: userId,
      seatNumber: { $in: seatNumbers },
      status: 'locked',
      lockExpiresAt: { $gt: now },
    });

    if (userLocks.length !== seatNumbers.length) {
      return errorResponse(
        res,
        'Your seat lock has expired or some seats are no longer reserved. Please re-select your seats.',
        400
      );
    }

    // 2. Server-side price calculation
    let subtotal = 0;
    const bookingSeats = userLocks.map((lock) => {
      // Re-verify category and price against show pricing
      let price = show.pricing.standard;
      if (lock.category === 'Recliner') price = show.pricing.recliner;
      else if (lock.category === 'Premium') price = show.pricing.premium;

      subtotal += price;
      return {
        seatNumber: lock.seatNumber,
        rowLabel: lock.rowLabel,
        category: lock.category,
        price,
      };
    });

    // Convenience fee: ₹30 per seat
    const convenienceFee = bookingSeats.length * 30;
    // GST Tax: 18% on convenience fee
    const tax = Math.round(convenienceFee * 0.18);

    let discount = 0;
    let appliedCoupon = null;

    // 3. Validate Coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase().trim(),
        isActive: true,
        validUntil: { $gt: now },
      });

      if (coupon) {
        if (subtotal >= coupon.minOrderValue) {
          if (coupon.discountType === 'percentage') {
            const rawDiscount = (subtotal * coupon.discountValue) / 100;
            discount = Math.min(rawDiscount, coupon.maxDiscount);
          } else {
            discount = Math.min(coupon.discountValue, subtotal);
          }
          appliedCoupon = coupon.code;
        }
      }
    }

    // 4. Validate Reward Points
    let pointsDiscount = 0;
    const user = await User.findById(userId);
    const requestedPoints = Math.max(0, parseInt(redeemRewardPoints, 10) || 0);

    if (requestedPoints > 0 && user) {
      const maxAllowedPoints = Math.min(user.rewardPoints, Math.floor(subtotal * 0.4)); // Max 40% using points
      pointsDiscount = Math.min(requestedPoints, maxAllowedPoints);
    }

    const totalDiscount = Math.round(discount + pointsDiscount);
    const totalAmount = Math.max(1, Math.round(subtotal + convenienceFee + tax - totalDiscount));

    // Generate unique booking reference and secure verification ticket token
    const bookingReference = generateBookingReference();
    const ticketToken = crypto.randomBytes(24).toString('hex');

    const booking = new Booking({
      bookingReference,
      userId,
      showId,
      movieId: show.movieId._id,
      theatreId: show.theatreId._id,
      screenId: show.screenId._id,
      seats: bookingSeats,
      snacks: [],
      pricingDetails: {
        ticketsSubtotal: subtotal,
        snacksSubtotal: 0,
        subtotal,
        convenienceFee,
        tax,
        discount: totalDiscount,
        rewardPointsUsed: pointsDiscount,
        couponCode: appliedCoupon,
        totalAmount,
      },
      bookingStatus: 'reserved',
      paymentStatus: 'pending',
      ticketToken,
    });

    await booking.save();

    return successResponse(res, 'Booking initialized. Proceed to payment.', {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      movie: {
        title: show.movieId.title,
        posterUrl: show.movieId.posterUrl,
        certification: show.movieId.certification,
        language: show.language,
        format: show.format,
      },
      theatre: {
        name: show.theatreId.name,
        address: show.theatreId.address,
        city: show.theatreId.city,
      },
      screenName: show.screenId.name,
      date: show.date,
      startTime: show.startTime,
      seats: bookingSeats,
      pricingDetails: booking.pricingDetails,
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Checkout Summary for Booking by ID
 */
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate('movieId')
      .populate('theatreId')
      .populate('screenId')
      .populate('showId');

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Ownership check: customer can only view their own booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied. You do not own this booking.', 403);
    }

    return successResponse(res, 'Booking details retrieved', booking);
  } catch (error) {
    next(error);
  }
};

/**
 * Get User's Booking History (Protected)
 */
const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const bookings = await Booking.find({ userId })
      .populate('movieId', 'title posterUrl duration certification language')
      .populate('theatreId', 'name address city brand')
      .populate('showId', 'date startTime format')
      .sort({ createdAt: -1 });

    return successResponse(res, 'User bookings retrieved', bookings);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel Booking (if show is in future and status is confirmed)
 */
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const booking = await Booking.findById(id).populate('showId');
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.userId.toString() !== userId.toString()) {
      return errorResponse(res, 'Access denied to cancel this booking', 403);
    }

    if (booking.bookingStatus === 'cancelled') {
      return errorResponse(res, 'This booking has already been cancelled', 400);
    }

    if (booking.isAdmitted) {
      return errorResponse(res, 'Ticket has already been verified and used for theatre entry. Cannot cancel.', 400);
    }

    booking.bookingStatus = 'cancelled';
    booking.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      reason: reason || 'Customer request',
      refundAmount: booking.pricingDetails.totalAmount,
    };

    await booking.save();

    // Release seat locks
    await SeatLock.deleteMany({
      showId: booking.showId._id,
      seatNumber: { $in: booking.seats.map((s) => s.seatNumber) },
    });

    // Broadcast seat availability
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`show_${booking.showId._id}`).emit('seats_released', {
        showId: booking.showId._id,
        seatNumbers: booking.seats.map((s) => s.seatNumber),
      });
    }

    return successResponse(res, 'Booking cancelled successfully. Simulated refund initiated.', booking);
  } catch (error) {
    next(error);
  }
};

/**
 * Update / Attach Snacks to a reserved booking
 * PUT /api/bookings/:id/snacks
 */
const updateBookingSnacks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { snacks = [] } = req.body;
    const userId = req.user._id;

    const booking = await Booking.findById(id).populate('showId');
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.userId.toString() !== userId.toString()) {
      return errorResponse(res, 'Access denied. You do not own this booking.', 403);
    }

    if (booking.bookingStatus !== 'reserved') {
      return errorResponse(res, 'Cannot modify snacks on a confirmed or expired booking', 400);
    }

    let snacksSubtotal = 0;
    const validatedSnacks = [];

    if (Array.isArray(snacks) && snacks.length > 0) {
      for (const item of snacks) {
        const qty = parseInt(item.quantity, 10);
        if (!qty || qty <= 0) continue; // Skip zero/negative quantities

        if (!item.snackId) {
          return errorResponse(res, 'Each snack item must have a valid snackId', 400);
        }

        const snackDoc = await Snack.findById(item.snackId);
        if (!snackDoc) {
          return errorResponse(res, `Snack product ${item.snackId} not found`, 404);
        }

        if (!snackDoc.isAvailable) {
          return errorResponse(res, `"${snackDoc.name}" is currently unavailable or out of stock`, 400);
        }

        // Check theatre association if snack is theatre-specific
        if (snackDoc.theatreId && snackDoc.theatreId.toString() !== booking.theatreId.toString()) {
          return errorResponse(res, `"${snackDoc.name}" is not offered at this theatre location`, 400);
        }

        const itemTotal = snackDoc.price * qty;
        snacksSubtotal += itemTotal;

        validatedSnacks.push({
          snackId: snackDoc._id,
          name: snackDoc.name,
          variant: snackDoc.variant || 'Regular',
          quantity: qty,
          unitPrice: snackDoc.price,
          totalPrice: itemTotal,
          imageUrl: snackDoc.imageUrl || '',
        });
      }
    }

    // Calculate ticket subtotal from booked seats
    const ticketsSubtotal =
      booking.pricingDetails?.ticketsSubtotal ||
      booking.seats.reduce((sum, s) => sum + (s.price || 0), 0);

    const convenienceFee = booking.pricingDetails?.convenienceFee || booking.seats.length * 30;
    const tax = booking.pricingDetails?.tax || Math.round(convenienceFee * 0.18);
    const discount = booking.pricingDetails?.discount || 0;

    const combinedSubtotal = ticketsSubtotal + snacksSubtotal;
    const totalAmount = Math.max(1, Math.round(combinedSubtotal + convenienceFee + tax - discount));

    booking.snacks = validatedSnacks;
    booking.pricingDetails.ticketsSubtotal = ticketsSubtotal;
    booking.pricingDetails.snacksSubtotal = snacksSubtotal;
    booking.pricingDetails.subtotal = combinedSubtotal;
    booking.pricingDetails.totalAmount = totalAmount;

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('movieId')
      .populate('theatreId')
      .populate('screenId')
      .populate('showId');

    return successResponse(res, 'Snacks updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getBookingById,
  getUserBookings,
  cancelBooking,
  updateBookingSnacks,
};
