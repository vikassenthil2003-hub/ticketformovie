const Booking = require('../models/Booking');
const AuditEvent = require('../models/AuditEvent');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Get Confirmed Ticket Details by Booking Reference or ID
 */
const getTicket = async (req, res, next) => {
  try {
    const { bookingReference } = req.params;

    const query = bookingReference.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: bookingReference }
      : { bookingReference: bookingReference.toUpperCase().trim() };

    const booking = await Booking.findOne(query)
      .populate('movieId')
      .populate('theatreId')
      .populate('screenId')
      .populate('showId')
      .populate('userId', 'name email phone');

    if (!booking) {
      return errorResponse(res, 'Ticket not found for this reference', 404);
    }

    // Ownership check: customer can only view their own ticket
    const bookingOwnerId = (booking.userId?._id || booking.userId)?.toString();
    if (bookingOwnerId && bookingOwnerId !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied. You do not own this ticket.', 403);
    }

    // Return sanitized ticket data
    const ticketData = {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      ticketToken: booking.ticketToken,
      qrVerificationPayload: JSON.stringify({
        ref: booking.bookingReference,
        tok: booking.ticketToken,
        show: booking.showId._id,
      }),
      movie: {
        title: booking.movieId.title,
        posterUrl: booking.movieId.posterUrl,
        certification: booking.movieId.certification,
        language: booking.showId.language,
        format: booking.showId.format,
        duration: booking.movieId.duration,
      },
      theatre: {
        id: booking.theatreId._id,
        name: booking.theatreId.name,
        address: booking.theatreId.address,
        city: booking.theatreId.city,
        pinCode: booking.theatreId.pinCode,
      },
      screen: {
        name: booking.screenId.name,
        projectionType: booking.screenId.projectionType,
        soundSystem: booking.screenId.soundSystem,
      },
      showtime: {
        date: booking.showId.date,
        startTime: booking.showId.startTime,
      },
      seats: booking.seats.map((s) => ({
        seatNumber: s.seatNumber,
        category: s.category,
        price: s.price,
      })),
      snacks: (booking.snacks || []).map((sn) => ({
        snackId: sn.snackId,
        name: sn.name,
        variant: sn.variant,
        quantity: sn.quantity,
        unitPrice: sn.unitPrice,
        totalPrice: sn.totalPrice,
        imageUrl: sn.imageUrl,
      })),
      pricingDetails: booking.pricingDetails,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      isAdmitted: booking.isAdmitted,
      admittedAt: booking.admittedAt,
      bookedAt: booking.createdAt,
      customer: {
        name: booking.userId?.name || 'Customer',
        email: booking.userId?.email || '',
      },
    };

    return successResponse(res, 'Digital ticket retrieved successfully', ticketData);
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Ticket at Theatre Gate (Protected - Theatre Staff or Admin)
 * Verifies validity, marks admitted, detects duplicates
 */
const verifyTicket = async (req, res, next) => {
  try {
    let { bookingReference, ticketToken, verificationSecret, qrData } = req.body;
    if (qrData) {
      try {
        const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        bookingReference = bookingReference || parsed.bookingReference || parsed.ref;
        ticketToken = ticketToken || parsed.ticketToken || parsed.tok || parsed.verificationSecret;
      } catch (e) {
        // Fall back to treating qrData as raw booking reference
        bookingReference = bookingReference || qrData.toString().trim();
      }
    }
    const token = (ticketToken || verificationSecret || '').toString().trim();
    const staffUser = req.user;

    if (!bookingReference && !token) {
      return errorResponse(res, 'Please provide booking reference or QR ticket token', 400);
    }

    const query = {};
    if (bookingReference) query.bookingReference = bookingReference.toUpperCase().trim();
    if (token) query.ticketToken = token;

    const booking = await Booking.findOne(query)
      .populate('movieId', 'title duration certification')
      .populate('theatreId', 'name address city')
      .populate('screenId', 'name')
      .populate('showId', 'date startTime format')
      .populate('userId', 'name email phone');

    if (!booking) {
      return errorResponse(res, 'INVALID TICKET: No matching booking record found.', 404, {
        status: 'invalid',
      });
    }

    // Role check: If theatre staff, verify ticket belongs to their assigned theatre
    if (
      staffUser.role === 'theatre' &&
      staffUser.assignedTheatre &&
      booking.theatreId._id.toString() !== staffUser.assignedTheatre.toString()
    ) {
      return errorResponse(
        res,
        `WRONG THEATRE: This ticket is for '${booking.theatreId.name}', not your cinema hall.`,
        403,
        { status: 'wrong_theatre', theatreName: booking.theatreId.name }
      );
    }

    // Check cancellation
    if (booking.bookingStatus === 'cancelled') {
      return errorResponse(res, 'CANCELLED TICKET: This booking was cancelled. Entry denied.', 400, {
        status: 'cancelled',
        cancelledAt: booking.cancellation?.cancelledAt,
        reason: booking.cancellation?.reason,
      });
    }

    // Check payment status
    if (booking.paymentStatus !== 'completed' || booking.bookingStatus !== 'confirmed') {
      return errorResponse(res, 'UNPAID TICKET: Payment was not completed for this reservation.', 400, {
        status: 'unpaid',
      });
    }

    // Check duplicate entry / already admitted
    if (booking.isAdmitted) {
      return errorResponse(
        res,
        `ALREADY ADMITTED: This ticket was already verified and admitted on ${new Date(booking.admittedAt).toLocaleTimeString()}. Duplicate entry prohibited!`,
        409,
        {
          status: 'already_admitted',
          admittedAt: booking.admittedAt,
          seats: booking.seats.map((s) => s.seatNumber),
        }
      );
    }

    // SUCCESSFUL VERIFICATION & ADMISSION
    booking.isAdmitted = true;
    booking.admittedAt = new Date();
    booking.admittedBy = staffUser._id;
    await booking.save();

    // Log audit event
    await AuditEvent.create({
      userId: staffUser._id,
      userEmail: staffUser.email,
      userRole: staffUser.role,
      action: 'TICKET_ADMISSION_VERIFIED',
      entity: 'Booking',
      entityId: booking._id.toString(),
      details: {
        bookingReference: booking.bookingReference,
        seats: booking.seats.map((s) => s.seatNumber),
        theatre: booking.theatreId.name,
      },
    });

    return successResponse(res, 'TICKET VERIFIED: Admission Approved! Enjoy the show.', {
      status: 'valid',
      bookingReference: booking.bookingReference,
      movieTitle: booking.movieId.title,
      screenName: booking.screenId.name,
      showDate: booking.showId.date,
      showTime: booking.showId.startTime,
      startTime: booking.showId.startTime,
      seatNumbers: booking.seats.map((s) => s.seatNumber),
      seats: booking.seats.map((s) => s.seatNumber),
      customerName: booking.userId?.name || 'Customer',
      admittedAt: booking.admittedAt,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTicket,
  verifyTicket,
};
