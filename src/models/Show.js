const mongoose = require('mongoose');

const showSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      required: true,
      index: true,
    },
    screenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screen',
      required: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD' for fast date filtering
      required: true,
      index: true,
    },
    startTime: {
      type: String, // '10:30 AM', '02:45 PM', '06:30 PM', '10:15 PM'
      required: true,
    },
    endTime: {
      type: String,
      default: '',
    },
    format: {
      type: String,
      enum: ['2D', '3D', 'IMAX 2D', 'IMAX 3D', '4DX'],
      default: '2D',
    },
    language: {
      type: String,
      default: 'Tamil',
    },
    pricing: {
      standard: {
        type: Number,
        default: 160,
      },
      premium: {
        type: Number,
        default: 250,
      },
      recliner: {
        type: Number,
        default: 420,
      },
    },
    status: {
      type: String,
      enum: ['scheduled', 'housefull', 'cancelled', 'completed'],
      default: 'scheduled',
    },
    isDemoData: {
      type: Boolean,
      default: true, // Clearly marks simulated dev showtimes
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying shows by movie, theatre, and date
showSchema.index({ movieId: 1, date: 1 });
showSchema.index({ theatreId: 1, date: 1 });
showSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Show', showSchema);
