import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { connectDB, disconnectDB } from '../config/db.js';
import { Job } from '../models/Job.js';
import { Experience } from '../models/Experience.js';
import { ExperienceChunk } from '../models/ExperienceChunk.js';
import { LeetCodeQuestion } from '../models/LeetCodeQuestion.js';
import { routeQuery } from '../services/queryRouter/queryRouter.js';
import { executeRetrievalPlan } from '../services/queryRouter/planExecutor.js';
import { retrievalPlanSchema } from '../services/queryRouter/planSchema.js';
import { indexExperience } from '../services/embeddings/indexService.js';
import { importLeetCodeCsv } from '../services/ingestion/leetcodeImporter.js';

test('PHASE 5: Multi-Source Query Router Test Suite', async (t) => {
  await t.test('Setup database fixtures for router testing', async () => {
    await connectDB();
    await Promise.all([
      Job.init(),
      Experience.init(),
      ExperienceChunk.init(),
      LeetCodeQuestion.init(),
    ]);

    await Promise.all([
      Job.deleteMany({}),
      Experience.deleteMany({}),
      ExperienceChunk.deleteMany({}),
      LeetCodeQuestion.deleteMany({}),
    ]);

    // Seed jobs
    await Job.create([
      {
        company: 'Amazon India',
        companyNormalized: 'amazon',
        role: 'SDE-1',
        ctc: 44.0,
        eligibleBranches: ['COE', 'IT', 'SE'],
        originalMessage: 'Amazon hiring SDE-1 with 44 LPA.',
        status: 'published',
      },
      {
        company: 'Microsoft',
        companyNormalized: 'microsoft',
        role: 'SDE',
        ctc: 50.0,
        eligibleBranches: ['COE', 'IT'],
        originalMessage: 'Microsoft hiring SDE with 50 LPA.',
        status: 'published',
      },
    ]);

    // Seed experience
    const exp = await Experience.create({
      company: 'Amazon India',
      companyNormalized: 'amazon',
      role: 'SDE-1',
      placementYear: 2024,
      originalNarrative: 'Online assessment had sliding window problems. Technical round discussed LRU cache and binary trees BFS.',
      extractedStructure: {
        dsaTopics: ['Sliding Window', 'LRU Cache', 'Trees', 'BFS'],
        difficulty: 'Medium',
        overallVerdict: 'Selected',
      },
      submissionType: 'narrative_llm',
      studentConfirmed: true,
      moderationStatus: 'verified',
    });
    await indexExperience(exp._id);

    // Seed LeetCode
    const csvPath = path.resolve('data/leetcode_sample.csv');
    await importLeetCodeCsv(csvPath);
  });

  // Example 1: Historical structured query
  await t.test('Example 1: Historical structured query routes exclusively to jobs', async () => {
    const query = 'Which companies offered packages above 15 LPA?';
    const plan = await routeQuery(query);

    assert.ok(plan.sources.includes('jobs'));
    assert.equal(plan.sources.length, 1, 'Should only select jobs for a package/salary query');
    assert.equal(plan.plan.jobs?.minCtc, 15);

    const result = await executeRetrievalPlan(plan);
    assert.ok(result.retrievedData.jobs.length >= 2);
    assert.equal(result.retrievedData.experiences.length, 0);
    assert.equal(result.retrievedData.leetcode.length, 0);
    assert.ok(result.retrievedData.jobs.every((j) => j.ctc > 15));
  });

  // Example 2: Semantic interview query
  await t.test('Example 2: Semantic query routes to student experiences with company filter', async () => {
    const query = 'What DSA topics were asked in Amazon interviews at DTU?';
    const plan = await routeQuery(query);

    assert.ok(plan.sources.includes('experiences'));
    assert.equal(plan.plan.experiences?.company, 'Amazon');

    const result = await executeRetrievalPlan(plan);
    assert.ok(result.retrievedData.experiences.length >= 1);
    assert.equal(result.retrievedData.experiences[0].company, 'Amazon India');
    assert.ok(result.retrievedData.experiences[0].chunkText.toLowerCase().includes('lru'));
  });

  // Example 3: LeetCode query
  await t.test('Example 3: LeetCode query routes exclusively to leetcode questions', async () => {
    const query = 'Show Amazon medium-level LeetCode questions';
    const plan = await routeQuery(query);

    assert.ok(plan.sources.includes('leetcode'));
    assert.equal(plan.plan.leetcode?.company, 'Amazon');
    assert.equal(plan.plan.leetcode?.difficulty, 'Medium');

    const result = await executeRetrievalPlan(plan);
    assert.ok(result.retrievedData.leetcode.length >= 1);
    assert.equal(result.retrievedData.jobs.length, 0);
    assert.ok(result.retrievedData.leetcode.every((q) => q.difficulty === 'Medium'));
  });

  // Example 4: Multi-source query
  await t.test('Example 4: Multi-source query retrieves jobs, experiences, and leetcode in parallel', async () => {
    const query = 'Which companies offered 15+ LPA, what were their interview experiences at DTU, and what LeetCode questions should I practice?';
    const plan = await routeQuery(query);

    assert.ok(plan.sources.includes('jobs'));
    assert.ok(plan.sources.includes('experiences'));
    assert.ok(plan.sources.includes('leetcode'));
    assert.equal(plan.sources.length, 3, 'Must identify all 3 sources required');

    const result = await executeRetrievalPlan(plan);
    assert.ok(result.retrievedData.jobs.length >= 2, 'Should have retrieved jobs');
    assert.ok(result.retrievedData.experiences.length >= 1, 'Should have retrieved experiences');
    assert.ok(result.retrievedData.leetcode.length >= 1, 'Should have retrieved LeetCode questions');
    assert.equal(result.sourcesUsed.length, 3);
    assert.ok(result.executionTimeMs >= 0);
  });

  // Plan Validation Guardrails
  await t.test('Plan schema strictly rejects unauthorized or malformed plans', () => {
    // Arbitrary injected query string without valid schema
    const maliciousPlan = {
      userQuery: 'Test injection',
      intentSummary: 'Malicious',
      sources: ['jobs'],
      plan: {
        jobs: {
          enabled: true,
          limit: 1000, // exceeds max limit of 50
        },
      },
    };

    assert.throws(() => {
      retrievalPlanSchema.parse(maliciousPlan);
    });
  });

  // Teardown
  await t.test('Cleanup database connection', async () => {
    await disconnectDB();
  });
});
