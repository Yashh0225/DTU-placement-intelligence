import { ExperienceChunk } from '../../models/ExperienceChunk.js';
import { generateEmbedding } from '../embeddings/embeddingService.js';
import { normalizeCompanyName } from '../../utils/normalize.js';

/**
 * Compute cosine similarity between two float vectors
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Student Experience Vector Retrieval Service
 * 1. Generates query embedding.
 * 2. Applies metadata filters (e.g., company, placementYear, role).
 * 3. Executes Atlas Vector Search or cosine similarity fallback.
 * 4. Preserves source references.
 *
 * @param {object} params
 * @param {string} params.queryText - Natural language query
 * @param {string} [params.company] - Company filter
 * @param {string} [params.role] - Role filter
 * @param {number} [params.year] - Placement year filter
 * @param {number} [params.limit=5] - Number of chunks to retrieve
 * @returns {Promise<Array<object>>} - Relevant experience chunks with scores
 */
export const searchExperiences = async (params = {}) => {
  const { queryText, company, role, year, limit = 5 } = params;

  if (!queryText || typeof queryText !== 'string') {
    throw new Error('queryText is required for semantic experience retrieval');
  }

  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(queryText);

  // 2. Build metadata filter
  const filter = {};
  if (company) {
    filter['metadata.companyNormalized'] = normalizeCompanyName(company);
  }
  if (role) {
    filter['metadata.role'] = { $regex: role.trim(), $options: 'i' };
  }
  if (year && !isNaN(Number(year))) {
    filter['metadata.placementYear'] = Number(year);
  }

  // 3. Vector search execution:
  // First attempt MongoDB Atlas $vectorSearch if configured on Atlas cluster
  try {
    const atlasPipeline = [
      {
        $vectorSearch: {
          index: 'experience_vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: Math.max(limit * 10, 50),
          limit: Number(limit),
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        },
      },
      {
        $project: {
          experienceId: 1,
          chunkIndex: 1,
          totalChunks: 1,
          chunkText: 1,
          section: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const atlasResults = await ExperienceChunk.aggregate(atlasPipeline);
    if (atlasResults && atlasResults.length > 0) {
      return atlasResults.map((chunk) => ({
        sourceId: String(chunk.experienceId),
        chunkId: String(chunk._id),
        sourceType: 'student_experience',
        section: chunk.section,
        chunkText: chunk.chunkText,
        company: chunk.metadata.company,
        role: chunk.metadata.role,
        placementYear: chunk.metadata.placementYear,
        score: parseFloat((chunk.score || 0).toFixed(4)),
      }));
    }
  } catch (atlasErr) {
    // Atlas Vector Search is only available on MongoDB Atlas tier M10+ with vectorSearch index.
    // In local dev/test or clusters without vector index, fallback to candidate cosine similarity.
  }

  // Filter candidates in MongoDB and compute vector cosine similarity
  const candidates = await ExperienceChunk.find(filter)
    .populate('experienceId', 'originalNarrative extractedStructure moderationStatus')
    .lean();

  if (!candidates || candidates.length === 0) {
    return [];
  }

  // Compute cosine similarity against queryEmbedding
  const scoredCandidates = candidates.map((chunk) => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      sourceId: String(chunk.experienceId?._id || chunk.experienceId),
      chunkId: String(chunk._id),
      sourceType: 'student_experience',
      section: chunk.section,
      chunkText: chunk.chunkText,
      company: chunk.metadata.company,
      role: chunk.metadata.role,
      placementYear: chunk.metadata.placementYear,
      topics: chunk.metadata.topics || [],
      extractedStructure: chunk.experienceId?.extractedStructure || null,
      score: parseFloat(score.toFixed(4)),
    };
  });

  // Sort descending by similarity score
  scoredCandidates.sort((a, b) => b.score - a.score);

  return scoredCandidates.slice(0, Number(limit));
};
