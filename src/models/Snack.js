const mongoose = require('mongoose');

const snackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Snack item name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500&auto=format&fit=crop&q=80',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'Popcorn',
          'Combos',
          'Beverages',
          'Burgers & Sandwiches',
          'Nachos',
          'Other Snacks',
        ],
        message: '{VALUE} is not a valid snack category',
      },
      index: true,
    },
    variant: {
      type: String,
      trim: true,
      default: 'Regular', // 'Small', 'Medium', 'Large', 'Regular', 'Combo'
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    // Optional theatre association: null = available across all theatres (Global Concession)
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      default: null,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    stockQuantity: {
      type: Number,
      default: 100,
      min: 0,
    },
    trackStock: {
      type: Boolean,
      default: false,
    },
    isDemoPrice: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying theatre menu by category and availability
snackSchema.index({ theatreId: 1, isAvailable: 1, category: 1 });

module.exports = mongoose.model('Snack', snackSchema);
