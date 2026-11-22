import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../config/db.js';
import { Experience } from '../models/Experience.js';
import { ExperienceChunk } from '../models/ExperienceChunk.js';
import { cleanNarrativeText } from '../services/embeddings/textCleaner.js';
import { conditionallyChunkExperience } from '../services/embeddings/chunker.js';
import { generateEmbedding } from '../services/embeddings/embeddingService.js';
import { indexExperience } from '../services/embeddings/indexService.js';
import { createApp } from '../app.js';

test('PHASE 3: Chunking and Embeddings Test Suite', async (t) => {
  let server;
  let baseUrl;

  await t.test('Setup test environment and database', async () => {
    await connectDB();
    await Promise.all([
      Experience.init(),
      ExperienceChunk.init(),
    ]);
    await Promise.all([
      Experience.deleteMany({}),
      ExperienceChunk.deleteMany({}),
    ]);

    const app = createApp();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  // 1. Text cleaner
  await t.test('Text cleaner strips excess whitespace and control characters', () => {
    const raw = "Hello \r\n\r\n\r\nworld! \t\t This is a test.\x00\x07\n\n\n\nNext line.";
    const cleaned = cleanNarrativeText(raw);
    assert.ok(!cleaned.includes('\r'));
    assert.ok(!cleaned.includes('\x00'));
    assert.ok(!cleaned.includes('\n\n\n'));
    assert.ok(cleaned.includes('Hello\n\nworld! This is a test.\n\nNext line.'));
  });

  // 2. Conditional Chunking: Short narrative remains ONE chunk
  await t.test('Conditional chunking: Short narrative remains a single chunk', () => {
    const shortExperience = {
      _id: '507f1f77bcf86cd799439011',
      company: 'Goldman Sachs',
      role: 'Summer Analyst',
      placementYear: 2024,
      originalNarrative: `
I interviewed with Goldman Sachs for 2024 summer internship.
Round 1 was an online test with 2 coding questions on dynamic programming and probability puzzles.
Round 2 was technical interview focusing on binary search and math puzzles. Got selected!
      `.trim(),
      extractedStructure: {
        dsaTopics: ['Dynamic Programming', 'Binary Search'],
      },
    };

    const chunks = conditionallyChunkExperience(shortExperience);
    assert.equal(chunks.length, 1, 'Short experience must remain exactly one chunk');
    assert.equal(chunks[0].chunkIndex, 0);
    assert.equal(chunks[0].totalChunks, 1);
    assert.equal(chunks[0].section, 'Full Interview Experience');
    assert.equal(chunks[0].metadata.companyNormalized, 'goldman sachs');
    assert.ok(chunks[0].metadata.topics.includes('Dynamic Programming'));
  });

  // 3. Conditional Chunking: Long multi-round narrative splits by rounds
  await t.test('Conditional chunking: Long narrative splits by interview rounds', () => {
    // Generate a detailed > 1500 chars experience
    const longExperience = {
      _id: '507f1f77bcf86cd799439012',
      company: 'Amazon India',
      role: 'SDE - 1',
      placementYear: 2024,
      originalNarrative: `
Round 1: Online Assessment (OA)
The OA was hosted on HackerRank and consisted of 2 coding questions and an Amazon Leadership Principles behavioral survey.
The first question was a variation of the Sliding Window Maximum problem requiring a monotonic deque to achieve O(N) time complexity.
The second question was a Graph problem that required finding connected components using Breadth First Search (BFS) or Disjoint Set Union (DSU).
I passed all test cases for both questions within 50 minutes.

Round 2: Technical Interview 1
The interviewer was a Senior SDE with 6 years at Amazon. The interview started with a quick introduction followed by Amazon Leadership Principle questions: "Tell me about a time you had a disagreement with your team member" and "Tell me about a time you worked under a tight deadline".
For the coding problem, I was asked to implement an LRU Cache with O(1) get and put operations. I explained the doubly linked list + hash map approach and coded it with proper error handling and null pointer checks.
Next, we discussed time complexity and cache eviction edge cases.

Round 3: Technical Interview 2 & System Discussion
This round focused heavily on Trees, Graphs, and CS Fundamentals. The interviewer asked to serialize and deserialize a binary tree.
We also discussed Operating System concepts including processes vs threads, virtual memory, paging, and deadlock conditions.
In the DBMS section, I was asked to write an SQL query involving GROUP BY and HAVING clauses for finding top sales records.

Round 4: Bar Raiser & Managerial Round
This was the final round conducted by a Bar Raiser from a different org. Very intense behavioral questions assessing Customer Obsession, Ownership, and Bias for Action.
We discussed trade-offs in my final year capstone project including database selection between PostgreSQL and MongoDB.
Overall, the process was thorough but very professional. Received the full-time offer two days later!
      `.trim(),
      extractedStructure: {
        dsaTopics: ['Sliding Window', 'Graphs', 'BFS', 'LRU Cache', 'Trees'],
      },
    };

    const chunks = conditionallyChunkExperience(longExperience);
    assert.ok(chunks.length >= 3, `Expected at least 3 chunks for multi-round long experience, got ${chunks.length}`);
    assert.equal(chunks[0].chunkIndex, 0);
    assert.equal(chunks[0].totalChunks, chunks.length);
    assert.ok(chunks[0].section.includes('Round 1'));
    assert.ok(chunks[1].section.includes('Round 2'));
    assert.equal(chunks[0].metadata.companyNormalized, 'amazon');
  });

  // 4. Vector Embedding generation
  await t.test('Vector embedding generates 768-dim normalized vector', async () => {
    const text = 'Data structures and algorithms questions on binary trees and graphs at DTU';
    const embedding = await generateEmbedding(text);

    assert.ok(Array.isArray(embedding));
    assert.equal(embedding.length, 768, 'Embedding must have dimension 768');

    // Check normalization: L2 norm should be approximately 1.0
    const sumSq = embedding.reduce((acc, val) => acc + val * val, 0);
    assert.ok(Math.abs(Math.sqrt(sumSq) - 1.0) < 0.05, 'Embedding vector should be L2-normalized');
  });

  // 5. Indexing workflow & DB storage
  let savedExpId;
  await t.test('Indexing service creates chunks in MongoDB and sets isIndexed: true', async () => {
    const exp = await Experience.create({
      company: 'Adobe Systems',
      companyNormalized: 'adobe',
      role: 'Member of Technical Staff',
      placementYear: 2024,
      originalNarrative: `
Round 1: Coding round on HackerRank with 3 questions on Dynamic Programming, Graphs, and Bitmasking.
Round 2: Technical interview discussing trie data structure, autocomplete suggestions, and time complexity.
Round 3: Managerial and HR round discussing college projects and team dynamics.
      `.trim(),
      extractedStructure: {
        roundsCount: 3,
        dsaTopics: ['Dynamic Programming', 'Graphs', 'Trie'],
        difficulty: 'Medium',
        overallVerdict: 'Selected',
      },
      submissionType: 'narrative_llm',
      studentConfirmed: true,
      moderationStatus: 'verified',
    });

    savedExpId = exp._id;

    // Execute indexing
    const chunks = await indexExperience(savedExpId);
    assert.ok(chunks.length >= 1);
    assert.equal(chunks[0].embedding.length, 768);
    assert.equal(String(chunks[0].experienceId), String(savedExpId));

    // Verify parent document is updated
    const updatedExp = await Experience.findById(savedExpId);
    assert.equal(updatedExp.isIndexed, true);

    // Verify retrieval by metadata from experience_chunks
    const foundChunks = await ExperienceChunk.find({
      'metadata.companyNormalized': 'adobe',
    });
    assert.equal(foundChunks.length, chunks.length);

    // Test re-indexing idempotency: re-indexing must replace existing chunks without multiplying
    await indexExperience(savedExpId);
    const postReindexChunks = await ExperienceChunk.find({ experienceId: savedExpId });
    assert.equal(postReindexChunks.length, chunks.length, 'Reindexing should maintain exact chunk count');
  });

  // 6. Automatic indexing on Experience Creation API
  await t.test('POST /api/experiences automatically triggers indexing and chunk generation', async () => {
    const payload = {
      company: 'Directi',
      role: 'Platform Engineer',
      placementYear: 2024,
      originalNarrative: 'Online test with 3 hard algorithmic problems on trees and segment trees. Interview round on distributed systems and concurrency.',
      extractedStructure: {
        roundsCount: 2,
        dsaTopics: ['Trees', 'Segment Trees'],
        difficulty: 'Hard',
        overallVerdict: 'Selected',
      },
      submissionType: 'structured_direct',
      studentConfirmed: true,
      moderationStatus: 'verified',
    };

    const res = await fetch(`${baseUrl}/api/experiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    assert.equal(res.status, 201);
    assert.equal(json.success, true);

    // Verify chunk was created automatically in database
    const chunks = await ExperienceChunk.find({ experienceId: json.data._id });
    assert.ok(chunks.length >= 1, 'Chunk should be automatically created upon experience submission');
    assert.equal(chunks[0].embedding.length, 768);
    assert.equal(chunks[0].metadata.companyNormalized, 'directi');
  });

  // Teardown
  await t.test('Cleanup test server and database', async () => {
    if (server) server.close();
    await disconnectDB();
  });
});
