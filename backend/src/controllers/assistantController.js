import { routeQuery } from '../services/queryRouter/queryRouter.js';
import { executeRetrievalPlan } from '../services/queryRouter/planExecutor.js';
import { generateGroundedAnswer } from '../services/rag/answerGenerator.js';

export const askAssistant = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question query text is required',
      });
    }

    const cleanQuestion = question.trim();

    // 1. Query Routing & Plan Generation
    const retrievalPlan = await routeQuery(cleanQuestion);

    // 2. Parallel Retrieval Execution
    const retrievalResult = await executeRetrievalPlan(retrievalPlan);

    // 3. Grounded Answer Synthesis
    const answerResult = await generateGroundedAnswer(cleanQuestion, retrievalResult);

    const totalTimeMs = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        question: cleanQuestion,
        answer: answerResult.answer,
        plan: retrievalPlan,
        sourcesUsed: retrievalResult.sourcesUsed,
        citations: answerResult.citations,
        evidenceFound: answerResult.evidenceFound,
        counts: {
          jobsCount: retrievalResult.retrievedData.jobs.length,
          experiencesCount: retrievalResult.retrievedData.experiences.length,
          leetcodeCount: retrievalResult.retrievedData.leetcode.length,
        },
        executionTimeMs: totalTimeMs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSuggestedQueries = (req, res) => {
  const suggestions = [
    {
      category: 'Historical Packages',
      query: 'Which companies offered packages above 15 LPA?',
      sources: ['jobs'],
    },
    {
      category: 'Interview Topics',
      query: 'What DSA topics were asked in Amazon interviews at DTU?',
      sources: ['experiences'],
    },
    {
      category: 'LeetCode Practice',
      query: 'Show Amazon medium-level LeetCode questions',
      sources: ['leetcode'],
    },
    {
      category: 'Multi-Source Comprehensive',
      query:
        'Which companies offered 15+ LPA, what were their interview experiences at DTU, and what LeetCode questions should I practice?',
      sources: ['jobs', 'experiences', 'leetcode'],
    },
    {
      category: 'Branch Specific',
      query: 'Which companies allowed COE and IT branches with CTC above 20 LPA?',
      sources: ['jobs'],
    },
    {
      category: 'Company Deep-Dive',
      query: 'Explain Microsoft interview experiences at DTU',
      sources: ['experiences'],
    },
  ];

  res.json({
    success: true,
    data: suggestions,
  });
};
