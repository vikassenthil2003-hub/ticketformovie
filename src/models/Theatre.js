const mongoose = require('mongoose');

const theatreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Theatre name is required'],
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      default: 'CineVerse Cinemas',
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    district: {
      type: String,
      trim: true,
      index: true,
      default: 'Chennai',
    },
    locality: {
      type: String,
      trim: true,
      default: '',
    },
    town: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      default: 'Tamil Nadu',
      index: true,
    },
    pinCode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    source: {
      type: String,
      enum: ['osm', 'verified_directory', 'manual_admin', 'curated_osm', 'google_places', 'national_directory'],
      default: 'curated_osm',
    },
    osmId: {
      type: String,
      sparse: true,
      index: true,
    },
    placeId: {
      type: String,
      sparse: true,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['verified', 'unverified', 'pending_review', 'inactive'],
      default: 'verified',
      index: true,
    },
    verificationNotes: {
      type: String,
      default: '',
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      default: 'Multiplex',
      trim: true,
    },
    normalizedName: {
      type: String,
      trim: true,
      index: true,
    },
    screensCount: {
      type: Number,
      default: 1,
    },
    // GeoJSON Point
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    amenities: {
      type: [String],
      default: ['Dolby Atmos', 'Recliner Seats', '4K Laser Projection', 'Food & Beverage', 'Parking'],
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 100,
    },
    contactPhone: {
      type: String,
      default: '+91 44 2855 0000',
    },
    isDemoData: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to populate normalizedName
theatreSchema.pre('save', function (next) {
  if (this.name) {
    this.normalizedName = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  next();
});

// 2dsphere index for geospatial queries ($near, $geoWithin)
theatreSchema.index({ location: '2dsphere' });
theatreSchema.index({ state: 1, district: 1, city: 1, verificationStatus: 1 });
theatreSchema.index({ district: 1, city: 1, verificationStatus: 1 });
theatreSchema.index({ name: 'text', address: 'text', district: 'text', city: 'text' });

module.exports = mongoose.model('Theatre', theatreSchema);
