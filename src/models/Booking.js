const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: true,
      index: true,
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      required: true,
    },
    screenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screen',
      required: true,
    },
    seats: [
      {
        seatNumber: {
          type: String,
          required: true,
        },
        rowLabel: String,
        category: {
          type: String,
          enum: ['Standard', 'Premium', 'Recliner'],
          default: 'Standard',
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    snacks: [
      {
        snackId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Snack',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        variant: {
          type: String,
          default: 'Regular',
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        imageUrl: {
          type: String,
          default: '',
        },
      },
    ],
    pricingDetails: {
      ticketsSubtotal: {
        type: Number,
        default: 0,
      },
      snacksSubtotal: {
        type: Number,
        default: 0,
      },
      subtotal: {
        type: Number,
        required: true,
      },
      convenienceFee: {
        type: Number,
        default: 30,
      },
      tax: {
        type: Number,
        default: 18,
      },
      discount: {
        type: Number,
        default: 0,
      },
      rewardPointsUsed: {
        type: Number,
        default: 0,
      },
      couponCode: {
        type: String,
        default: null,
      },
      totalAmount: {
        type: Number,
        required: true,
      },
    },
    bookingStatus: {
      type: String,
      enum: ['reserved', 'confirmed', 'cancelled', 'expired'],
      default: 'reserved',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    ticketToken: {
      type: String,
      required: true,
      unique: true,
    },
    // Theatre staff check-in verification
    isAdmitted: {
      type: Boolean,
      default: false,
    },
    admittedAt: {
      type: Date,
      default: null,
    },
    admittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancellation: {
      isCancelled: {
        type: Boolean,
        default: false,
      },
      cancelledAt: Date,
      reason: String,
      refundAmount: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate confirmed seat booking for the same show
bookingSchema.index({ showId: 1, 'seats.seatNumber': 1, bookingStatus: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
