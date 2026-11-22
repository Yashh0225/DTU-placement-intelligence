import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from '../config/db.js';
import { Job } from '../models/Job.js';
import { Company } from '../models/Company.js';
import { normalizeCompanyName } from './normalize.js';

const parseNullableNum = (val) => {
  if (val === '' || val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
};

export const importJobsFromFile = async (filePath = 'data/jobs_2027.json') => {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const items = JSON.parse(raw);

  if (!Array.isArray(items)) {
    throw new Error('Expected JSON content to be an array of job objects');
  }

  console.log(`[ImportJobs] Starting import of ${items.length} records from ${path.basename(resolvedPath)}...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of items) {
    if (!item.company || !item.role) {
      console.warn(`[ImportJobs] Skipping item missing company or role:`, item);
      continue;
    }

    const companyName = item.company.trim();
    const companyNorm = normalizeCompanyName(companyName);
    const role = item.role.trim();
    const batch = item.batch ? String(item.batch).trim() : null;

    const ctc = parseNullableNum(item.ctc);
    const minCgpa = parseNullableNum(item.minCgpa);
    const class10Percentage = parseNullableNum(item.class10Percentage);
    const class12Percentage = parseNullableNum(item.class12Percentage);
    const allowedBacklogs = parseNullableNum(item.allowedBacklogs) ?? 0;

    const doc = {
      company: companyName,
      companyNormalized: companyNorm,
      role,
      type: item.type || 'full-time',
      eligibleBranches: Array.isArray(item.eligibleBranches) ? item.eligibleBranches : [],
      minCgpa,
      class10Percentage,
      class12Percentage,
      allowedBacklogs,
      batch,
      stipend: item.stipend ? String(item.stipend).trim() : null,
      ctc,
      ctcBreakup: item.ctcBreakup ? String(item.ctcBreakup).trim() : null,
      ppo: Boolean(item.ppo),
      location: Array.isArray(item.location) ? item.location : (item.location ? [item.location] : []),
      originalMessage: item.originalMessage || `Imported placement record for ${companyName} (${role})`,
      status: 'published',
      source: { channel: 'ChatGPT Structured Batch', verifiedBy: 'admin' },
    };

    // Upsert into jobs collection based on companyNormalized, role, batch
    const existing = await Job.findOne({
      companyNormalized: companyNorm,
      role,
      batch,
    });

    if (existing) {
      await Job.updateOne({ _id: existing._id }, { $set: doc });
      updatedCount++;
    } else {
      await Job.create(doc);
      insertedCount++;
    }

    // Upsert or update Company collection profile
    let tier = 'Dream';
    if (ctc >= 20) tier = 'Super Dream';
    else if (ctc >= 10) tier = 'Dream';
    else tier = 'Mass / Normal';

    const existingCompany = await Company.findOne({ normalizedName: companyNorm });
    if (existingCompany) {
      const highest = Math.max(existingCompany.highestPackage || 0, ctc || 0);
      await Company.updateOne(
        { _id: existingCompany._id },
        {
          $set: {
            highestPackage: highest,
            tier: highest >= 20 ? 'Super Dream' : highest >= 10 ? 'Dream' : existingCompany.tier,
          },
        }
      );
    } else {
      await Company.create({
        name: companyName,
        normalizedName: companyNorm,
        industry: 'Technology / Engineering',
        tier,
        highestPackage: ctc || 0,
        averagePackage: ctc || 0,
        tags: [tier, 'Campus 2027'],
      });
    }
  }

  console.log(`[ImportJobs] Successfully imported! Inserted: ${insertedCount}, Updated: ${updatedCount}, Total: ${items.length}`);
  return { insertedCount, updatedCount, total: items.length };
};

// If run directly from CLI
const isDirectRun = process.argv[1] && process.argv[1].endsWith('importJobsJson.js');
if (isDirectRun) {
  const filePath = process.argv[2] || 'data/jobs_2027.json';
  (async () => {
    try {
      await connectDB();
      await importJobsFromFile(filePath);
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[ImportJobs Error]:', err);
      process.exit(1);
    }
  })();
}
