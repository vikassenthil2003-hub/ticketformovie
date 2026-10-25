const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema(
  {
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      required: true,
      index: true,
    },
    screenNumber: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      default: 'Audi 1',
    },
    projectionType: {
      type: String,
      enum: ['Laser 4K', 'IMAX Laser', 'Digital 2K', 'RealD 3D'],
      default: 'Laser 4K',
    },
    soundSystem: {
      type: String,
      enum: ['Dolby Atmos 7.1', 'Dolby 5.1', 'IMAX 12-Track Sound'],
      default: 'Dolby Atmos 7.1',
    },
    totalCapacity: {
      type: Number,
      default: 120,
    },
    // Seat Layout Grid: rows with categories
    rows: [
      {
        rowLabel: {
          type: String, // 'A', 'B', 'C'
          required: true,
        },
        category: {
          type: String,
          enum: ['Standard', 'Premium', 'Recliner'],
          required: true,
        },
        seats: [
          {
            seatNumber: {
              type: String, // 'A1', 'A2'
              required: true,
            },
            colIndex: Number,
            isAisle: {
              type: Boolean,
              default: false,
            },
            isActive: {
              type: Boolean,
              default: true,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Screen', screenSchema);
