import { Experience } from '../models/Experience.js';
import { normalizeCompanyName } from '../utils/normalize.js';
import { extractExperienceFromNarrative } from '../services/gemini/experienceExtractor.js';
import { indexExperience } from '../services/embeddings/indexService.js';

/**
 * Pipeline 2: Student enters narrative text -> Gemini extracts structured details for review.
 */
export const extractExperience = async (req, res, next) => {
  try {
    const { narrative, company, role, placementYear } = req.body;
    if (!narrative) {
      return res.status(400).json({
        success: false,
        message: 'Interview narrative text is required for extraction',
      });
    }

    const extracted = await extractExperienceFromNarrative(narrative);

    res.json({
      success: true,
      data: {
        company: company || '',
        role: role || '',
        placementYear: placementYear ? Number(placementYear) : new Date().getFullYear(),
        originalNarrative: narrative,
        extractedStructure: extracted,
        submissionType: 'narrative_llm',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExperiences = async (req, res, next) => {
  try {
    const { company, role, year, topic, moderationStatus = 'verified', limit = 50, page = 1 } = req.query;

    const query = {};

    if (company) {
      query.companyNormalized = normalizeCompanyName(company);
    }

    if (role) {
      query.role = { $regex: role.trim(), $options: 'i' };
    }

    if (year) {
      query.placementYear = Number(year);
    }

    if (moderationStatus && moderationStatus !== 'all') {
      query.moderationStatus = moderationStatus;
    }

    if (topic) {
      query['extractedStructure.dsaTopics'] = { $in: [new RegExp(topic.trim(), 'i')] };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [experiences, total] = await Promise.all([
      Experience.find(query).sort({ placementYear: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      Experience.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: experiences,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExperienceById = async (req, res, next) => {
  try {
    const experience = await Experience.findById(req.params.id);
    if (!experience) {
      return res.status(404).json({ success: false, message: 'Experience record not found' });
    }
    res.json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};

export const createExperience = async (req, res, next) => {
  try {
    const {
      company,
      role,
      placementYear,
      originalNarrative,
      extractedStructure,
      submissionType = 'structured_direct',
      studentConfirmed = true,
      moderationStatus = 'verified',
    } = req.body;

    if (!company || !role || !placementYear || !originalNarrative) {
      return res.status(400).json({
        success: false,
        message: 'Company, role, placement year, and original narrative are required',
      });
    }

    const companyNormalized = normalizeCompanyName(company);

    const experience = await Experience.create({
      company: company.trim(),
      companyNormalized,
      role: role.trim(),
      placementYear: Number(placementYear),
      originalNarrative,
      extractedStructure: extractedStructure || {
        roundsCount: 0,
        rounds: [],
        dsaTopics: [],
        csFundamentals: [],
        projectDiscussion: '',
        hrQuestions: [],
        difficulty: 'Medium',
        overallVerdict: 'Selected',
      },
      submissionType,
      studentConfirmed: Boolean(studentConfirmed),
      moderationStatus,
    });

    // Automatically trigger chunking & embedding indexing
    try {
      await indexExperience(experience._id);
    } catch (indexingErr) {
      console.warn(`[Indexing Warning for Experience ${experience._id}]:`, indexingErr.message);
    }

    res.status(201).json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};
