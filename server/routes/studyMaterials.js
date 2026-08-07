import express from 'express';
import * as studyMaterialsController from '../controllers/studyMaterialsController.js';

const router = express.Router();

router.get('/all', studyMaterialsController.getStudyMaterials);
router.post('/flashcards/review', studyMaterialsController.reviewFlashcard);
router.post('/flashcards/update', studyMaterialsController.updateFlashcard);
router.post('/flashcards/bulk-save', studyMaterialsController.bulkSaveFlashcards);
router.post('/flashcards/ai-assist', studyMaterialsController.generateAiAssistInsight);
router.post('/bookmarks', studyMaterialsController.addBookmark);
router.delete('/bookmarks/:id', studyMaterialsController.deleteBookmark);
router.post('/goals', studyMaterialsController.setGoal);

export default router;
