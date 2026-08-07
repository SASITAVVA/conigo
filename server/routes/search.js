import express from 'express';
import { globalSearch } from '../controllers/searchController.js';

const router = express.Router();

// Global unified search endpoint
router.get('/', globalSearch);

export default router;
