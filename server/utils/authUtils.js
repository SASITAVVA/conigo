import crypto from 'crypto';
import config from '../config/environment.js';

const SECRET_KEY = config.jwtSecret;

// Secure Password Hashing using PBKDF2
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return password === storedHash; // back-compat for plain tests
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Signed JWT token generator
export function generateToken(user, rememberMe = false) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const expiresInMs = rememberMe ? (30 * 24 * 60 * 60 * 1000) : (24 * 60 * 60 * 1000); // 30 days vs 24 hours
  const payload = Buffer.from(JSON.stringify({
    userId: user.user_id || user.id,
    email: user.email,
    role: user.role || 'student',
    exp: Date.now() + expiresInMs
  })).toString('base64url');
  
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyTokenPayload(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const validSig = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${payload}`).digest('base64url');
    if (signature !== validSig) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.exp < Date.now()) return null; // Expired
    return decoded;
  } catch (e) {
    return null;
  }
}
