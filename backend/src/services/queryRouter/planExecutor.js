import { searchJobs } from '../retrieval/jobRetrievalService.js';
import { searchExperiences } from '../retrieval/experienceRetrievalService.js';
import { searchLeetCode } from '../retrieval/leetcodeRetrievalService.js';

/**
 * Plan Executor:
 * Takes a validated RetrievalPlan and executes retrieval tasks in parallel.
 * NEVER allows execution of arbitrary queries.
 *
 * @param {object} retrievalPlan - Validated RetrievalPlan
 * @returns {Promise<object>} - Aggregated results by source
 */
export const executeRetrievalPlan = async (retrievalPlan) => {
  const startTime = Date.now();
  const { plan, sources, userQuery, intentSummary } = retrievalPlan;

  const tasks = [];
  const results = {
    jobs: [],
    experiences: [],
    leetcode: [],
  };

  // 1. Jobs retrieval task
  if (sources.includes('jobs') && plan.jobs && plan.jobs.enabled) {
    tasks.push(
      searchJobs(plan.jobs)
        .then((data) => {
          results.jobs = data;
        })
        .catch((err) => {
          console.error('[PlanExecutor Jobs Error]:', err.message);
          results.jobs = [];
        })
    );
  }

  // 2. Experiences vector retrieval task
  if (sources.includes('experiences') && plan.experiences && plan.experiences.enabled) {
    tasks.push(
      searchExperiences(plan.experiences)
        .then((data) => {
          results.experiences = data;
        })
        .catch((err) => {
          console.error('[PlanExecutor Experiences Error]:', err.message);
          results.experiences = [];
        })
    );
  }

  // 3. LeetCode structured retrieval task
  if (sources.includes('leetcode') && plan.leetcode && plan.leetcode.enabled) {
    tasks.push(
      searchLeetCode(plan.leetcode)
        .then((data) => {
          results.leetcode = data;
        })
        .catch((err) => {
          console.error('[PlanExecutor LeetCode Error]:', err.message);
          results.leetcode = [];
        })
    );
  }

  // Execute all independent retrieval tasks in parallel
  await Promise.all(tasks);

  const durationMs = Date.now() - startTime;

  return {
    userQuery,
    intentSummary,
    sourcesUsed: sources,
    retrievedData: results,
    totalRetrieved:
      results.jobs.length + results.experiences.length + results.leetcode.length,
    executionTimeMs: durationMs,
  };
};
