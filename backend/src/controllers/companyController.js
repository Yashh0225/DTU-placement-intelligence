import { Company } from '../models/Company.js';
import { Job } from '../models/Job.js';
import { Experience } from '../models/Experience.js';
import { normalizeCompanyName } from '../utils/normalize.js';

export const getCompanies = async (req, res, next) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;

    const query = {};
    if (search) {
      const searchNorm = normalizeCompanyName(search);
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { normalizedName: { $regex: searchNorm, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [companies, total] = await Promise.all([
      Company.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit)),
      Company.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: companies,
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

export const getDashboardStats = async (req, res, next) => {
  try {
    const [totalJobs, totalExperiences, totalCompanies, distinctJobCompanies, distinctExpCompanies] =
      await Promise.all([
        Job.countDocuments(),
        Experience.countDocuments(),
        Company.countDocuments(),
        Job.distinct('companyNormalized'),
        Experience.distinct('companyNormalized'),
      ]);

    const allCompaniesSet = new Set([...distinctJobCompanies, ...distinctExpCompanies]);
    const computedTotalCompanies = Math.max(totalCompanies, allCompaniesSet.size);

    // Aggregate frequently discussed interview topics from actual experiences
    const topicAggregates = await Experience.aggregate([
      { $unwind: '$extractedStructure.dsaTopics' },
      { $group: { _id: '$extractedStructure.dsaTopics', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { topic: '$_id', count: 1, _id: 0 } },
    ]);

    // Average and highest CTC statistics from real database records
    const salaryStats = await Job.aggregate([
      { $match: { ctc: { $ne: null, $gt: 0 } } },
      {
        $group: {
          _id: null,
          highestCtc: { $max: '$ctc' },
          avgCtc: { $avg: '$ctc' },
          totalOffers: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalCompanies: computedTotalCompanies,
        totalJobs,
        totalExperiences,
        topTopics: topicAggregates,
        highestCtc: salaryStats[0]?.highestCtc || 0,
        avgCtc: salaryStats[0]?.avgCtc ? Number(salaryStats[0].avgCtc.toFixed(2)) : 0,
        totalOffersWithSalary: salaryStats[0]?.totalOffers || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
