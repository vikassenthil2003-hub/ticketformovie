const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const SeatLock = require('../models/SeatLock');
const User = require('../models/User');
const Snack = require('../models/Snack');
const RewardTransaction = require('../models/RewardTransaction');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Generate unique demo transaction ID
const generateDemoTxnRef = (method) => {
  const prefix = method.toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `DEMO-${prefix}-${timestamp}-${random}`;
};

/**
 * Process Demo Payment Simulation
 * Supports method: 'upi' | 'card' | 'wallet'
 * Supports simulatedOutcome: 'success' | 'failure'
 */
const processDemoPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const {
      method = 'upi',
      simulatedOutcome = 'success',
      upiVpa,
      cardLast4,
      cardNetwork,
      walletProvider,
      idempotencyKey,
    } = req.body;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId).populate('showId');
    if (!booking) {
      return errorResponse(res, 'Booking record not found', 404);
    }

    // Ownership check
    if (booking.userId.toString() !== userId.toString()) {
      return errorResponse(res, 'Access denied. You do not own this booking.', 403);
    }

    // Idempotency: If booking is already confirmed, return existing confirmation
    if (booking.bookingStatus === 'confirmed') {
      const existingPayment = await Payment.findOne({ bookingId, status: 'success' });
      return successResponse(res, 'Payment already confirmed for this booking.', {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        status: 'already_confirmed',
        demoTransactionRef: existingPayment?.demoTransactionRef || 'N/A',
        isDemoPayment: true,
      });
    }

    if (booking.bookingStatus === 'cancelled') {
      return errorResponse(res, 'This booking has been cancelled and cannot be paid.', 400);
    }

    // Check if idempotent key was already processed
    if (idempotencyKey) {
      const existingKeyPayment = await Payment.findOne({ idempotencyKey });
      if (existingKeyPayment && existingKeyPayment.status === 'success') {
        return successResponse(res, 'Payment already processed with this key', {
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          status: 'success',
          demoTransactionRef: existingKeyPayment.demoTransactionRef,
          isDemoPayment: true,
        });
      }
    }

    const demoTxnRef = generateDemoTxnRef(method);

    // Simulate Failure Case
    if (simulatedOutcome === 'failure') {
      const failedPaymentData = {
        bookingId,
        userId,
        amount: booking.pricingDetails.totalAmount,
        method,
        demoTransactionRef: demoTxnRef,
        status: 'failed',
        failureReason: 'Simulated payment failure requested by demo user',
        methodDetails: {
          upiVpa: upiVpa || 'demo@upi',
          cardLast4: cardLast4 || '4242',
          cardNetwork: cardNetwork || 'Visa',
          walletProvider: walletProvider || 'CineVerse Wallet',
        },
      };
      if (idempotencyKey) failedPaymentData.idempotencyKey = idempotencyKey;

      const failedPayment = new Payment(failedPaymentData);
      await failedPayment.save();
      booking.paymentStatus = 'failed';
      await booking.save();

      return errorResponse(
        res,
        'Demo Payment Failed (Simulated Test). Please retry or choose a different payment method.',
        400,
        {
          demoTransactionRef: demoTxnRef,
          bookingId: booking._id,
          status: 'failed',
          isDemoPayment: true,
        }
      );
    }

    // SUCCESSFUL SIMULATED PAYMENT
    const paymentData = {
      bookingId,
      userId,
      amount: booking.pricingDetails.totalAmount,
      method,
      demoTransactionRef: demoTxnRef,
      status: 'success',
      methodDetails: {
        upiVpa: upiVpa || 'demo@okcineverse',
        cardLast4: cardLast4 || '4242',
        cardNetwork: cardNetwork || 'Mastercard',
        walletProvider: walletProvider || 'CineVerse Pay',
      },
    };
    if (idempotencyKey) paymentData.idempotencyKey = idempotencyKey;

    const payment = new Payment(paymentData);
    await payment.save();

    // Confirm booking
    booking.paymentStatus = 'completed';
    booking.bookingStatus = 'confirmed';
    booking.paymentId = payment._id;
    await booking.save();

    // Update SeatLock status to 'confirmed'
    await SeatLock.updateMany(
      {
        showId: booking.showId._id,
        seatNumber: { $in: booking.seats.map((s) => s.seatNumber) },
      },
      {
        $set: { status: 'confirmed' },
      }
    );

    // Update snack stock if stock tracking enabled
    if (booking.snacks && booking.snacks.length > 0) {
      for (const item of booking.snacks) {
        if (item.snackId) {
          await Snack.updateOne(
            { _id: item.snackId, trackStock: true, stockQuantity: { $gte: item.quantity } },
            { $inc: { stockQuantity: -item.quantity } }
          );
        }
      }
    }

    // Broadcast permanently booked seats to Socket.io room
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`show_${booking.showId._id}`).emit('seats_booked', {
        showId: booking.showId._id,
        seatNumbers: booking.seats.map((s) => s.seatNumber),
        bookingReference: booking.bookingReference,
      });
    }

    // Reward points for successful booking (5% of total amount)
    const earnedPoints = Math.max(10, Math.floor(booking.pricingDetails.totalAmount * 0.05));
    const user = await User.findById(userId);
    if (user) {
      // Deduct used reward points if any
      if (booking.pricingDetails.rewardPointsUsed > 0) {
        user.rewardPoints = Math.max(0, user.rewardPoints - booking.pricingDetails.rewardPointsUsed);
        await RewardTransaction.create({
          userId,
          points: -booking.pricingDetails.rewardPointsUsed,
          type: 'redeemed',
          description: `Redeemed on booking ${booking.bookingReference}`,
          bookingReference: booking.bookingReference,
        });
      }

      // Add earned points
      user.rewardPoints += earnedPoints;

      // Tier progression
      if (user.rewardPoints >= 500) user.membershipTier = 'Platinum';
      else if (user.rewardPoints >= 200) user.membershipTier = 'Gold';

      await user.save();

      await RewardTransaction.create({
        userId,
        points: earnedPoints,
        type: 'earned',
        description: `Booking reward points for ${booking.bookingReference}`,
        bookingReference: booking.bookingReference,
      });
    }

    return successResponse(
      res,
      'Demo payment simulated successfully! Your tickets are confirmed.',
      {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        demoTransactionRef: demoTxnRef,
        amountPaid: booking.pricingDetails.totalAmount,
        earnedPoints,
        isDemoPayment: true,
        status: 'confirmed',
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processDemoPayment,
};
