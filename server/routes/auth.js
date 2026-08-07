import express from 'express';
import { requireAuth, verifyToken } from '../middleware/authMiddleware.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Re-export middleware to preserve backward compatibility for existing references
export { requireAuth, verifyToken };

// Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authController.getCurrentUser);
router.put('/update-profile', authController.updateProfile);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

export default router;
