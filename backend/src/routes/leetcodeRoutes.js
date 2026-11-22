import express from 'express';
import { getLeetCodeQuestions } from '../controllers/leetcodeController.js';

const router = express.Router();

router.get('/', getLeetCodeQuestions);

export default router;
