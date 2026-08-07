import express from 'express';
import * as notesController from '../controllers/notesController.js';

const router = express.Router();

router.post('/verify-and-sync', notesController.verifyAndSyncNote);
router.post('/task', notesController.processTask);

export default router;
