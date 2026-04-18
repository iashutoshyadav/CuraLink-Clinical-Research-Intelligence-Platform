import logger from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode ?? err.status ?? 500;
  const message    = err.message ?? 'Internal Server Error';

  logger.error(`[${req.method}] ${req.path} → ${statusCode}: ${message}`, {
    stack: err.stack,
    body:  req.body,
  });

  res.status(statusCode).json({
    success: false,
    error:   message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

export function createError(message, statusCode = 500) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}
