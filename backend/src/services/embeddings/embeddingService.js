import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const EMBEDDING_DIM = 768; // Gemini text-embedding-004 standard dimension

/**
 * Deterministic pseudo-embedding for testing or offline mode
 * Generates an L2-normalized 768-dim float vector based on text content
 */
const generateDeterministicEmbedding = (text) => {
  const vector = new Array(EMBEDDING_DIM).fill(0);
  const clean = text.toLowerCase().trim();

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const pos = (code * 31 + i * 17) % EMBEDDING_DIM;
    vector[pos] += code / 255.0;
  }

  // L2 normalize vector
  let sumSq = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1.0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vector[i] = parseFloat((vector[i] / norm).toFixed(6));
  }

  return vector;
};

/**
 * Generates 768-dim embeddings using Gemini text-embedding-004
 * Falls back gracefully to deterministic normalized vector in test/offline environments.
 *
 * @param {string} text - Content to embed
 * @returns {Promise<number[]>} - Float array of length 768
 */
export const generateEmbedding = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required to generate embedding');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return generateDeterministicEmbedding(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIM,
    });

    if (result && result.embedding && Array.isArray(result.embedding.values)) {
      return result.embedding.values;
    }

    return generateDeterministicEmbedding(text);
  } catch (err) {
    console.warn('[Gemini Embedding API Error, using fallback embedding]:', err.message);
    return generateDeterministicEmbedding(text);
  }
};
