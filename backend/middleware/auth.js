import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';

const SECRET = process.env.JWT_SECRET || 'curalink_dev_secret_change_in_prod';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(createError('No token provided', 401));

  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    next(createError('Invalid or expired token', 401));
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), SECRET); } catch {}
  }
  next();
}
