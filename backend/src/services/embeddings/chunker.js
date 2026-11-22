import { cleanNarrativeText } from './textCleaner.js';
import { normalizeCompanyName } from '../../utils/normalize.js';

const SHORT_EXPERIENCE_CHAR_LIMIT = 1500;
const SHORT_EXPERIENCE_WORD_LIMIT = 250;

/**
 * Splits text into meaningful interview rounds or section boundaries
 */
const splitByRounds = (text) => {
  // Regex pattern matching Round 1, Round 2, OA, Technical Round, HR Round, etc.
  const roundHeaderPattern = /(?=(?:^|\n)(?:(?:Round\s*\d+|OA|Online Assessment|Technical Round\s*\d*|HR Round|Behavioral Round|System Design Round)[\s:\-–—]))/i;

  const sections = text.split(roundHeaderPattern).map((s) => s.trim()).filter((s) => s.length > 0);
  return sections;
};

/**
 * Conditional Chunking Implementation:
 * 1. Short experiences of a few paragraphs remain ONE single chunk.
 * 2. Longer experiences split by meaningful interview rounds or sections.
 * 3. Fallback to paragraph splitting if no round headers exist.
 * 4. Preserves company, role, year, and experience ID metadata.
 *
 * @param {object} experience - The Experience mongoose document or plain object
 * @returns {Array<object>} - Array of chunk objects ready for embedding
 */
export const conditionallyChunkExperience = (experience) => {
  const narrative = cleanNarrativeText(experience.originalNarrative);
  const words = narrative.split(/\s+/).filter(Boolean);
  const charCount = narrative.length;

  const baseMetadata = {
    company: experience.company,
    companyNormalized: experience.companyNormalized || normalizeCompanyName(experience.company),
    role: experience.role,
    placementYear: experience.placementYear,
    topics: experience.extractedStructure?.dsaTopics || [],
  };

  // Rule 1: Short experiences of a few paragraphs remain one chunk
  if (words.length <= SHORT_EXPERIENCE_WORD_LIMIT || charCount <= SHORT_EXPERIENCE_CHAR_LIMIT) {
    return [
      {
        experienceId: experience._id,
        chunkIndex: 0,
        totalChunks: 1,
        chunkText: narrative,
        section: 'Full Interview Experience',
        metadata: baseMetadata,
      },
    ];
  }

  // Rule 2: Split longer experiences by meaningful interview rounds or sections
  let sections = splitByRounds(narrative);

  // If no round markers found, split by double-newline paragraphs
  if (sections.length <= 1) {
    sections = narrative
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 50);
  }

  // If still 1 section or paragraphs are too long, group into chunks of ~800-1200 chars
  const chunks = [];
  sections.forEach((sec, idx) => {
    // Extract section title if present
    const firstLine = sec.split('\n')[0].substring(0, 50).trim();
    const sectionName = /round|oa|assessment|interview|hr/i.test(firstLine)
      ? firstLine
      : `Section ${idx + 1}`;

    chunks.push({
      experienceId: experience._id,
      chunkIndex: idx,
      totalChunks: sections.length,
      chunkText: sec,
      section: sectionName,
      metadata: baseMetadata,
    });
  });

  // Re-adjust totalChunks count
  chunks.forEach((c) => {
    c.totalChunks = chunks.length;
  });

  return chunks;
};
