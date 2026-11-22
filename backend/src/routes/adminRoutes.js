import express from 'express';
import { extractJob, importLeetCode, reindexExperiences } from '../controllers/adminController.js';

const router = express.Router();

// Admin review extraction for WhatsApp announcement
router.post('/extract-job', extractJob);

// Admin LeetCode CSV import
router.post('/import-leetcode', importLeetCode);

// Admin re-index experiences into vector store
router.post('/reindex-experiences', reindexExperiences);

export default router;
