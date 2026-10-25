const mongoose = require('mongoose');

const seatLockSchema = new mongoose.Schema(
  {
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: true,
      index: true,
    },
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
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    socketId: {
      type: String,
      default: null,
    },
    lockExpiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL auto-cleanup when expired
    },
    status: {
      type: String,
      enum: ['locked', 'released', 'confirmed'],
      default: 'locked',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find active locks for a show
seatLockSchema.index({ showId: 1, seatNumber: 1 });

module.exports = mongoose.model('SeatLock', seatLockSchema);
