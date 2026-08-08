import express from 'express';
import { checkAdmin } from '../middleware/authMiddleware.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// Analytics & Dashboard
router.get('/summary', checkAdmin, adminController.getAdminSummary);
router.get('/analytics', checkAdmin, adminController.getAnalytics);

// User Management
router.get('/users', checkAdmin, adminController.getUsers);
router.get('/users/:id', checkAdmin, adminController.getUserDetails);
router.put('/users/:id/status', checkAdmin, adminController.updateUserStatus);
router.delete('/users/:id', checkAdmin, adminController.deleteUser);

// Content Management
router.post('/courses', checkAdmin, adminController.createCourse);
router.post('/subjects', checkAdmin, adminController.createSubject);

export default router;
