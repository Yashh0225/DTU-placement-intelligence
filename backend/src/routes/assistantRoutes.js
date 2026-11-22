import express from 'express';
import { askAssistant, getSuggestedQueries } from '../controllers/assistantController.js';

const router = express.Router();

router.post('/query', askAssistant);
router.get('/examples', getSuggestedQueries);

export default router;
