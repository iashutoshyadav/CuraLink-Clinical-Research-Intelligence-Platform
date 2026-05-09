import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.model.js';
import { signToken, verifyToken } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(createError(errors.array()[0].msg, 400));
  next();
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return next(createError('Email already registered', 409));

      const user = await User.create({ name, email, password });
      const token = signToken({ id: user._id.toString(), email: user.email });
      res.status(201).json({ token, user: user.toSafeObject() });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return next(createError('Invalid email or password', 401));
      }
      const token = signToken({ id: user._id.toString(), email: user.email });
      res.json({ token, user: user.toSafeObject() });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return next(createError('User not found', 404));
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

export default router;
