import { deterministicRoute } from './deterministicRouter.js';
import { geminiRoute } from './geminiRouter.js';
import { retrievalPlanSchema } from './planSchema.js';

/**
 * Hybrid Query Router:
 * 1. Checks deterministic rules for clear structured, semantic, or multi-source queries.
 * 2. Uses Gemini for ambiguous, highly conversational, or nuanced queries.
 * 3. Enforces strict schema validation with Zod.
 *
 * @param {string} userQuery
 * @returns {Promise<object>} - Validated RetrievalPlan
 */
export const routeQuery = async (userQuery) => {
  if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
    throw new Error('User query is required for routing');
  }

  const query = userQuery.trim();

  // Try Gemini router first if configured and not a simple single-term query
  let rawPlan = null;
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    rawPlan = await geminiRoute(query);
  }

  // Fallback to deterministic router if Gemini is not configured or returned null
  if (!rawPlan) {
    rawPlan = deterministicRoute(query);
  }

  // Ensure userQuery is set
  rawPlan.userQuery = query;

  // Sanitize plan fields against LLM quirks (e.g. empty strings, zero limits)
  if (rawPlan.plan) {
    if (rawPlan.plan.experiences) {
      if (!rawPlan.plan.experiences.queryText) {
        rawPlan.plan.experiences.queryText = query;
      }
      if (typeof rawPlan.plan.experiences.limit !== 'number' || rawPlan.plan.experiences.limit < 1) {
        rawPlan.plan.experiences.limit = rawPlan.plan.experiences.enabled ? 5 : 0;
      }
    }
    if (rawPlan.plan.jobs) {
      if (typeof rawPlan.plan.jobs.limit !== 'number' || rawPlan.plan.jobs.limit < 1) {
        rawPlan.plan.jobs.limit = rawPlan.plan.jobs.enabled ? 10 : 0;
      }
    }
    if (rawPlan.plan.leetcode) {
      if (typeof rawPlan.plan.leetcode.limit !== 'number' || rawPlan.plan.leetcode.limit < 1) {
        rawPlan.plan.leetcode.limit = rawPlan.plan.leetcode.enabled ? 15 : 0;
      }
    }
  }

  // Validate plan with Zod schema
  const validatedPlan = retrievalPlanSchema.parse(rawPlan);
  return validatedPlan;
};
