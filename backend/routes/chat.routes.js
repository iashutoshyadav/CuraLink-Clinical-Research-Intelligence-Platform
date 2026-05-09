import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { handleChat } from '../controllers/chat.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

// Stricter per-user/IP limit on chat (10 req/min)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please wait before retrying.', retryAfter: 60 },
});

const sanitizeInputs = [
  body('query')
    .trim()
    .notEmpty().withMessage('Query is required')
    .isLength({ max: 2000 }).withMessage('Query too long')
    .escape(),
  body('disease')
    .trim()
    .notEmpty().withMessage('Disease is required')
    .isLength({ max: 200 }).withMessage('Disease name too long')
    .escape(),
  body('patientName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .escape(),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .escape(),
];

const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(createError(errors.array()[0].msg, 400));
  next();
};

router.post('/', optionalAuth, chatLimiter, sanitizeInputs, validate, handleChat);

export default router;
