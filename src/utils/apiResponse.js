/**
 * Standardized API Response helpers
 */
const successResponse = (res, message = 'Success', data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const payload = {
    success: false,
    message,
  };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

const paginatedResponse = (res, message = 'Success', data = [], pagination = {}, statusCode = 200) => {
  let paginationObj = pagination;
  if (typeof pagination === 'number') {
    const page = pagination;
    const limit = typeof arguments[4] === 'number' ? arguments[4] : 20;
    const total = typeof arguments[5] === 'number' ? arguments[5] : data.length;
    paginationObj = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: paginationObj,
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
};
