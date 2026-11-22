import { LeetCodeQuestion } from '../models/LeetCodeQuestion.js';
import { normalizeCompanyName } from '../utils/normalize.js';

export const getLeetCodeQuestions = async (req, res, next) => {
  try {
    const { company, difficulty, topic, limit = 50, page = 1 } = req.query;

    const query = {};

    if (company) {
      query.companyNormalized = normalizeCompanyName(company);
    }

    if (difficulty) {
      query.difficulty = { $regex: new RegExp(`^${difficulty.trim()}$`, 'i') };
    }

    if (topic) {
      query.topics = { $in: [new RegExp(topic.trim(), 'i')] };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [questions, total] = await Promise.all([
      LeetCodeQuestion.find(query).sort({ frequency: -1, problemId: 1 }).skip(skip).limit(Number(limit)),
      LeetCodeQuestion.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: questions,
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
