import express from 'express';
import { getGamificationSummary, checkAndAwardBadges } from '../controllers/gamificationController.js';

const router = express.Router();

router.get('/summary', getGamificationSummary);

// Re-export checkAndAwardBadges to preserve compatibility with existing imports
export { checkAndAwardBadges };

export default router;
