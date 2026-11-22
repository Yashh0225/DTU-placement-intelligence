import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { connectDB, disconnectDB } from '../config/db.js';
import { Job } from '../models/Job.js';
import { Experience } from '../models/Experience.js';
import { ExperienceChunk } from '../models/ExperienceChunk.js';
import { LeetCodeQuestion } from '../models/LeetCodeQuestion.js';
import { searchJobs } from '../services/retrieval/jobRetrievalService.js';
import { searchExperiences } from '../services/retrieval/experienceRetrievalService.js';
import { searchLeetCode } from '../services/retrieval/leetcodeRetrievalService.js';
import { indexExperience } from '../services/embeddings/indexService.js';
import { importLeetCodeCsv } from '../services/ingestion/leetcodeImporter.js';

test('PHASE 4: Independent Retrieval Services Test Suite', async (t) => {
  await t.test('Setup test fixtures in database', async () => {
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

    // 1. Seed historical jobs
    await Job.create([
      {
        company: 'Amazon',
        companyNormalized: 'amazon',
        role: 'SDE-1',
        ctc: 44.5,
        eligibleBranches: ['COE', 'IT', 'SE'],
        minCgpa: 7.0,
        batch: '2025',
        originalMessage: 'Amazon hiring SDE-1 for 2025 batch.',
        status: 'published',
      },
      {
        company: 'Microsoft',
        companyNormalized: 'microsoft',
        role: 'Software Engineer',
        ctc: 51.0,
        eligibleBranches: ['COE', 'IT', 'SE', 'ECE'],
        minCgpa: 8.0,
        batch: '2025',
        originalMessage: 'Microsoft campus hiring 2025 batch.',
        status: 'published',
      },
      {
        company: 'Paytm',
        companyNormalized: 'paytm',
        role: 'Associate Software Engineer',
        ctc: 12.0,
        eligibleBranches: ['COE', 'IT', 'SE', 'ECE', 'EE'],
        minCgpa: 6.5,
        batch: '2025',
        originalMessage: 'Paytm hiring for 2025.',
        status: 'published',
      },
    ]);

    // 2. Seed student experiences and index them
    const exp1 = await Experience.create({
      company: 'Amazon',
      companyNormalized: 'amazon',
      role: 'SDE-1',
      placementYear: 2024,
      originalNarrative: `
Round 1: Online assessment with 2 questions on sliding window and priority queue.
Round 2: Technical interview discussing LRU cache, hash map, and doubly linked list implementation.
Round 3: Focused on binary trees and graph breadth first search (BFS).
      `.trim(),
      extractedStructure: {
        dsaTopics: ['Sliding Window', 'Priority Queue', 'LRU Cache', 'Trees', 'BFS'],
        difficulty: 'Medium',
        overallVerdict: 'Selected',
      },
      submissionType: 'narrative_llm',
      studentConfirmed: true,
      moderationStatus: 'verified',
    });

    const exp2 = await Experience.create({
      company: 'Microsoft',
      companyNormalized: 'microsoft',
      role: 'Software Engineer',
      placementYear: 2024,
      originalNarrative: `
Round 1: Coding round on Mettl on dynamic programming and strings.
Round 2: Technical interview on lowest common ancestor in binary tree and operating system virtual memory.
      `.trim(),
      extractedStructure: {
        dsaTopics: ['Dynamic Programming', 'Strings', 'Binary Tree'],
        difficulty: 'Medium',
        overallVerdict: 'Selected',
      },
      submissionType: 'narrative_llm',
      studentConfirmed: true,
      moderationStatus: 'verified',
    });

    await indexExperience(exp1._id);
    await indexExperience(exp2._id);

    // 3. Seed LeetCode questions
    const csvPath = path.resolve('data/leetcode_sample.csv');
    await importLeetCodeCsv(csvPath);
  });

  // Test 1: Historical Job Structured Retrieval
  await t.test('searchJobs retrieves records using deterministic MongoDB filters', async () => {
    // Test salary filter: ctc >= 20
    const highPayJobs = await searchJobs({ minCtc: 20 });
    assert.equal(highPayJobs.length, 2);
    assert.ok(highPayJobs.some((j) => j.company === 'Microsoft'));
    assert.ok(highPayJobs.some((j) => j.company === 'Amazon'));
    assert.ok(highPayJobs.every((j) => j.ctc >= 20));
    assert.equal(highPayJobs[0].sourceType, 'job_announcement');

    // Test branch filter
    const paytmJobs = await searchJobs({ company: 'Paytm', branch: 'EE' });
    assert.equal(paytmJobs.length, 1);
    assert.equal(paytmJobs[0].company, 'Paytm');
    assert.equal(paytmJobs[0].ctc, 12);

    // Non-matching query
    const noJobs = await searchJobs({ minCtc: 100 });
    assert.equal(noJobs.length, 0);
  });

  // Test 2: Student Experience Vector Retrieval
  await t.test('searchExperiences retrieves semantic chunks with metadata filters', async () => {
    // Semantic query specifically targeting Amazon interview rounds
    const amazonResults = await searchExperiences({
      queryText: 'LRU cache doubly linked list and BFS graph questions',
      company: 'Amazon',
      limit: 3,
    });

    assert.ok(amazonResults.length >= 1, 'Should find at least 1 relevant chunk for Amazon');
    assert.equal(amazonResults[0].company, 'Amazon');
    assert.equal(amazonResults[0].sourceType, 'student_experience');
    assert.ok(typeof amazonResults[0].score === 'number');
    assert.ok(amazonResults[0].chunkText.length > 0);
    assert.ok(amazonResults[0].sourceId);

    // Query Microsoft specifically
    const msftResults = await searchExperiences({
      queryText: 'binary tree lowest common ancestor and dynamic programming',
      company: 'Microsoft',
      limit: 3,
    });

    assert.ok(msftResults.length >= 1);
    assert.equal(msftResults[0].company, 'Microsoft');
    assert.ok(msftResults[0].chunkText.toLowerCase().includes('tree') || msftResults[0].chunkText.toLowerCase().includes('programming'));
  });

  // Test 3: LeetCode Structured Retrieval
  await t.test('searchLeetCode retrieves company-tagged problems without embeddings', async () => {
    // Amazon Medium problems
    const amazonLc = await searchLeetCode({
      company: 'Amazon',
      difficulty: 'Medium',
      limit: 5,
    });

    assert.ok(amazonLc.length >= 1);
    assert.ok(amazonLc.every((q) => q.company === 'Amazon' && q.difficulty === 'Medium'));
    assert.equal(amazonLc[0].sourceType, 'leetcode_preparation');
    assert.ok(amazonLc[0].disclaimer.includes('Company-tagged preparation data'));

    // Topic filter
    const dpQuestions = await searchLeetCode({
      topics: 'Dynamic Programming',
    });
    assert.ok(dpQuestions.length >= 1);
    assert.ok(dpQuestions.some((q) => q.title.includes('Stock') || q.title.includes('Subarray') || q.title.includes('Palindromic')));
  });

  // Teardown
  await t.test('Cleanup database connection', async () => {
    await disconnectDB();
  });
});
