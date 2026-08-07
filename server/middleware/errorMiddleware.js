import logger from '../utils/logger.js';

// 404 Not Found handler for unassigned API routes
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
};

// Global unhandled error handler
export const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled execution error at ${req.method} ${req.originalUrl}:`, err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default {
  notFoundHandler,
  errorHandler
};
