import { getGeminiModel } from '../gemini/geminiClient.js';
import { buildRAGContext } from './contextBuilder.js';

/**
 * Deterministic grounded answer generator for test/offline environments
 */
const generateDeterministicGroundedAnswer = (userQuery, retrievalResult) => {
  const { retrievedData, sourcesUsed } = retrievalResult;
  const parts = [];
  const citations = [];

  const hasJobs = retrievedData.jobs && retrievedData.jobs.length > 0;
  const hasExp = retrievedData.experiences && retrievedData.experiences.length > 0;
  const hasLc = retrievedData.leetcode && retrievedData.leetcode.length > 0;

  if (!hasJobs && !hasExp && !hasLc) {
    return {
      answer: `No historical placement records, student experiences, or preparation problems were found matching your query: "${userQuery}". Please verify the company name or criteria.`,
      citations: [],
      evidenceFound: false,
    };
  }

  // Part 1: Jobs
  if (hasJobs) {
    const jobList = retrievedData.jobs.map((j) => {
      citations.push({
        id: j.sourceId,
        type: 'job_announcement',
        title: `${j.company} - ${j.role}`,
        details: `${j.ctc ? `${j.ctc} LPA` : 'Stipend'} | Branches: ${j.eligibleBranches?.join(', ') || 'All'}`,
      });
      return `• **${j.company}** offered **${j.ctc ? `${j.ctc} LPA` : 'Stipend'}** for the **${j.role}** role (Eligible: ${j.eligibleBranches?.join(', ') || 'Open'}). [Job #${j.sourceId}]`;
    });
    parts.push(`### Historical Placement Records\nBased on official announcements:\n${jobList.join('\n')}`);
  }

  // Part 2: Experiences
  if (hasExp) {
    const expList = retrievedData.experiences.map((e) => {
      citations.push({
        id: e.sourceId,
        type: 'student_experience',
        title: `${e.company} Interview Experience`,
        details: `${e.role} (${e.placementYear}) - ${e.section}`,
      });
      return `• **${e.company} (${e.role}, ${e.placementYear})**: ${e.chunkText.substring(0, 200)}... [Experience #${e.sourceId}]`;
    });
    parts.push(`### Student Interview Experiences at DTU\nFrom student reports:\n${expList.join('\n')}`);
  }

  // Part 3: LeetCode
  if (hasLc) {
    const lcList = retrievedData.leetcode.slice(0, 8).map((q) => {
      citations.push({
        id: String(q.problemId || q.sourceId),
        type: 'leetcode_preparation',
        title: q.title,
        details: `${q.company} | ${q.difficulty} | ${q.topics?.join(', ')}`,
      });
      return `• **${q.title}** (${q.difficulty}) - Topics: ${q.topics?.join(', ') || 'General'}. [LeetCode #${q.problemId || q.sourceId}]`;
    });
    parts.push(`### Recommended LeetCode Practice (Third-Party)\n*Note: These are company-tagged LeetCode preparation questions, not verified DTU questions.*\n${lcList.join('\n')}`);
  }

  return {
    answer: parts.join('\n\n'),
    citations,
    evidenceFound: true,
  };
};

/**
 * Generate Grounded RAG Answer using Gemini or deterministic fallback
 *
 * @param {string} userQuery
 * @param {object} retrievalResult
 * @returns {Promise<object>} - { answer, citations, evidenceFound, rawContext }
 */
export const generateGroundedAnswer = async (userQuery, retrievalResult) => {
  const context = buildRAGContext(retrievalResult);
  const model = getGeminiModel();

  if (!model) {
    const deterministic = generateDeterministicGroundedAnswer(userQuery, retrievalResult);
    return {
      ...deterministic,
      rawContext: context,
    };
  }

  try {
    const systemPrompt = `You are the DTU Placement Intelligence Assistant.
Provide a clear, cohesive, professional answer grounded exclusively in the provided context.
Follow the Grounding Instructions strictly:
- Distinguish historical announcements from student experiences and third-party LeetCode preparation problems.
- Never hallucinate missing data.
- If no evidence exists for a company or topic, explicitly state that records are unavailable.
- Reference supporting IDs in square brackets (e.g. [Job #id], [Experience #id], [LeetCode #id]).`;

    const prompt = `${systemPrompt}\n\n${context}`;
    const result = await model.generateContent(prompt);
    const answerText = result.response.text().trim();

    // Collect citations from retrieved data
    const citations = [];
    if (retrievalResult.retrievedData.jobs) {
      retrievalResult.retrievedData.jobs.forEach((j) => {
        citations.push({
          id: j.sourceId,
          type: 'job_announcement',
          title: `${j.company} - ${j.role}`,
          details: `${j.ctc ? `${j.ctc} LPA` : 'Stipend'} | Branches: ${j.eligibleBranches?.join(', ') || 'All'}`,
        });
      });
    }

    if (retrievalResult.retrievedData.experiences) {
      retrievalResult.retrievedData.experiences.forEach((e) => {
        citations.push({
          id: e.sourceId,
          type: 'student_experience',
          title: `${e.company} Interview Experience`,
          details: `${e.role} (${e.placementYear})`,
        });
      });
    }

    if (retrievalResult.retrievedData.leetcode) {
      retrievalResult.retrievedData.leetcode.forEach((q) => {
        citations.push({
          id: String(q.problemId || q.sourceId),
          type: 'leetcode_preparation',
          title: q.title,
          details: `${q.company} | ${q.difficulty}`,
        });
      });
    }

    const hasAnyData =
      (retrievalResult.retrievedData.jobs?.length || 0) +
      (retrievalResult.retrievedData.experiences?.length || 0) +
      (retrievalResult.retrievedData.leetcode?.length || 0) > 0;

    return {
      answer: answerText,
      citations,
      evidenceFound: hasAnyData,
      rawContext: context,
    };
  } catch (err) {
    console.warn('[Gemini Answer Generation Error, falling back to deterministic answer]:', err.message);
    const deterministic = generateDeterministicGroundedAnswer(userQuery, retrievalResult);
    return {
      ...deterministic,
      rawContext: context,
    };
  }
};
