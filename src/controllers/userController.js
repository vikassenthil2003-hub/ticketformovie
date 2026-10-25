const Watchlist = require('../models/Watchlist');
const RewardTransaction = require('../models/RewardTransaction');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Get User Watchlist
 */
const getWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const items = await Watchlist.find({ userId }).populate('movieId').sort({ createdAt: -1 });
    const movies = items.map((i) => i.movieId).filter(Boolean);
    return successResponse(res, 'Watchlist retrieved', movies);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle Movie in Watchlist
 */
const toggleWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { movieId } = req.body;

    if (!movieId) {
      return errorResponse(res, 'MovieId is required', 400);
    }

    const existing = await Watchlist.findOne({ userId, movieId });
    if (existing) {
      await Watchlist.deleteOne({ _id: existing._id });
      return successResponse(res, 'Removed from watchlist', { isSaved: false, movieId });
    } else {
      await Watchlist.create({ userId, movieId });
      return successResponse(res, 'Added to watchlist', { isSaved: true, movieId });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get Rewards & Points History
 */
const getRewards = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('rewardPoints membershipTier referralCode');
    const transactions = await RewardTransaction.find({ userId }).sort({ createdAt: -1 }).limit(20);

    return successResponse(res, 'User rewards data retrieved', {
      rewardPoints: user.rewardPoints,
      membershipTier: user.membershipTier,
      referralCode: user.referralCode,
      history: transactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWatchlist,
  toggleWatchlist,
  getRewards,
};
