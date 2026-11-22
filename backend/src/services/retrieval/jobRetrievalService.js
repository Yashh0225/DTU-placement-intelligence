import { Job } from '../../models/Job.js';
import { normalizeCompanyName } from '../../utils/normalize.js';

/**
 * Historical Job Structured Retrieval Service
 * Executes deterministic MongoDB queries based on structured criteria.
 * Does NOT use vector search.
 *
 * @param {object} criteria
 * @param {string} [criteria.company] - Company name
 * @param {number} [criteria.minCtc] - Minimum package in LPA
 * @param {number} [criteria.maxCtc] - Maximum package in LPA
 * @param {string} [criteria.branch] - Eligible branch (COE, IT, SE, etc.)
 * @param {string} [criteria.batch] - Graduation batch (e.g. 2024, 2025)
 * @param {string} [criteria.role] - Job role
 * @param {string} [criteria.type] - Job type ('internship', 'full-time', etc.)
 * @param {number} [criteria.minCgpa] - Maximum acceptable min CGPA requirement
 * @param {number} [criteria.limit=10] - Number of records to return
 * @returns {Promise<Array<object>>} - Clean structured job records
 */
export const searchJobs = async (criteria = {}) => {
  const {
    company,
    minCtc,
    maxCtc,
    branch,
    batch,
    role,
    type,
    minCgpa,
    limit = 10,
  } = criteria;

  const filter = { status: 'published' };

  if (company) {
    filter.companyNormalized = normalizeCompanyName(company);
  }

  if ((minCtc !== undefined && minCtc !== null) || (maxCtc !== undefined && maxCtc !== null)) {
    filter.ctc = {};
    if (minCtc !== undefined && minCtc !== null && !isNaN(Number(minCtc))) {
      filter.ctc.$gte = Number(minCtc);
    }
    if (maxCtc !== undefined && maxCtc !== null && !isNaN(Number(maxCtc))) {
      filter.ctc.$lte = Number(maxCtc);
    }
  }

  if (branch && branch.trim()) {
    filter.eligibleBranches = { $in: [new RegExp(`^${branch.trim()}$`, 'i')] };
  }

  if (batch && String(batch).trim()) {
    filter.batch = String(batch).trim();
  }

  if (role && role.trim()) {
    filter.role = { $regex: role.trim(), $options: 'i' };
  }

  if (type && type.trim()) {
    filter.type = type.trim().toLowerCase();
  }

  if (minCgpa !== undefined && minCgpa !== null && !isNaN(Number(minCgpa))) {
    // If student has a certain CGPA, company requirement should be <= student's CGPA
    filter.minCgpa = { $lte: Number(minCgpa) };
  }

  const jobs = await Job.find(filter)
    .sort({ ctc: -1, createdAt: -1 })
    .limit(Math.min(Number(limit), 50))
    .lean();

  return jobs.map((job) => ({
    sourceId: String(job._id),
    sourceType: 'job_announcement',
    company: job.company,
    role: job.role,
    type: job.type,
    ctc: job.ctc,
    ctcBreakup: job.ctcBreakup,
    stipend: job.stipend,
    eligibleBranches: job.eligibleBranches,
    minCgpa: job.minCgpa,
    batch: job.batch,
    location: job.location,
    applicationDeadline: job.applicationDeadline,
    announcementDate: job.announcementDate,
    originalMessage: job.originalMessage,
  }));
};
