import express from 'express';
import * as quizController from '../controllers/quizController.js';

const router = express.Router();

router.post('/generate', quizController.generateQuiz);
router.post('/submit', quizController.submitQuiz);

export default router;
