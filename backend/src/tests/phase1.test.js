import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../config/db.js';
import { Job } from '../models/Job.js';
import { Experience } from '../models/Experience.js';
import { ExperienceChunk } from '../models/ExperienceChunk.js';
import { LeetCodeQuestion } from '../models/LeetCodeQuestion.js';
import { Company } from '../models/Company.js';
import { createApp } from '../app.js';
import { normalizeCompanyName } from '../utils/normalize.js';

test('PHASE 1: Database Foundation and Models Test Suite', async (t) => {
  // 1. Establish database connection
  await t.test('Database connection initializes successfully', async () => {
    const conn = await connectDB();
    assert.ok(conn, 'Mongoose connection should be established');
    assert.equal(conn.readyState, 1, 'Mongoose connection readyState should be 1 (connected)');

    // Ensure all model indexes are synchronized
    await Promise.all([
      Job.init(),
      Experience.init(),
      ExperienceChunk.init(),
      LeetCodeQuestion.init(),
      Company.init(),
    ]);
  });

  // Clean collections before testing
  await Promise.all([
    Job.deleteMany({}),
    Experience.deleteMany({}),
    ExperienceChunk.deleteMany({}),
    LeetCodeQuestion.deleteMany({}),
    Company.deleteMany({}),
  ]);

  // 2. Company normalization utility
  await t.test('Company normalization normalizes corporate suffixes and casing', () => {
    assert.equal(normalizeCompanyName('Amazon India Ltd.'), 'amazon');
    assert.equal(normalizeCompanyName('Microsoft Corporation'), 'microsoft');
    assert.equal(normalizeCompanyName('Google Inc.'), 'google');
    assert.equal(normalizeCompanyName('   DE Shaw & Co.   '), 'de shaw co');
  });

  // 3. Job model operations and structured query
  let createdJobId;
  await t.test('Job model creates and queries structured records', async () => {
    const job = await Job.create({
      company: 'Amazon India Ltd.',
      companyNormalized: normalizeCompanyName('Amazon India Ltd.'),
      role: 'Software Development Engineer - 1',
      type: 'full-time',
      eligibleBranches: ['COE', 'IT', 'SE'],
      minCgpa: 7.5,
      batch: '2025',
      ctc: 44.5,
      originalMessage: 'Amazon is hiring SDE-1 for 2025 batch. Eligible: COE, IT, SE. CTC: 44.5 LPA.',
      status: 'published',
    });

    assert.ok(job._id);
    assert.equal(job.companyNormalized, 'amazon');
    assert.equal(job.ctc, 44.5);
    createdJobId = job._id;

    // Structured query test: find jobs with CTC >= 40 LPA
    const highPaying = await Job.find({ ctc: { $gte: 40 } });
    assert.equal(highPaying.length, 1);
    assert.equal(highPaying[0].company, 'Amazon India Ltd.');

    // Branch query test
    const branchFiltered = await Job.find({ eligibleBranches: { $in: ['COE'] } });
    assert.equal(branchFiltered.length, 1);
  });

  // 4. Experience model operations
  let createdExpId;
  await t.test('Experience model stores narrative and extracted structured interview information', async () => {
    const exp = await Experience.create({
      company: 'Microsoft',
      companyNormalized: normalizeCompanyName('Microsoft'),
      role: 'SDE Intern',
      placementYear: 2024,
      originalNarrative:
        'Round 1 was an online test on Mettl with 3 coding questions on arrays and dynamic programming. Round 2 was technical interview focusing on binary trees and graph BFS.',
      extractedStructure: {
        roundsCount: 2,
        rounds: [
          {
            roundNumber: 1,
            roundName: 'Online Assessment',
            roundType: 'OA',
            topicsCovered: ['Arrays', 'Dynamic Programming'],
            questions: ['Trapping Rain Water', 'Coin Change'],
            description: 'Platform: Mettl. 3 questions in 90 mins.',
          },
          {
            roundNumber: 2,
            roundName: 'Technical Interview 1',
            roundType: 'Technical',
            topicsCovered: ['Trees', 'Graphs'],
            questions: ['Lowest Common Ancestor', 'Rotting Oranges'],
            description: 'Discussion on time complexity and BFS traversal.',
          },
        ],
        dsaTopics: ['Arrays', 'Dynamic Programming', 'Trees', 'Graphs'],
        csFundamentals: ['OS', 'DBMS'],
        difficulty: 'Medium',
        overallVerdict: 'Selected',
      },
      submissionType: 'narrative_llm',
      studentConfirmed: true,
      moderationStatus: 'verified',
    });

    assert.ok(exp._id);
    assert.equal(exp.companyNormalized, 'microsoft');
    assert.equal(exp.extractedStructure.roundsCount, 2);
    assert.ok(exp.extractedStructure.dsaTopics.includes('Trees'));
    createdExpId = exp._id;

    // Query experience by DSA topic
    const treeExperiences = await Experience.find({
      'extractedStructure.dsaTopics': { $in: ['Trees'] },
    });
    assert.equal(treeExperiences.length, 1);
  });

  // 5. ExperienceChunk model operations
  await t.test('ExperienceChunk links to parent experience and holds embeddings', async () => {
    const dummyEmbedding = Array(768).fill(0.0123);
    const chunk = await ExperienceChunk.create({
      experienceId: createdExpId,
      chunkIndex: 0,
      totalChunks: 1,
      chunkText: 'Technical interview focusing on binary trees and graph BFS traversal.',
      section: 'Technical Round 1',
      embedding: dummyEmbedding,
      metadata: {
        company: 'Microsoft',
        companyNormalized: 'microsoft',
        role: 'SDE Intern',
        placementYear: 2024,
        topics: ['Trees', 'Graphs'],
      },
    });

    assert.ok(chunk._id);
    assert.equal(chunk.embedding.length, 768);
    assert.equal(String(chunk.experienceId), String(createdExpId));

    const retrievedChunks = await ExperienceChunk.find({
      'metadata.companyNormalized': 'microsoft',
    });
    assert.equal(retrievedChunks.length, 1);
  });

  // 6. LeetCodeQuestion model operations and duplicate prevention
  await t.test('LeetCodeQuestion prevents duplicate imports via compound unique index', async () => {
    const q1 = await LeetCodeQuestion.create({
      problemId: 1,
      title: 'Two Sum',
      difficulty: 'Easy',
      company: 'Google',
      companyNormalized: 'google',
      acceptanceRate: '54.2%',
      frequency: 98.5,
      url: 'https://leetcode.com/problems/two-sum/',
      topics: ['Array', 'Hash Table'],
    });

    assert.ok(q1._id);

    // Attempting duplicate insert for same company & title must throw MongoServerError E11000
    await assert.rejects(
      async () => {
        await LeetCodeQuestion.create({
          problemId: 1,
          title: 'Two Sum',
          difficulty: 'Easy',
          company: 'Google',
          companyNormalized: 'google',
          acceptanceRate: '54.2%',
          frequency: 98.5,
          url: 'https://leetcode.com/problems/two-sum/',
          topics: ['Array', 'Hash Table'],
        });
      },
      (err) => {
        return err && (err.code === 11000 || /duplicate/i.test(err.message));
      },
      'Duplicate insert for identical company and problem title should be rejected'
    );
  });

  // 7. Company directory model
  await t.test('Company directory model records company metrics', async () => {
    const comp = await Company.create({
      name: 'Google India',
      normalizedName: 'google',
      industry: 'Technology',
      tier: 'Super Dream',
      highestPackage: 55.0,
      averagePackage: 32.5,
      tags: ['MNC', 'Product', 'Tier-1'],
    });

    assert.ok(comp._id);
    assert.equal(comp.normalizedName, 'google');
  });

  // 8. Express application endpoints test using standard fetch / request
  await t.test('Express routes respond correctly', async () => {
    const app = createApp();
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // Test /api/health
      const healthRes = await fetch(`${baseUrl}/api/health`);
      const healthJson = await healthRes.json();
      assert.equal(healthRes.status, 200);
      assert.equal(healthJson.status, 'healthy');

      // Test /api/jobs
      const jobsRes = await fetch(`${baseUrl}/api/jobs?minCtc=40`);
      const jobsJson = await jobsRes.json();
      assert.equal(jobsRes.status, 200);
      assert.equal(jobsJson.success, true);
      assert.equal(jobsJson.data.length, 1);
      assert.equal(jobsJson.data[0].company, 'Amazon India Ltd.');

      // Test /api/experiences
      const expRes = await fetch(`${baseUrl}/api/experiences?company=microsoft`);
      const expJson = await expRes.json();
      assert.equal(expRes.status, 200);
      assert.equal(expJson.success, true);
      assert.equal(expJson.data.length, 1);

      // Test /api/leetcode
      const lcRes = await fetch(`${baseUrl}/api/leetcode?company=google`);
      const lcJson = await lcRes.json();
      assert.equal(lcRes.status, 200);
      assert.equal(lcJson.success, true);
      assert.equal(lcJson.data.length, 1);

      // Test /api/companies/stats
      const statsRes = await fetch(`${baseUrl}/api/companies/stats`);
      const statsJson = await statsRes.json();
      assert.equal(statsRes.status, 200);
      assert.equal(statsJson.success, true);
      assert.ok(statsJson.data.totalJobs >= 1);
      assert.ok(statsJson.data.totalExperiences >= 1);
    } finally {
      server.close();
    }
  });

  // Cleanup
  await disconnectDB();
});
