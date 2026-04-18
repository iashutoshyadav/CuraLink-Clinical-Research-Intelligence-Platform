import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max:      60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success:    false,
    error:      'Too many requests. Please wait before retrying.',
    retryAfter: 60,
  },
  skip: (req) => req.path === '/health',
});
