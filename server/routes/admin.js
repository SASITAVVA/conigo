import express from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import {
    login, getStats, getUsers, getUserDetail,
    updateUser, deleteUser, getActivityLogs, getContent
} from '../controllers/adminController.js';

const router = express.Router();

// Public — no auth required
router.post('/login', login);

// All routes below require valid admin JWT
router.use(adminAuthMiddleware);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/activity-logs', getActivityLogs);
router.get('/content', getContent);

export default router;
