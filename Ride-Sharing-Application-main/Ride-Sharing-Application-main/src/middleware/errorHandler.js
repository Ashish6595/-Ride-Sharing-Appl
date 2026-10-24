const logger = require('../utils/logger');

/**
 * Global application error handling middleware.
 */
function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.url} - ${err.message}`, err.stack);

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors && err.errors[0] ? err.errors[0].path : 'Field';
    return res.status(409).json({
      success: false,
      message: `${field} already exists in the system.`,
      errors: err.errors.map((e) => e.message)
    });
  }

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed for submitted data.',
      errors: err.errors.map((e) => e.message)
    });
  }

  // Default Internal Server Error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 404 Route Not Found Middleware
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found on endpoint: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
