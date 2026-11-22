import express from 'express';
import { getCompanies, getDashboardStats } from '../controllers/companyController.js';

const router = express.Router();

router.get('/', getCompanies);
router.get('/stats', getDashboardStats);

export default router;
