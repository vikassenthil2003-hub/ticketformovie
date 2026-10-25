const { verifyToken } = require('../utils/jwtHelper');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Protect routes: verify JWT Bearer token
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 'Authentication required. No token provided.', 401);
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return errorResponse(res, 'Invalid or expired token. Please log in again.', 401);
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return errorResponse(res, 'User account not found. Please log in again.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, 'Authentication failed: ' + err.message, 401);
  }
};

/**
 * Role-Based Access Control Middleware
 * @param  {...string} roles Allowed roles ('admin', 'theatre', 'user')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', 401);
    }

    const userRole = (req.user.role || '').toLowerCase().trim();
    const normalizedRoles = roles.map((r) => r.toLowerCase().trim());

    if (!normalizedRoles.includes(userRole)) {
      return errorResponse(
        res,
        `Access forbidden. Required role: [${roles.join(', ')}]. Your account role is '${req.user.role}'.`,
        403
      );
    }

    next();
  };
};

/**
 * Protect theatre routes - ensure theatre staff only interacts with assigned theatre
 */
const requireTheatreAccess = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required.', 401);
  }

  const userRole = (req.user.role || '').toLowerCase().trim();

  // Admin has access to all theatres
  if (userRole === 'admin') {
    return next();
  }

  if (userRole === 'theatre') {
    const requestedTheatreId = req.params.theatreId || req.body.theatreId || req.query.theatreId;
    if (requestedTheatreId && req.user.assignedTheatre && req.user.assignedTheatre.toString() !== requestedTheatreId.toString()) {
      return errorResponse(res, 'Access denied. You can only manage your assigned theatre.', 403);
    }
    return next();
  }

  return errorResponse(res, 'Access forbidden. Theatre staff or Administrator privileges required.', 403);
};

/**
 * Customer-only authorization middleware
 * Requirement: Admin must NOT be able to book movie tickets. Only customers can book tickets.
 * Rejects admin accounts with HTTP 403 Forbidden and the exact message:
 * "Admins are not allowed to book movie tickets. Please use a customer account."
 */
const requireCustomer = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required.', 401);
  }

  const userRole = (req.user.role || '').toLowerCase().trim();

  if (userRole === 'admin') {
    return errorResponse(
      res,
      'Admins are not allowed to book movie tickets. Please use a customer account.',
      403
    );
  }

  if (userRole !== 'user') {
    return errorResponse(
      res,
      'Access forbidden. Only customer accounts can book movie tickets.',
      403
    );
  }

  next();
};

module.exports = {
  protect,
  requireRole,
  requireTheatreAccess,
  requireCustomer,
};
