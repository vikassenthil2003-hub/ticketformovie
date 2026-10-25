const { errorResponse } = require('../utils/apiResponse');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error caught by global middleware]:', err);

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return errorResponse(res, `A record with this ${field} already exists.`, 409);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return errorResponse(res, messages.join(', '), 400);
  }

  // Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    return errorResponse(res, `Resource not found with id: ${err.value}`, 404);
  }

  // Database Connection / Service Unavailable Error
  if (
    err.name === 'MongooseError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTimeoutError'
  ) {
    return errorResponse(
      res,
      'Database service is temporarily unavailable. Please try again later.',
      503
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token. Please log in again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired. Please log in again.', 401);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, message, statusCode);
};

module.exports = errorHandler;

