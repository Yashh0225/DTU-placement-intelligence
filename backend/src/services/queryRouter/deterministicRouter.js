import { normalizeCompanyName } from '../../utils/normalize.js';

/**
 * Deterministic router: Fast rule & regex matching for structured, semantic,
 * and multi-source intent detection without LLM overhead.
 */
export const deterministicRoute = (query) => {
  if (!query || typeof query !== 'string') return null;

  const text = query.trim();
  const lower = text.toLowerCase();

  // 1. Detect Company
  const knownCompanies = [
    'amazon', 'microsoft', 'google', 'uber', 'adobe', 'goldman sachs',
    'atlassian', 'de shaw', 'flipkart', 'paytm', 'salesforce', 'apple',
    'meta', 'oracle', 'tower research', 'sprinklr', 'directi'
  ];
  let matchedCompany = null;
  for (const comp of knownCompanies) {
    if (new RegExp(`\\b${comp}\\b`, 'i').test(lower)) {
      matchedCompany = comp.charAt(0).toUpperCase() + comp.slice(1);
      break;
    }
  }

  // Generic company pattern match if not in knownCompanies
  if (!matchedCompany) {
    // Match capitalized proper nouns (case-sensitive on initial letter)
    const compMatch = text.match(/(?:about|explain|for|in|at)\s+([A-Z][a-zA-Z0-9&.\-]+(?:\s+[A-Z][a-zA-Z0-9&.\-]+)?)/) ||
      text.match(/\b([A-Z][a-zA-Z0-9&.\-]+(?:\s+[A-Z][a-zA-Z0-9&.\-]+)?)\s+(?:interview|placement|hiring|recruitment|test|oa|questions)/);

    if (compMatch) {
      const candidate = compMatch[1].trim();
      const skipWords = [
        'what', 'which', 'show', 'explain', 'tell', 'how', 'find', 'the', 'dtu',
        'all', 'any', 'were', 'their', 'our', 'his', 'her', 'this', 'that', 'these', 'those', 'some', 'dsa'
      ];
      if (!skipWords.includes(candidate.toLowerCase())) {
        matchedCompany = candidate;
      }
    }
  }

  // 2. Detect CTC / Salary filters
  const ctcMatch = text.match(/(?:above|more than|greater than|>=?)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lakhs)?/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:\+|plus)\s*(?:lpa|lakh|lakhs)?/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:lpa|lakh|lakhs)/i) ||
    text.match(/(?:ctc|package|salary|stipend)\s*(?:above|>|>=?)\s*(\d+(?:\.\d+)?)/i);

  const minCtc = ctcMatch ? parseFloat(ctcMatch[1]) : null;

  // 3. Detect Branch
  const branchMatch = text.match(/\b(coe|it|se|ece|ee|me|ce|ep|ene|mam|bt)\b/i);
  const branch = branchMatch ? branchMatch[1].toUpperCase() : null;

  // 4. Intent signals
  const hasJobSignal = Boolean(
    minCtc !== null ||
    branch !== null ||
    /\b(ctc|package|salary|stipend|placed|eligib|cgpa|hiring|batch|full[- ]time|internship|ppo)\b/i.test(lower)
  );

  const hasExperienceSignal = Boolean(
    /\b(interview|rounds?|asked|questions? asked|experience|dsa|system design|topics?|technical round|oa|hr)\b/i.test(lower)
  );

  const hasLeetcodeSignal = Boolean(
    /\b(leetcode|practice|problem|solve|coding questions?|easy|medium|hard)\b/i.test(lower)
  );

  // Determine needed sources
  const sources = [];
  if (hasJobSignal) sources.push('jobs');
  if (hasExperienceSignal) sources.push('experiences');
  if (hasLeetcodeSignal) sources.push('leetcode');

  // If no clear signal, default to experiences semantic search
  if (sources.length === 0) {
    sources.push('experiences');
  }

  // Detect difficulty for LeetCode
  let difficulty = null;
  if (/\bmedium\b/i.test(lower)) difficulty = 'Medium';
  else if (/\beasy\b/i.test(lower)) difficulty = 'Easy';
  else if (/\bhard\b/i.test(lower)) difficulty = 'Hard';

  const plan = {
    userQuery: text,
    intentSummary: `Deterministic route covering [${sources.join(', ')}]`,
    sources,
    plan: {},
  };

  if (sources.includes('jobs')) {
    plan.plan.jobs = {
      enabled: true,
      company: matchedCompany,
      minCtc: minCtc,
      maxCtc: null,
      branch: branch,
      batch: null,
      role: null,
      type: null,
      limit: 10,
    };
  }

  if (sources.includes('experiences')) {
    plan.plan.experiences = {
      enabled: true,
      queryText: text,
      company: matchedCompany,
      role: null,
      year: null,
      limit: 5,
    };
  }

  if (sources.includes('leetcode')) {
    plan.plan.leetcode = {
      enabled: true,
      company: matchedCompany,
      difficulty,
      topics: null,
      limit: 10,
    };
  }

  return plan;
};
