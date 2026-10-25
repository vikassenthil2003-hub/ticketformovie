const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    method: {
      type: String,
      enum: ['upi', 'card', 'wallet', 'netbanking'],
      required: true,
    },
    demoTransactionRef: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending', 'refunded'],
      default: 'pending',
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    paymentGateway: {
      type: String,
      default: 'CineVerse Demo Sandbox',
    },
    methodDetails: {
      upiVpa: String,
      cardLast4: String,
      cardNetwork: String,
      walletProvider: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
