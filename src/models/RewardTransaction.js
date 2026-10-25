const mongoose = require('mongoose');

const rewardTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'referral', 'bonus'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    bookingReference: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RewardTransaction', rewardTransactionSchema);
