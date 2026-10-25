const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't return password in regular queries
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin', 'theatre'],
        message: '{VALUE} is not a valid user role',
      },
      default: 'user',
    },
    assignedTheatre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      default: null,
    },
    rewardPoints: {
      type: Number,
      default: 50, // Initial welcome bonus points
      min: 0,
    },
    membershipTier: {
      type: String,
      enum: ['Silver', 'Gold', 'Platinum'],
      default: 'Silver',
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: String,
      default: null,
    },
    preferences: {
      city: {
        type: String,
        default: 'Chennai',
      },
      favoriteLanguages: {
        type: [String],
        default: ['Tamil', 'English', 'Hindi'],
      },
      favoriteGenres: {
        type: [String],
        default: ['Action', 'Thriller', 'Sci-Fi'],
      },
    },
    avatar: {
      type: String,
      default: '',
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Auto-generate unique referral code if missing
userSchema.pre('save', function (next) {
  if (!this.referralCode) {
    const codePrefix = this.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'CINE');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.referralCode = `${codePrefix}${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
