import { Job } from '../models/Job.js';
import { normalizeCompanyName } from '../utils/normalize.js';

export const getJobs = async (req, res, next) => {
  try {
    const { company, minCtc, maxCtc, branch, batch, type, search, limit = 50, page = 1 } = req.query;

    const query = {};

    if (company) {
      query.companyNormalized = normalizeCompanyName(company);
    }

    if (minCtc !== undefined || maxCtc !== undefined) {
      query.ctc = {};
      if (minCtc !== undefined && !isNaN(Number(minCtc))) {
        query.ctc.$gte = Number(minCtc);
      }
      if (maxCtc !== undefined && !isNaN(Number(maxCtc))) {
        query.ctc.$lte = Number(maxCtc);
      }
    }

    if (branch) {
      query.eligibleBranches = { $in: [new RegExp(`^${branch.trim()}$`, 'i')] };
    }

    if (batch) {
      query.batch = batch.trim();
    }

    if (type) {
      query.type = type.trim().toLowerCase();
    }

    if (search) {
      const searchNorm = normalizeCompanyName(search);
      query.$or = [
        { company: { $regex: search, $options: 'i' } },
        { companyNormalized: { $regex: searchNorm, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [jobs, total] = await Promise.all([
      Job.find(query).sort({ ctc: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      Job.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job record not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

export const createJob = async (req, res, next) => {
  try {
    const {
      company,
      role,
      type,
      eligibleBranches,
      minCgpa,
      class10Percentage,
      class12Percentage,
      allowedBacklogs,
      batch,
      stipend,
      ctc,
      ctcBreakup,
      ppo,
      location,
      applicationDeadline,
      announcementDate,
      originalMessage,
      source,
    } = req.body;

    if (!company || !role || !originalMessage) {
      return res.status(400).json({
        success: false,
        message: 'Company, role, and original announcement message are required',
      });
    }

    const companyNormalized = normalizeCompanyName(company);

    let parsedDeadline = null;
    if (applicationDeadline) {
      const d = new Date(applicationDeadline);
      if (!isNaN(d.getTime())) {
        parsedDeadline = d;
      }
    }

    let parsedAnnouncementDate = new Date();
    if (announcementDate) {
      const d = new Date(announcementDate);
      if (!isNaN(d.getTime())) {
        parsedAnnouncementDate = d;
      }
    }

    const job = await Job.create({
      company: company.trim(),
      companyNormalized,
      role: role.trim(),
      type: type || 'full-time',
      eligibleBranches: Array.isArray(eligibleBranches) ? eligibleBranches : [],
      minCgpa: minCgpa !== undefined && minCgpa !== null && !isNaN(Number(minCgpa)) ? Number(minCgpa) : null,
      class10Percentage: class10Percentage !== undefined && class10Percentage !== null && !isNaN(Number(class10Percentage)) ? Number(class10Percentage) : null,
      class12Percentage: class12Percentage !== undefined && class12Percentage !== null && !isNaN(Number(class12Percentage)) ? Number(class12Percentage) : null,
      allowedBacklogs: allowedBacklogs !== undefined && allowedBacklogs !== null && !isNaN(Number(allowedBacklogs)) ? Number(allowedBacklogs) : 0,
      batch: batch ? String(batch).trim() : null,
      stipend: stipend ? String(stipend).trim() : null,
      ctc: ctc !== undefined && ctc !== null && !isNaN(Number(ctc)) ? Number(ctc) : null,
      ctcBreakup: ctcBreakup ? String(ctcBreakup).trim() : null,
      ppo: Boolean(ppo),
      location: Array.isArray(location) ? location : (location ? [location] : []),
      applicationDeadline: parsedDeadline,
      announcementDate: parsedAnnouncementDate,
      originalMessage,
      source: source || { channel: 'WhatsApp', verifiedBy: 'admin' },
      status: 'published',
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

export const bulkImportJobs = async (req, res, next) => {
  try {
    const { jobs } = req.body;
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of jobs is required' });
    }

    let inserted = 0;
    let updated = 0;

    for (const item of jobs) {
      if (!item.company || !item.role) continue;
      const companyName = item.company.trim();
      const companyNorm = normalizeCompanyName(companyName);
      const role = item.role.trim();
      const batch = item.batch ? String(item.batch).trim() : null;

      const ctc = item.ctc !== undefined && item.ctc !== null && !isNaN(Number(item.ctc)) ? Number(item.ctc) : null;
      const minCgpa = item.minCgpa !== undefined && item.minCgpa !== null && !isNaN(Number(item.minCgpa)) ? Number(item.minCgpa) : null;
      const class10Percentage = item.class10Percentage !== undefined && item.class10Percentage !== null && !isNaN(Number(item.class10Percentage)) ? Number(item.class10Percentage) : null;
      const class12Percentage = item.class12Percentage !== undefined && item.class12Percentage !== null && !isNaN(Number(class12Percentage)) ? Number(class12Percentage) : null;
      const allowedBacklogs = item.allowedBacklogs !== undefined && item.allowedBacklogs !== null && !isNaN(Number(item.allowedBacklogs)) ? Number(item.allowedBacklogs) : 0;

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

      const existing = await Job.findOne({ companyNormalized: companyNorm, role, batch });
      if (existing) {
        await Job.updateOne({ _id: existing._id }, { $set: doc });
        updated++;
      } else {
        await Job.create(doc);
        inserted++;
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${jobs.length} jobs (Inserted: ${inserted}, Updated: ${updated})`,
      data: { total: jobs.length, inserted, updated },
    });
  } catch (error) {
    next(error);
  }
};
