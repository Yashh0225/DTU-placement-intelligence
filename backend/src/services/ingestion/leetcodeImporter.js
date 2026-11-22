import fs from 'fs';
import csvParser from 'csv-parser';
import { LeetCodeQuestion } from '../../models/LeetCodeQuestion.js';
import { normalizeCompanyName } from '../../utils/normalize.js';

/**
 * Standardize difficulty to 'Easy', 'Medium', or 'Hard'
 */
const normalizeDifficulty = (diff) => {
  if (!diff) return 'Medium';
  const d = String(diff).trim().toLowerCase();
  if (d.startsWith('e')) return 'Easy';
  if (d.startsWith('h')) return 'Hard';
  return 'Medium';
};

/**
 * Parse comma or semicolon separated topics
 */
const parseTopics = (topicsStr) => {
  if (!topicsStr) return [];
  return String(topicsStr)
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
};

/**
 * Parses and imports CSV rows into leetcode_questions collection.
 * Supports repeatable imports without creating duplicates by using
 * MongoDB bulkWrite with upsert on compound key { companyNormalized, title }.
 *
 * @param {string | NodeJS.ReadableStream} input - File path or Readable Stream
 * @param {string} defaultCompany - Fallback company name if column is missing or company-specific file
 */
export const importLeetCodeCsv = async (input, defaultCompany = '') => {
  let stream;
  if (typeof input === 'string') {
    if (!fs.existsSync(input)) {
      throw new Error(`LeetCode CSV file not found at: ${input}`);
    }
    stream = fs.createReadStream(input);
  } else {
    stream = input;
  }

  const rawRows = [];

  await new Promise((resolve, reject) => {
    stream
      .pipe(csvParser())
      .on('data', (data) => rawRows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  const operations = [];
  let validCount = 0;
  let skippedCount = 0;

  for (const row of rawRows) {
    // Recognize various column naming conventions in company-wise LeetCode datasets
    const title = row['Title'] || row['title'] || row['Problem Title'] || row['Problem'] || row['problem_title'];
    const difficultyRaw = row['Difficulty'] || row['difficulty'] || row['Level'];
    const companyRaw = row['Company'] || row['company'] || defaultCompany;
    const problemIdRaw = row['ID'] || row['problemId'] || row['Index'] || row['#'] || row['S.No.'];
    const url = row['Link'] || row['url'] || row['Problem URL'] || row['link'] || '';
    const frequencyRaw = row['Frequency'] || row['frequency'] || row['Score'] || 0;
    const acceptanceRaw = row['Acceptance'] || row['acceptance'] || row['Acceptance Rate'] || '';
    const topicsRaw = row['Topics'] || row['topics'] || row['Tags'] || row['related_topics'] || '';

    if (!title || !companyRaw) {
      skippedCount++;
      continue;
    }

    const companyNormalized = normalizeCompanyName(companyRaw);
    if (!companyNormalized) {
      skippedCount++;
      continue;
    }

    const problemId = problemIdRaw && !isNaN(Number(problemIdRaw)) ? Number(problemIdRaw) : null;
    const frequency = !isNaN(parseFloat(frequencyRaw)) ? parseFloat(frequencyRaw) : 0;
    const difficulty = normalizeDifficulty(difficultyRaw);
    const topics = parseTopics(topicsRaw);

    operations.push({
      updateOne: {
        filter: {
          companyNormalized,
          title: title.trim(),
        },
        update: {
          $set: {
            problemId,
            title: title.trim(),
            difficulty,
            company: companyRaw.trim(),
            companyNormalized,
            acceptanceRate: String(acceptanceRaw).trim(),
            frequency,
            url: String(url).trim(),
            topics,
            sourceDataset: 'Yashh0225/leetcode-company-wise-problems',
          },
        },
        upsert: true,
      },
    });

    validCount++;
  }

  let bulkResult = null;
  if (operations.length > 0) {
    bulkResult = await LeetCodeQuestion.bulkWrite(operations, { ordered: false });
  }

  return {
    totalRows: rawRows.length,
    validRows: validCount,
    skippedRows: skippedCount,
    upsertedCount: bulkResult ? bulkResult.upsertedCount : 0,
    modifiedCount: bulkResult ? bulkResult.modifiedCount : 0,
    matchedCount: bulkResult ? bulkResult.matchedCount : 0,
  };
};
