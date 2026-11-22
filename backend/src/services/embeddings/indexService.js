import { Experience } from '../../models/Experience.js';
import { ExperienceChunk } from '../../models/ExperienceChunk.js';
import { conditionallyChunkExperience } from './chunker.js';
import { generateEmbedding } from './embeddingService.js';

/**
 * Indexes an individual student experience:
 * 1. Takes original narrative.
 * 2. Cleans text & applies conditional chunking.
 * 3. Generates 768-dim embeddings for each chunk.
 * 4. Stores chunks and vectors in MongoDB experience_chunks collection.
 * 5. Marks experience as isIndexed: true.
 *
 * @param {string} experienceId - MongoDB ObjectId of experience
 * @returns {Promise<Array<object>>} - Created chunk documents
 */
export const indexExperience = async (experienceId) => {
  const experience = await Experience.findById(experienceId);
  if (!experience) {
    throw new Error(`Experience with ID ${experienceId} not found`);
  }

  // 1 & 2: Conditional chunking (short remains 1 chunk, long split by round/section)
  const chunksToEmbed = conditionallyChunkExperience(experience);

  // 3: Generate embeddings
  const chunkDocs = [];
  for (const chunk of chunksToEmbed) {
    const embedding = await generateEmbedding(chunk.chunkText);
    chunkDocs.push({
      experienceId: experience._id,
      chunkIndex: chunk.chunkIndex,
      totalChunks: chunk.totalChunks,
      chunkText: chunk.chunkText,
      section: chunk.section,
      embedding,
      metadata: chunk.metadata,
    });
  }

  // 4: Delete any prior chunks for this experience (idempotency) and insert new ones
  await ExperienceChunk.deleteMany({ experienceId: experience._id });
  const createdChunks = await ExperienceChunk.insertMany(chunkDocs);

  // 5: Update parent experience status
  await Experience.findByIdAndUpdate(experience._id, { isIndexed: true });

  return createdChunks;
};

/**
 * Batch indexing for unindexed or all experiences.
 */
export const indexAllUnindexedExperiences = async () => {
  const unindexed = await Experience.find({ isIndexed: false });
  let successCount = 0;

  for (const exp of unindexed) {
    try {
      await indexExperience(exp._id);
      successCount++;
    } catch (err) {
      console.error(`Failed to index experience ${exp._id}:`, err.message);
    }
  }

  return { total: unindexed.length, indexed: successCount };
};
