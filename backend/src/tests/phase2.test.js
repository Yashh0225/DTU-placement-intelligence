import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { connectDB, disconnectDB } from '../config/db.js';
import { Job } from '../models/Job.js';
import { Experience } from '../models/Experience.js';
import { LeetCodeQuestion } from '../models/LeetCodeQuestion.js';
import { createApp } from '../app.js';
import { importLeetCodeCsv } from '../services/ingestion/leetcodeImporter.js';

test('PHASE 2: Data Ingestion Pipelines Test Suite', async (t) => {
  let server;
  let baseUrl;

  await t.test('Setup test environment and database', async () => {
    await connectDB();
    await Promise.all([
      Job.init(),
      Experience.init(),
      LeetCodeQuestion.init(),
    ]);
    await Promise.all([
      Job.deleteMany({}),
      Experience.deleteMany({}),
      LeetCodeQuestion.deleteMany({}),
    ]);

    const app = createApp();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  // Pipeline 1: WhatsApp Announcement Extraction -> Review -> Save
  await t.test('Pipeline 1: WhatsApp Announcement Ingestion & Admin Review', async () => {
    const rawAnnouncement = `
*CAMPUS PLACEMENT NOTICE 2025*
Company: Uber India Technologies Pvt Ltd
Profile: Software Engineer - Backend
Eligibility: COE, IT, SE, ECE
Min CGPA: 7.5
CTC: 38 LPA (Base: 22 LPA + Stocks: 16 LPA)
Location: Bangalore / Hyderabad
PPO Opportunity: Available
Application Deadline: 25th August 2024, 5:00 PM
    `.trim();

    // 1. Admin requests extraction preview
    const extractRes = await fetch(`${baseUrl}/api/admin/extract-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementText: rawAnnouncement }),
    });

    const extractJson = await extractRes.json();
    assert.equal(extractRes.status, 200);
    assert.equal(extractJson.success, true);
    assert.ok(extractJson.data.company);
    assert.equal(extractJson.data.ctc, 38);
    assert.ok(extractJson.data.eligibleBranches.includes('COE'));
    assert.equal(extractJson.data.minCgpa, 7.5);
    assert.equal(extractJson.data.originalMessage, rawAnnouncement);

    // 2. Admin reviews/corrects and saves to database
    const correctedPayload = {
      ...extractJson.data,
      company: 'Uber India', // admin correction
      role: 'Backend Software Engineer', // admin refinement
      batch: '2025',
    };

    const saveRes = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(correctedPayload),
    });

    const saveJson = await saveRes.json();
    assert.equal(saveRes.status, 201);
    assert.equal(saveJson.success, true);
    assert.equal(saveJson.data.companyNormalized, 'uber');
    assert.equal(saveJson.data.ctc, 38);
    assert.equal(saveJson.data.originalMessage, rawAnnouncement);

    // 3. Confirm retrieval via structured API
    const verifyRes = await fetch(`${baseUrl}/api/jobs?minCtc=35`);
    const verifyJson = await verifyRes.json();
    assert.equal(verifyJson.data.length, 1);
    assert.equal(verifyJson.data[0].company, 'Uber India');
  });

  // Pipeline 2: Student Free-Text Narrative -> Extraction -> Student Review -> Save
  await t.test('Pipeline 2: Student Narrative Ingestion & Student Confirmation', async () => {
    const narrativeText = `
I appeared for Google on-campus at DTU for the SWE intern role (2025 batch).
Round 1 was an online assessment on HackerEarth with two questions: one on Sliding Window and one on Trees.
Round 2 was a 45-minute technical round with an engineer from Bangalore. We discussed Dijkstra's shortest path algorithm on graphs and time complexity.
Then we discussed my personal project built using Node.js and MongoDB.
Round 3 was Googliness and leadership behavioral questions.
Overall difficulty was Medium to Hard. Got the offer!
    `.trim();

    // 1. Student requests extraction preview
    const extractRes = await fetch(`${baseUrl}/api/experiences/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narrative: narrativeText,
        company: 'Google',
        role: 'SWE Intern',
        placementYear: 2024,
      }),
    });

    const extractJson = await extractRes.json();
    assert.equal(extractRes.status, 200);
    assert.equal(extractJson.success, true);
    assert.equal(extractJson.data.company, 'Google');
    assert.ok(extractJson.data.extractedStructure.roundsCount >= 2);
    assert.ok(extractJson.data.extractedStructure.dsaTopics.length > 0);
    assert.equal(extractJson.data.originalNarrative, narrativeText);

    // 2. Student confirms/edits structured details and saves
    const confirmedPayload = {
      company: extractJson.data.company,
      role: extractJson.data.role,
      placementYear: extractJson.data.placementYear,
      originalNarrative: extractJson.data.originalNarrative,
      extractedStructure: extractJson.data.extractedStructure,
      submissionType: 'narrative_llm',
      studentConfirmed: true,
      moderationStatus: 'verified',
    };

    const saveRes = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmedPayload),
    });

    const saveJson = await saveRes.json();
    assert.equal(saveRes.status, 201);
    assert.equal(saveJson.success, true);
    assert.equal(saveJson.data.companyNormalized, 'google');
    assert.equal(saveJson.data.originalNarrative, narrativeText);
  });

  // Pipeline 3: Structured Experience Submission -> Direct Validation & Storage
  await t.test('Pipeline 3: Direct Structured Experience Submission (Bypasses LLM)', async () => {
    const directPayload = {
      company: 'Atlassian',
      role: 'Site Reliability Engineer',
      placementYear: 2024,
      originalNarrative: 'Direct structured interview submission by placed student.',
      extractedStructure: {
        roundsCount: 3,
        rounds: [
          {
            roundNumber: 1,
            roundName: 'Online Coding',
            roundType: 'OA',
            topicsCovered: ['Arrays', 'Graphs'],
            questions: ['Course Schedule II'],
            description: 'Hackerrank test with 2 questions.',
          },
        ],
        dsaTopics: ['Arrays', 'Graphs', 'Trie'],
        csFundamentals: ['OS', 'Computer Networks'],
        projectDiscussion: 'Deep dive into Kubernetes architecture.',
        hrQuestions: ['Why Atlassian?'],
        difficulty: 'Hard',
        overallVerdict: 'Selected',
      },
      submissionType: 'structured_direct',
      studentConfirmed: true,
      moderationStatus: 'verified',
    };

    const saveRes = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(directPayload),
    });

    const saveJson = await saveRes.json();
    assert.equal(saveRes.status, 201);
    assert.equal(saveJson.success, true);
    assert.equal(saveJson.data.companyNormalized, 'atlassian');
    assert.equal(saveJson.data.submissionType, 'structured_direct');
  });

  // Pipeline 4: LeetCode CSV Dataset Import & Deduplication
  await t.test('Pipeline 4: LeetCode CSV Import and Repeatable Idempotency', async () => {
    const csvPath = path.resolve('data/leetcode_sample.csv');

    // 1. Initial Import
    const importRes1 = await fetch(`${baseUrl}/api/admin/import-leetcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: csvPath }),
    });

    const json1 = await importRes1.json();
    assert.equal(importRes1.status, 200);
    assert.equal(json1.success, true);
    assert.equal(json1.data.validRows, 15);
    assert.equal(json1.data.upsertedCount, 15);

    const initialTotal = await LeetCodeQuestion.countDocuments();
    assert.equal(initialTotal, 15);

    // 2. Repeat Import: must NOT create duplicate records (repeatable idempotency)
    const importRes2 = await fetch(`${baseUrl}/api/admin/import-leetcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: csvPath }),
    });

    const json2 = await importRes2.json();
    assert.equal(importRes2.status, 200);
    assert.equal(json2.data.upsertedCount, 0); // 0 new documents created
    assert.equal(json2.data.matchedCount, 15); // all 15 matched and updated

    const repeatTotal = await LeetCodeQuestion.countDocuments();
    assert.equal(repeatTotal, 15, 'Total LeetCode questions must remain 15 without duplicate records');

    // 3. Test structured queries on LeetCode questions
    const amazonQuestionsRes = await fetch(`${baseUrl}/api/leetcode?company=amazon&difficulty=medium`);
    const amazonJson = await amazonQuestionsRes.json();
    assert.equal(amazonJson.success, true);
    assert.ok(amazonJson.data.length >= 4);
    assert.ok(amazonJson.data.every((q) => q.difficulty === 'Medium' && q.companyNormalized === 'amazon'));
  });

  // Teardown
  await t.test('Cleanup test server and database', async () => {
    if (server) server.close();
    await disconnectDB();
  });
});
