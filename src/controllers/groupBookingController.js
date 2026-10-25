const crypto = require('crypto');
const GroupBooking = require('../models/GroupBooking');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Create a new Group Booking session
 */
const createGroupBooking = async (req, res, next) => {
  try {
    const { showId, totalSeatsNeeded, title } = req.body;
    const initiatorId = req.user._id;

    if (!showId || !totalSeatsNeeded || totalSeatsNeeded < 2) {
      return errorResponse(res, 'ShowId and at least 2 seats are required for group booking', 400);
    }

    const show = await Show.findById(showId);
    if (!show) {
      return errorResponse(res, 'Showtime not found', 404);
    }

    const groupCode = 'GRP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    const group = new GroupBooking({
      groupCode,
      title: title || 'Movie Squad Night',
      showId,
      movieId: show.movieId,
      theatreId: show.theatreId,
      initiatorId,
      totalSeatsNeeded: Number(totalSeatsNeeded),
      members: [
        {
          userId: initiatorId,
          name: req.user.name,
          email: req.user.email,
          selectedSeats: [],
          shareAmount: 0,
          paymentStatus: 'pending',
        },
      ],
      expiresAt,
      status: 'forming',
    });

    await group.save();

    return successResponse(res, 'Group booking session created!', group, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Group Booking Details by Code
 */
const getGroupByCode = async (req, res, next) => {
  try {
    const { groupCode } = req.params;
    const group = await GroupBooking.findOne({ groupCode: groupCode.toUpperCase().trim() })
      .populate('movieId')
      .populate('theatreId')
      .populate('showId');

    if (!group) {
      return errorResponse(res, 'Group booking not found for code: ' + groupCode, 404);
    }

    return successResponse(res, 'Group details retrieved', group);
  } catch (error) {
    next(error);
  }
};

/**
 * Join Group & Add Member
 */
const joinGroup = async (req, res, next) => {
  try {
    const { groupCode } = req.params;
    const { name, email, seatNumbers } = req.body;
    const userId = req.user?._id || null;

    const group = await GroupBooking.findOne({ groupCode: groupCode.toUpperCase().trim() }).populate('showId');
    if (!group) {
      return errorResponse(res, 'Group not found', 404);
    }

    if (group.status !== 'forming') {
      return errorResponse(res, 'This group is already confirmed or closed', 400);
    }

    const memberName = name || req.user?.name || 'Guest Member';
    const memberEmail = email || req.user?.email || '';

    // Calculate share amount based on show pricing
    const seats = Array.isArray(seatNumbers) ? seatNumbers : [];
    const pricePerSeat = group.showId.pricing.standard;
    const shareAmount = seats.length * pricePerSeat;

    group.members.push({
      userId,
      name: memberName,
      email: memberEmail,
      selectedSeats: seats,
      shareAmount,
      paymentStatus: 'pending',
    });

    await group.save();
    return successResponse(res, 'Successfully joined group!', group);
  } catch (error) {
    next(error);
  }
};

/**
 * Simulate Member Contribution Payment
 */
const payMemberShare = async (req, res, next) => {
  try {
    const { groupCode } = req.params;
    const { memberEmail } = req.body;

    const group = await GroupBooking.findOne({ groupCode: groupCode.toUpperCase().trim() });
    if (!group) {
      return errorResponse(res, 'Group not found', 404);
    }

    const member = group.members.find(
      (m) => (m.email && m.email.toLowerCase() === memberEmail?.toLowerCase()) || (req.user && m.userId?.toString() === req.user._id.toString())
    );

    if (!member) {
      return errorResponse(res, 'Member not found in this group', 404);
    }

    member.paymentStatus = 'paid';
    member.demoTxnRef = 'DEMO-SPLIT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    member.paidAt = new Date();

    // Check if all members paid
    const allPaid = group.members.length >= group.totalSeatsNeeded && group.members.every((m) => m.paymentStatus === 'paid');
    if (allPaid) {
      group.status = 'confirmed';
    }

    await group.save();

    return successResponse(res, 'Simulated contribution payment recorded for ' + member.name, {
      member,
      allPaid,
      groupStatus: group.status,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroupBooking,
  getGroupByCode,
  joinGroup,
  payMemberShare,
};
