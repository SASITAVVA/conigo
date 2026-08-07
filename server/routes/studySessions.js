import express from 'express';
import * as studySessionsController from '../controllers/studySessionsController.js';

const router = express.Router();

router.post('/heartbeat', studySessionsController.recordHeartbeat);
router.get('/history', studySessionsController.getSessionHistory);
router.post('/record-activity', studySessionsController.recordActivity);

export default router;
