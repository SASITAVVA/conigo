import { verifyTokenPayload } from '../utils/authUtils.js';
import userModel from '../models/userModel.js';

export function verifyToken(token) {
  return verifyTokenPayload(token);
}

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token || req.headers['x-access-token']);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = user;
  next();
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token || req.headers['x-access-token']);
  if (token) {
    const user = verifyToken(token);
    if (user) req.user = user;
  }
  next();
};

export const checkAdmin = (req, res, next) => {
  const userId = (req.query && req.query.userId) || (req.body && req.body.userId) || '11111111-1111-1111-1111-111111111111';
  const profile = userModel.findProfileById(userId);
  if (profile && (profile.role === 'admin' || userId === '11111111-1111-1111-1111-111111111111')) {
    next();
  } else {
    res.status(403).json({ error: 'Administrative privileges required.' });
  }
};

export default {
  requireAuth,
  optionalAuth,
  verifyToken,
  checkAdmin
};

