import express from 'express';
import * as studySessionsController from '../controllers/studySessionsController.js';

const router = express.Router();

router.post('/start', studySessionsController.startSession);
router.post('/end', studySessionsController.endSession);
router.get('/history', studySessionsController.getSessionHistory);

export default router;
