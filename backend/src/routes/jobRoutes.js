import express from 'express';
import { getJobs, getJobById, createJob, bulkImportJobs } from '../controllers/jobController.js';

const router = express.Router();

router.get('/', getJobs);
router.post('/bulk', bulkImportJobs);
router.get('/:id', getJobById);
router.post('/', createJob);

export default router;
