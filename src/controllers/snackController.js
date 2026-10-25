const Snack = require('../models/Snack');
const Theatre = require('../models/Theatre');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const SNACK_CATEGORIES = [
  'Popcorn',
  'Combos',
  'Beverages',
  'Burgers & Sandwiches',
  'Nachos',
  'Other Snacks',
];

/**
 * Public: Get active snacks available for a theatre (with fallback to global menu)
 */
const getSnacks = async (req, res, next) => {
  try {
    const { theatreId, category, search } = req.query;

    let filter = { isAvailable: true };

    if (theatreId && theatreId !== 'null' && theatreId !== 'undefined') {
      filter.$or = [{ theatreId }, { theatreId: null }];
    } else {
      filter.theatreId = null;
    }

    if (category && category !== 'All' && SNACK_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    let snacks = await Snack.find(filter)
      .populate('theatreId', 'name city')
      .sort({ category: 1, price: 1 });

    // If theatre-specific query returned 0 items, fallback to global concession menu
    if (snacks.length === 0 && theatreId) {
      const fallbackFilter = { isAvailable: true, theatreId: null };
      if (category && category !== 'All' && SNACK_CATEGORIES.includes(category)) {
        fallbackFilter.category = category;
      }
      snacks = await Snack.find(fallbackFilter).sort({ category: 1, price: 1 });
    }

    return successResponse(res, 'Snacks retrieved successfully', {
      theatreId: theatreId || null,
      categories: ['All', ...SNACK_CATEGORIES],
      total: snacks.length,
      snacks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Get standard snack categories
 */
const getCategories = async (req, res, next) => {
  try {
    return successResponse(res, 'Snack categories retrieved', {
      categories: SNACK_CATEGORIES,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all snacks including inactive & theatre-specific
 */
const adminGetAllSnacks = async (req, res, next) => {
  try {
    const { category, theatreId, search, status } = req.query;

    let filter = {};

    if (status === 'active') filter.isAvailable = true;
    if (status === 'inactive') filter.isAvailable = false;

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (theatreId && theatreId !== 'all') {
      filter.theatreId = theatreId === 'global' ? null : theatreId;
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const snacks = await Snack.find(filter)
      .populate('theatreId', 'name city district')
      .sort({ createdAt: -1 });

    return successResponse(res, 'All snacks retrieved for administration', {
      total: snacks.length,
      snacks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create a new snack product
 */
const createSnack = async (req, res, next) => {
  try {
    const {
      name,
      description,
      imageUrl,
      category,
      variant = 'Regular',
      price,
      isVeg = true,
      theatreId = null,
      isAvailable = true,
      stockQuantity = 100,
      trackStock = false,
      isDemoPrice = true,
    } = req.body;

    if (!name || price === undefined || !category) {
      return errorResponse(res, 'Name, category, and price are required', 400);
    }

    if (price < 0) {
      return errorResponse(res, 'Price cannot be negative', 400);
    }

    if (!SNACK_CATEGORIES.includes(category)) {
      return errorResponse(res, `Invalid category. Must be one of: ${SNACK_CATEGORIES.join(', ')}`, 400);
    }

    // Verify theatre if specified
    if (theatreId) {
      const theatreExists = await Theatre.findById(theatreId);
      if (!theatreExists) {
        return errorResponse(res, 'Specified theatre not found', 404);
      }
    }

    const snack = new Snack({
      name: name.trim(),
      description: (description || '').trim(),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500&auto=format&fit=crop&q=80',
      category,
      variant: variant || 'Regular',
      price: Number(price),
      isVeg: Boolean(isVeg),
      theatreId: theatreId || null,
      isAvailable: isAvailable !== false,
      stockQuantity: Number(stockQuantity) || 100,
      trackStock: Boolean(trackStock),
      isDemoPrice: isDemoPrice !== false,
    });

    await snack.save();

    return successResponse(res, 'Snack product created successfully', snack, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update an existing snack product
 */
const updateSnack = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const snack = await Snack.findById(id);
    if (!snack) {
      return errorResponse(res, 'Snack product not found', 404);
    }

    if (updates.category && !SNACK_CATEGORIES.includes(updates.category)) {
      return errorResponse(res, `Invalid category. Must be one of: ${SNACK_CATEGORIES.join(', ')}`, 400);
    }

    if (updates.price !== undefined && updates.price < 0) {
      return errorResponse(res, 'Price cannot be negative', 400);
    }

    // Assign updates
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        snack[key] = updates[key];
      }
    });

    await snack.save();

    return successResponse(res, 'Snack product updated successfully', snack);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Toggle snack availability
 */
const toggleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const snack = await Snack.findById(id);
    if (!snack) {
      return errorResponse(res, 'Snack product not found', 404);
    }

    snack.isAvailable = !snack.isAvailable;
    await snack.save();

    return successResponse(
      res,
      `Snack availability updated to ${snack.isAvailable ? 'available' : 'unavailable'}`,
      snack
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete snack product
 */
const deleteSnack = async (req, res, next) => {
  try {
    const { id } = req.params;
    const snack = await Snack.findByIdAndDelete(id);
    if (!snack) {
      return errorResponse(res, 'Snack product not found', 404);
    }

    return successResponse(res, 'Snack product deleted successfully', { id });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSnacks,
  getCategories,
  adminGetAllSnacks,
  createSnack,
  updateSnack,
  toggleAvailability,
  deleteSnack,
  SNACK_CATEGORIES,
};
