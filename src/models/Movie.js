const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Movie title is required'],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    synopsis: {
      type: String,
      required: [true, 'Synopsis is required'],
      trim: true,
    },
    posterUrl: {
      type: String,
      required: [true, 'Poster URL is required'],
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    trailerUrl: {
      type: String,
      default: '',
      trim: true,
    },
    trailerVideoId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    trailerTitle: {
      type: String,
      trim: true,
      default: '',
    },
    trailerChannel: {
      type: String,
      trim: true,
      default: '',
    },
    trailerThumbnail: {
      type: String,
      default: '',
    },
    trailerThumbnailResolutions: {
      type: [String],
      default: [],
    },
    trailerStatus: {
      type: String,
      enum: ['verified', 'available', 'needs_review', 'missing', 'error'],
      default: 'missing',
      index: true,
    },
    trailerSource: {
      type: String,
      enum: ['youtube_api', 'official_curated', 'manual_admin', 'tmdb', 'none'],
      default: 'none',
    },
    trailerVerifiedAt: {
      type: Date,
    },
    trailerLastCheckedAt: {
      type: Date,
    },
    trailerNotes: {
      type: String,
      default: '',
    },
    genre: {
      type: [String],
      required: true,
      index: true,
    },
    language: {
      type: [String],
      required: true,
      index: true,
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
    },
    certification: {
      type: String,
      enum: ['U', 'UA', 'A', 'R', 'PG-13'],
      default: 'UA',
    },
    releaseDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['now_showing', 'coming_soon', 'ended'],
      default: 'now_showing',
      index: true,
    },
    formats: {
      type: [String],
      default: ['2D', '3D', 'IMAX 2D'],
    },
    director: {
      type: String,
      default: 'Unknown',
    },
    cast: [
      {
        name: String,
        role: String,
        photo: String,
      },
    ],
    rating: {
      type: Number,
      default: 8.5,
      min: 0,
      max: 10,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

movieSchema.index(
  { title: 'text', synopsis: 'text', genre: 'text' },
  { default_language: 'none', language_override: 'text_language' }
);

/**
 * Utility to extract an 11-character YouTube video ID from various YouTube URL formats or raw ID.
 */
function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|(?:youtube\.com|youtube-nocookie\.com)\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  return match ? match[1] : '';
}

movieSchema.statics.extractYouTubeVideoId = extractYouTubeVideoId;

movieSchema.pre('save', function (next) {
  if (this.trailerUrl) {
    const extracted = extractYouTubeVideoId(this.trailerUrl);
    if (extracted) {
      this.trailerVideoId = extracted;
      if (!this.trailerStatus || this.trailerStatus === 'missing') {
        this.trailerStatus = 'needs_review';
      }
    }
  }
  next();
});

module.exports = mongoose.model('Movie', movieSchema);
