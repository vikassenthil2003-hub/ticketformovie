const Coupon = require('../models/Coupon');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Validate a Coupon Code for Checkout
 */
const validateCoupon = async (req, res, next) => {
  try {
    const { code, amount } = req.body;

    if (!code) {
      return errorResponse(res, 'Coupon code is required', 400);
    }

    const subtotal = Number(amount) || 0;
    const now = new Date();

    const coupon = await Coupon.findOne({
      code: code.toUpperCase().trim(),
      isActive: true,
      validUntil: { $gt: now },
    });

    if (!coupon) {
      return errorResponse(res, 'Invalid or expired promo code', 400);
    }

    if (subtotal < coupon.minOrderValue) {
      return errorResponse(
        res,
        `This coupon requires a minimum subtotal of ₹${coupon.minOrderValue}. Your subtotal is ₹${subtotal}.`,
        400
      );
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      const calculated = (subtotal * coupon.discountValue) / 100;
      discount = Math.min(calculated, coupon.maxDiscount);
    } else {
      discount = Math.min(coupon.discountValue, subtotal);
    }

    discount = Math.round(discount);

    return successResponse(res, `Coupon '${coupon.code}' applied successfully!`, {
      code: coupon.code,
      discount,
      description: coupon.description,
      finalAmount: Math.max(0, subtotal - discount),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Available Coupons (Public for Checkout Offers)
 */
const getActiveCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      validUntil: { $gt: new Date() },
    }).select('code description discountType discountValue minOrderValue maxDiscount validUntil');

    return successResponse(res, 'Active coupons retrieved', coupons);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create Coupon
 */
const createCoupon = async (req, res, next) => {
  try {
    const { code, description, discountType, discountValue, minOrderValue, maxDiscount, validUntil } = req.body;

    if (!code || !discountValue || !validUntil) {
      return errorResponse(res, 'Code, discountValue, and validUntil date are required', 400);
    }

    const coupon = new Coupon({
      code: code.toUpperCase().trim(),
      description: description || 'Special Promotional Offer',
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue) || 200,
      maxDiscount: Number(maxDiscount) || 150,
      validUntil: new Date(validUntil),
    });

    await coupon.save();
    return successResponse(res, 'Coupon created successfully', coupon, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete Coupon
 */
const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return errorResponse(res, 'Coupon not found', 404);
    }
    return successResponse(res, 'Coupon deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get All Coupons
 */
const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return successResponse(res, 'All coupons retrieved', coupons);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateCoupon,
  getActiveCoupons,
  getAllCoupons,
  createCoupon,
  deleteCoupon,
};
