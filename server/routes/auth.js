import express from 'express';
import { requireAuth, verifyToken } from '../middleware/authMiddleware.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Re-export middleware to preserve backward compatibility for existing references
export { requireAuth, verifyToken };

// Auth Routes
router.post('/sync-session', authController.syncSession);
router.get('/me', authController.getCurrentUser);
router.put('/update-profile', authController.updateProfile);

export default router;
