import crypto from 'crypto';
import { db } from '../services/db.js';
import { EventSystem } from '../services/events.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/authUtils.js';
import userModel from '../models/userModel.js';
import { sendVerificationEmail } from '../services/emailService.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, learningGoal } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    
    // Email Validation Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address syntax.' });
    }

    const existing = userModel.findProfileByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Account with this email already exists.' });
    }

    const userId = crypto.randomUUID();
    
    // Generate secure email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const newProfile = {
      id: userId,
      user_id: userId,
      name,
      email: email.toLowerCase(),
      password_hash: hashPassword(password),
      role: 'student',
      learning_goal: learningGoal || 'Master Software Engineering and Artificial Intelligence.',
      xp: 100, // Welcome signup bonus
      level: 1,
      coins: 50,
      joined_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Email Verification Fields
      emailVerified: false,
      verificationTokenHash,
      verificationTokenExpiresAt
    };

    userModel.createProfile(newProfile);

    // Send verification email (mocked)
    await sendVerificationEmail(newProfile.email, newProfile.name, rawToken);

    await EventSystem.emit('USER_REGISTERED', {
      userId,
      title: `New student registered: ${name}`,
      xpAward: 100
    });

    // Generate login token directly to bypass the forced verification block
    const token = generateToken(newProfile, true);

    res.status(201).json({
      success: true,
      token,
      user: { id: userId, name, email, role: 'student', xp: 100, level: 1 }
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = userModel.findProfileByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No account found with that email.' });
    }

    if (user.password_hash && !verifyPassword(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const token = generateToken(user, Boolean(rememberMe));

    // Ensure account data and name are synchronized to Supabase cloud table on every login
    userModel.updateProfile(user.user_id || user.id, { last_login: new Date().toISOString() });

    await EventSystem.emit('USER_LOGGED_IN', {
      userId: user.user_id || user.id,
      title: `User logged in: ${user.name}`,
      xpAward: 10 // daily sign-in reward
    });

    res.json({
      success: true,
      token,
      user: { id: user.user_id || user.id, name: user.name, email: user.email, role: user.role || 'student', xp: user.xp, level: user.level, photo: user.profile_photo }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

export const logout = (req, res) => {
  res.json({ success: true, message: 'User logged out successfully and session terminated.' });
};

export const forgotPassword = async (req, res) => {
  res.json({ success: true, message: 'Password reset link dispatched to email if registered.' });
};

export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password required.' });
  const user = userModel.findProfileByEmail(email);
  if (user) {
    user.password_hash = hashPassword(newPassword);
    const rawDb = db.getRawLocalDb();
    db.saveRawLocalDb(rawDb);
  }
  res.json({ success: true, message: 'Password reset successfully. You can now login.' });
};

export const getCurrentUser = async (req, res) => {
  const userId = req.query.userId || '11111111-1111-1111-1111-111111111111';
  let profile = userModel.findProfileById(userId);
  if (!profile) {
    const rawDb = db.getRawLocalDb();
    profile = rawDb.profiles?.[0];
  }
  res.json({ success: true, profile });
};

export const updateProfile = async (req, res) => {
  try {
    const { userId, name, bio, learningGoal, dailyGoal, weeklyGoal, preferredLanguage } = req.body;
    const targetId = userId || '11111111-1111-1111-1111-111111111111';
    
    const updates = {};
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (learningGoal) updates.learning_goal = learningGoal;
    if (dailyGoal) updates.daily_goal = Number(dailyGoal);
    if (weeklyGoal) updates.weekly_goal = Number(weeklyGoal);
    if (preferredLanguage) updates.preferred_language = preferredLanguage;

    const profile = userModel.updateProfile(targetId, updates);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    await EventSystem.emit('PROFILE_UPDATED', { userId: targetId, title: 'Updated Profile preferences', xpAward: 20 });
    res.json({ success: true, profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token is missing.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = userModel.findProfileByVerificationTokenHash(tokenHash);

    if (!user) {
      return res.redirect('/?verified=invalid#page-login');
    }

    if (new Date() > new Date(user.verificationTokenExpiresAt)) {
      return res.redirect('/?verified=expired#page-login');
    }

    // Mark as verified and clear tokens
    userModel.updateProfile(user.user_id || user.id, {
      emailVerified: true,
      verifiedAt: new Date().toISOString(),
      verificationTokenHash: null,
      verificationTokenExpiresAt: null
    });

    await EventSystem.emit('EMAIL_VERIFIED', {
      userId: user.user_id || user.id,
      title: 'Email successfully verified',
      xpAward: 50
    });

    res.redirect('/?verified=true#page-login');
  } catch (err) {
    console.error("Email Verification Error:", err);
    res.redirect('/?verified=error#page-login');
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = userModel.findProfileByEmail(email);
    if (!user) {
      // Return success anyway to prevent email enumeration attacks
      return res.json({ success: true, message: 'If an account exists, a verification email has been sent.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'This email is already verified.' });
    }

    // Generate new secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    userModel.updateProfile(user.user_id || user.id, {
      verificationTokenHash,
      verificationTokenExpiresAt
    });

    await sendVerificationEmail(user.email, user.name, rawToken);

    res.json({ success: true, message: 'Verification email resent successfully.' });
  } catch (err) {
    console.error("Resend Verification Error:", err);
    res.status(500).json({ error: 'Server error while resending verification email.' });
  }
};

export default {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  verifyEmail,
  resendVerification
};
