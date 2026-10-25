const mongoose = require('mongoose');

const groupBookingSchema = new mongoose.Schema(
  {
    groupCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Movie Outing',
    },
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: true,
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
    initiatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalSeatsNeeded: {
      type: Number,
      required: true,
      min: 2,
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        name: {
          type: String,
          required: true,
        },
        email: String,
        selectedSeats: [String],
        shareAmount: {
          type: Number,
          default: 0,
        },
        paymentStatus: {
          type: String,
          enum: ['pending', 'paid'],
          default: 'pending',
        },
        demoTxnRef: String,
        paidAt: Date,
      },
    ],
    status: {
      type: String,
      enum: ['forming', 'confirmed', 'cancelled', 'expired'],
      default: 'forming',
    },
    confirmedBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GroupBooking', groupBookingSchema);
