import express from 'express';
import { checkAdmin } from '../middleware/authMiddleware.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

router.get('/summary', checkAdmin, adminController.getAdminSummary);
router.post('/courses', checkAdmin, adminController.createCourse);
router.post('/subjects', checkAdmin, adminController.createSubject);
router.delete('/users/:id', checkAdmin, adminController.deleteUser);

export default router;
