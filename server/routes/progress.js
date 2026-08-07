import express from 'express';
import * as progressController from '../controllers/progressController.js';

const router = express.Router();

router.get('/summary', progressController.getProgressSummary);
router.post('/update', progressController.updateProgress);

export default router;
