import { LeetCodeQuestion } from '../../models/LeetCodeQuestion.js';
import { normalizeCompanyName } from '../../utils/normalize.js';

/**
 * LeetCode Structured Retrieval Service
 * Executes deterministic MongoDB queries for company-tagged preparation problems.
 * Does NOT embed the LeetCode dataset.
 *
 * @param {object} criteria
 * @param {string} [criteria.company] - Company name
 * @param {string} [criteria.difficulty] - 'Easy', 'Medium', 'Hard'
 * @param {string|string[]} [criteria.topics] - Algorithmic topics
 * @param {number} [criteria.minFrequency] - Minimum frequency score
 * @param {number} [criteria.limit=15] - Maximum problems to return
 * @returns {Promise<Array<object>>} - Company-wise LeetCode problems
 */
export const searchLeetCode = async (criteria = {}) => {
  const { company, difficulty, topics, minFrequency, limit = 15 } = criteria;

  const filter = {};

  if (company) {
    filter.companyNormalized = normalizeCompanyName(company);
  }

  if (difficulty) {
    filter.difficulty = { $regex: new RegExp(`^${difficulty.trim()}$`, 'i') };
  }

  if (minFrequency !== undefined && !isNaN(Number(minFrequency))) {
    filter.frequency = { $gte: Number(minFrequency) };
  }

  if (topics) {
    const topicList = Array.isArray(topics) ? topics : [topics];
    const regexList = topicList.map((t) => new RegExp(t.trim(), 'i'));
    filter.topics = { $in: regexList };
  }

  const questions = await LeetCodeQuestion.find(filter)
    .sort({ frequency: -1, problemId: 1 })
    .limit(Math.min(Number(limit), 50))
    .lean();

  return questions.map((q) => ({
    sourceId: String(q._id),
    sourceType: 'leetcode_preparation',
    problemId: q.problemId,
    title: q.title,
    difficulty: q.difficulty,
    company: q.company,
    acceptanceRate: q.acceptanceRate,
    frequency: q.frequency,
    url: q.url,
    topics: q.topics,
    disclaimer: 'Company-tagged preparation data, not verified DTU interview questions',
  }));
};
