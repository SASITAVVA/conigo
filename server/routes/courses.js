import express from 'express';
import { getAllCourses } from '../controllers/coursesController.js';

const router = express.Router();

router.get('/all', getAllCourses);

export default router;
