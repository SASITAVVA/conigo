import express from 'express';
import { processDocument } from '../controllers/documentsController.js';
import { validateDocumentUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/process', validateDocumentUpload, processDocument);

export default router;
