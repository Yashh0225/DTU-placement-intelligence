import { extractJobFromAnnouncement } from '../services/gemini/jobExtractor.js';
import { importLeetCodeCsv } from '../services/ingestion/leetcodeImporter.js';
import { indexAllUnindexedExperiences } from '../services/embeddings/indexService.js';
import { Job } from '../models/Job.js';
import { normalizeCompanyName } from '../utils/normalize.js';
import path from 'path';

/**
 * Pipeline 1: Admin pastes WhatsApp placement announcement text.
 * Gemini extracts structured fields for review.
 */
export const extractJob = async (req, res, next) => {
  try {
    const { announcementText } = req.body;
    if (!announcementText) {
      return res.status(400).json({
        success: false,
        message: 'Original announcement text is required',
      });
    }

    const extracted = await extractJobFromAnnouncement(announcementText);

    res.json({
      success: true,
      data: {
        ...extracted,
        originalMessage: announcementText,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pipeline 4: Import LeetCode CSV dataset
 */
export const importLeetCode = async (req, res, next) => {
  try {
    const { filePath, defaultCompany } = req.body;

    const targetPath = filePath
      ? path.resolve(filePath)
      : path.resolve('data/leetcode_sample.csv');

    const result = await importLeetCodeCsv(targetPath, defaultCompany);

    res.json({
      success: true,
      message: 'LeetCode dataset imported successfully without duplicates',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Re-indexes all experiences
 */
export const reindexExperiences = async (req, res, next) => {
  try {
    const result = await indexAllUnindexedExperiences();
    res.json({
      success: true,
      message: 'Experiences indexing completed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
