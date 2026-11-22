import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { connectDB, disconnectDB } from '../config/db.js';
import { Job } from '../models/Job.js';
import { Experience } from '../models/Experience.js';
import { ExperienceChunk } from '../models/ExperienceChunk.js';
import { LeetCodeQuestion } from '../models/LeetCodeQuestion.js';
import { createApp } from '../app.js';
import { indexExperience } from '../services/embeddings/indexService.js';
import { importLeetCodeCsv } from '../services/ingestion/leetcodeImporter.js';

test('PHASE 6: RAG Answer Generation & End-to-End Assistant Test Suite', async (t) => {
  let server;
  let baseUrl;

  await t.test('Setup test environment and database fixtures', async () => {
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
        ctc: 44.5,
        eligibleBranches: ['COE', 'IT', 'SE'],
        batch: '2025',
        originalMessage: 'Amazon campus placement 2025 batch for SDE-1.',
        status: 'published',
      },
      {
        company: 'Microsoft',
        companyNormalized: 'microsoft',
        role: 'Software Engineer',
        ctc: 51.0,
        eligibleBranches: ['COE', 'IT', 'SE', 'ECE'],
        batch: '2025',
        originalMessage: 'Microsoft campus placement 2025.',
        status: 'published',
      },
    ]);

    // Seed student experience and index into chunks
    const exp = await Experience.create({
      company: 'Amazon India',
      companyNormalized: 'amazon',
      role: 'SDE-1',
      placementYear: 2024,
      originalNarrative: `
Round 1: Online assessment on HackerRank. 2 coding problems: Sliding Window and Monotonic Queue.
Round 2: Technical Interview. Implemented LRU Cache using Doubly Linked List and Hash Map.
Round 3: Discussed binary tree lowest common ancestor and BFS traversal.
      `.trim(),
      extractedStructure: {
        roundsCount: 3,
        dsaTopics: ['Sliding Window', 'LRU Cache', 'Trees', 'BFS'],
        difficulty: 'Medium',
        overallVerdict: 'Selected',
      },
      submissionType: 'narrative_llm',
      studentConfirmed: true,
      moderationStatus: 'verified',
    });
    await indexExperience(exp._id);

    // Seed LeetCode questions
    const csvPath = path.resolve('data/leetcode_sample.csv');
    await importLeetCodeCsv(csvPath);

    const app = createApp();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  // 1. Structured Query through Assistant API
  await t.test('POST /api/assistant/query: Structured package query', async () => {
    const res = await fetch(`${baseUrl}/api/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Which companies offered packages above 15 LPA?' }),
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.ok(json.data.answer.length > 0);
    assert.equal(json.data.evidenceFound, true);
    assert.ok(json.data.sourcesUsed.includes('jobs'));
    assert.ok(json.data.citations.some((c) => c.type === 'job_announcement'));
    assert.ok(json.data.counts.jobsCount >= 2);
  });

  // 2. Semantic Interview Query through Assistant API
  await t.test('POST /api/assistant/query: Semantic interview topics query', async () => {
    const res = await fetch(`${baseUrl}/api/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'What DSA topics were asked in Amazon interviews at DTU?' }),
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.ok(json.data.answer.length > 0);
    assert.equal(json.data.evidenceFound, true);
    assert.ok(json.data.sourcesUsed.includes('experiences'));
    assert.ok(json.data.citations.some((c) => c.type === 'student_experience'));
  });

  // 3. LeetCode Practice Query through Assistant API
  await t.test('POST /api/assistant/query: LeetCode preparation query', async () => {
    const res = await fetch(`${baseUrl}/api/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Show Amazon medium-level LeetCode questions' }),
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.ok(json.data.answer.length > 0);
    assert.equal(json.data.evidenceFound, true);
    assert.ok(json.data.sourcesUsed.includes('leetcode'));
    assert.ok(json.data.citations.some((c) => c.type === 'leetcode_preparation'));
  });

  // 4. Multi-Source Comprehensive Query through Assistant API
  await t.test('POST /api/assistant/query: Multi-source query with all 3 sources', async () => {
    const res = await fetch(`${baseUrl}/api/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question:
          'Which companies offered 15+ LPA, what were their interview experiences at DTU, and what LeetCode questions should I practice?',
      }),
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.evidenceFound, true);
    assert.equal(json.data.sourcesUsed.length, 3);
    assert.ok(json.data.citations.some((c) => c.type === 'job_announcement'));
    assert.ok(json.data.citations.some((c) => c.type === 'student_experience'));
    assert.ok(json.data.citations.some((c) => c.type === 'leetcode_preparation'));
  });

  // 5. Insufficient Evidence Query
  await t.test('POST /api/assistant/query: Insufficient evidence gracefully handled without guessing', async () => {
    const res = await fetch(`${baseUrl}/api/assistant/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Explain SpaceX aerospace propulsion interview questions at DTU' }),
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.data.evidenceFound, false);
    assert.ok(json.data.answer.toLowerCase().includes('no historical') || json.data.answer.toLowerCase().includes('not found') || json.data.answer.toLowerCase().includes('unavailable'));
  });

  // 6. Suggested Queries API
  await t.test('GET /api/assistant/examples: Returns suggested queries', async () => {
    const res = await fetch(`${baseUrl}/api/assistant/examples`);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 4);
    assert.ok(json.data[0].query);
  });

  // Teardown
  await t.test('Cleanup test server and database', async () => {
    if (server) server.close();
    await disconnectDB();
  });
});
