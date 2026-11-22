import express from 'express';
import {
  getExperiences,
  getExperienceById,
  createExperience,
  extractExperience,
} from '../controllers/experienceController.js';

const router = express.Router();

router.get('/', getExperiences);
router.get('/:id', getExperienceById);
router.post('/extract', extractExperience);
router.post('/', createExperience);

export default router;
