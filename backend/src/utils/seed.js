import { connectDB, disconnectDB } from '../config/db.js';
import { Job } from '../models/Job.js';
import { Experience } from '../models/Experience.js';
import { Company } from '../models/Company.js';
import { LeetCodeQuestion } from '../models/LeetCodeQuestion.js';
import { indexExperience } from '../services/embeddings/indexService.js';
import { importLeetCodeCsv } from '../services/ingestion/leetcodeImporter.js';
import { normalizeCompanyName } from './normalize.js';
import path from 'path';

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Ensuring model indexes...');
    await Promise.all([
      Job.init(),
      Experience.init(),
      Company.init(),
      LeetCodeQuestion.init(),
    ]);

    // 1. Jobs
    const jobCount = await Job.countDocuments();
    if (jobCount === 0) {
      console.log('[Seed] Seeding historical placement announcements...');
      await Job.create([
        {
          company: 'Amazon India',
          companyNormalized: normalizeCompanyName('Amazon India'),
          role: 'Software Development Engineer - 1 (SDE-1)',
          type: 'full-time',
          eligibleBranches: ['COE', 'IT', 'SE', 'ECE'],
          minCgpa: 7.0,
          batch: '2025',
          ctc: 44.5,
          ctcBreakup: 'Base: 20 LPA + Stock Units: 16 LPA + Joining Bonus: 8.5 LPA',
          location: ['Bangalore', 'Hyderabad', 'Delhi NCR'],
          ppo: true,
          originalMessage: `*CAMPUS PLACEMENT NOTICE: AMAZON INDIA*\nProfile: SDE-1\nEligibility: COE, IT, SE, ECE (CGPA >= 7.0)\nCTC: 44.5 LPA (Base 20 LPA + RSUs 16 LPA + 8.5 Bonus)\nLocation: Bangalore / Hyderabad / Gurugram\nOnline Test Date: 28th August 2024.`,
          status: 'published',
        },
        {
          company: 'Microsoft',
          companyNormalized: normalizeCompanyName('Microsoft'),
          role: 'Software Engineer',
          type: 'full-time',
          eligibleBranches: ['COE', 'IT', 'SE', 'ECE'],
          minCgpa: 8.0,
          batch: '2025',
          ctc: 51.0,
          ctcBreakup: 'Base: 19.5 LPA + Stocks: $50k / 4 yrs + Sign-on bonus',
          location: ['Noida', 'Hyderabad', 'Bangalore'],
          ppo: true,
          originalMessage: `*MICROSOFT CAMPUS HIRING 2025*\nRole: Software Engineer (Full Time)\nEligible Disciplines: B.Tech (COE, IT, SE, ECE)\nCutoff: 8.00 CGPA with no active backlogs\nCTC Offered: 51.0 LPA CTC\nOnline assessment on Mettl platform.`,
          status: 'published',
        },
        {
          company: 'Uber',
          companyNormalized: normalizeCompanyName('Uber'),
          role: 'Software Engineer - Backend',
          type: 'full-time',
          eligibleBranches: ['COE', 'IT', 'SE'],
          minCgpa: 7.5,
          batch: '2025',
          ctc: 38.0,
          ctcBreakup: 'Base: 22 LPA + Stocks: 16 LPA',
          location: ['Bangalore', 'Hyderabad'],
          ppo: false,
          originalMessage: `*UBER CAMPUS DRIVE 2025*\nProfile: Software Engineer - Backend\nEligibility: COE, IT, SE (Min CGPA: 7.5)\nPackage: 38 LPA\nLocation: Bangalore / Hyderabad\nDeadline: 25th August 2024.`,
          status: 'published',
        },
        {
          company: 'Google',
          companyNormalized: normalizeCompanyName('Google'),
          role: 'Software Engineer (SWE)',
          type: 'full-time',
          eligibleBranches: ['COE', 'IT', 'SE', 'ECE', 'EE', 'MAM'],
          minCgpa: 8.0,
          batch: '2025',
          ctc: 55.0,
          ctcBreakup: 'Base: 22 LPA + Bonus + Equity',
          location: ['Bangalore', 'Hyderabad'],
          ppo: true,
          originalMessage: `*GOOGLE INDIA UNIVERSITY PLACEMENTS*\nRole: Software Engineer\nEligible: All Circuit Branches (COE, IT, SE, ECE, EE)\nCutoff: 8.0 CGPA\nCompensation: 55 LPA\nFormat: 2 Technical Google Meet rounds.`,
          status: 'published',
        },
        {
          company: 'Adobe',
          companyNormalized: normalizeCompanyName('Adobe'),
          role: 'Member of Technical Staff (MTS-1)',
          type: 'full-time',
          eligibleBranches: ['COE', 'IT', 'SE', 'ECE'],
          minCgpa: 7.0,
          batch: '2025',
          ctc: 40.5,
          ctcBreakup: 'Base: 18.5 LPA + Stocks: 15 LPA + Signing bonus',
          location: ['Noida', 'Bangalore'],
          ppo: false,
          originalMessage: `*ADOBE SYSTEMS DTU HIRING 2025*\nRole: MTS-1\nEligibility: COE, IT, SE, ECE with CGPA 7.0+\nCTC: 40.5 LPA\nOA details: 2 coding questions + 20 MCQs.`,
          status: 'published',
        },
        {
          company: 'Goldman Sachs',
          companyNormalized: normalizeCompanyName('Goldman Sachs'),
          role: 'Analyst - Engineering',
          type: 'internship+fte',
          eligibleBranches: ['COE', 'IT', 'SE', 'ECE', 'EE', 'ME', 'CE', 'EP'],
          minCgpa: 7.0,
          batch: '2025',
          ctc: 32.0,
          ctcBreakup: 'Base: 20 LPA + Performance Bonus: 12 LPA',
          location: ['Bangalore', 'Hyderabad'],
          ppo: true,
          originalMessage: `*GOLDMAN SACHS CAMPUS RECRUITMENT*\nPosition: Analyst - Engineering (Intern+FTE)\nBranches: All Engineering branches with CGPA 7.0+\nCompensation: 32 LPA\nStipend: 1,00,000/month during summer internship.`,
          status: 'published',
        },
      ]);
      console.log('[Seed] Seeded default jobs.');
    } else {
      console.log(`[Seed] Database already contains ${jobCount} job records.`);
    }

    // 2. Experiences
    const expCount = await Experience.countDocuments();
    if (expCount === 0) {
      console.log('[Seed] Seeding student interview experiences...');
      const exp1 = await Experience.create({
        company: 'Amazon India',
        companyNormalized: normalizeCompanyName('Amazon India'),
        role: 'SDE-1',
        placementYear: 2024,
        originalNarrative: `Round 1: Online Assessment on HackerRank with 2 coding questions (Sliding window substring and BFS on matrix).
Round 2: Technical Interview 1 focused on data structures. Implemented LRU Cache from scratch with doubly linked list and hash map. Deep dive into time complexity.
Round 3: Technical Interview 2 covered trees and OS concepts. Question was Lowest Common Ancestor in Binary Tree and virtual memory concepts. Leadership principles covered in all rounds.`,
        extractedStructure: {
          roundsCount: 3,
          rounds: [
            {
              roundNumber: 1,
              roundName: 'Online Assessment',
              roundType: 'OA',
              topicsCovered: ['Sliding Window', 'BFS', 'Matrix'],
              questions: ['Longest Substring Without Repeating Characters', 'Shortest Path in Binary Matrix'],
              description: '2 medium coding questions on HackerRank.',
            },
            {
              roundNumber: 2,
              roundName: 'Technical Round 1',
              roundType: 'Technical',
              topicsCovered: ['LRU Cache', 'Doubly Linked List', 'Hash Table'],
              questions: ['LRU Cache Implementation'],
              description: 'Design problem and LP questions.',
            },
            {
              roundNumber: 3,
              roundName: 'Technical Round 2',
              roundType: 'Technical',
              topicsCovered: ['Trees', 'Binary Tree', 'Operating Systems'],
              questions: ['Lowest Common Ancestor'],
              description: 'Tree recursion and core CS fundamentals.',
            },
          ],
          dsaTopics: ['Sliding Window', 'Graphs', 'BFS', 'LRU Cache', 'Trees'],
          csFundamentals: ['OS', 'DBMS', 'Virtual Memory'],
          difficulty: 'Medium',
          overallVerdict: 'Selected',
        },
        submissionType: 'narrative_llm',
        studentConfirmed: true,
        moderationStatus: 'verified',
      });

      const exp2 = await Experience.create({
        company: 'Microsoft',
        companyNormalized: normalizeCompanyName('Microsoft'),
        role: 'Software Engineer',
        placementYear: 2024,
        originalNarrative: `Round 1: Coding round on Mettl. 3 questions: Longest Palindromic Substring with Dynamic Programming, Merge Two Sorted Lists, and Best Time to Buy and Sell Stock.
Round 2: Technical Interview focusing on Trees and recursion. Was asked to find the diameter of a binary tree and invert a binary tree. Discussed deadlock conditions in OS.
Round 3: Behavioral round with Director. Discussed my summer project architecture and trade-offs. Got selected!`,
        extractedStructure: {
          roundsCount: 3,
          rounds: [
            {
              roundNumber: 1,
              roundName: 'Online Assessment',
              roundType: 'OA',
              topicsCovered: ['Dynamic Programming', 'Linked List', 'Strings'],
              questions: ['Longest Palindromic Substring', 'Merge Two Sorted Lists'],
              description: 'Mettl coding test.',
            },
            {
              roundNumber: 2,
              roundName: 'Technical Round 1',
              roundType: 'Technical',
              topicsCovered: ['Trees', 'Binary Tree'],
              questions: ['Diameter of Binary Tree', 'Invert Binary Tree'],
              description: 'Tree recursion and OS deadlock.',
            },
          ],
          dsaTopics: ['Dynamic Programming', 'Linked List', 'Trees', 'Strings'],
          csFundamentals: ['Operating Systems', 'Deadlocks'],
          difficulty: 'Medium',
          overallVerdict: 'Selected',
        },
        submissionType: 'narrative_llm',
        studentConfirmed: true,
        moderationStatus: 'verified',
      });

      console.log('[Seed] Indexing embeddings for student experiences...');
      await indexExperience(exp1._id);
      await indexExperience(exp2._id);
    } else {
      console.log(`[Seed] Database already contains ${expCount} experience records.`);
    }

    // 3. LeetCode questions
    const lcCount = await LeetCodeQuestion.countDocuments();
    if (lcCount === 0) {
      console.log('[Seed] Importing LeetCode company-wise problems...');
      const csvPath = path.resolve('data/leetcode_sample.csv');
      await importLeetCodeCsv(csvPath);
    } else {
      console.log(`[Seed] Database already contains ${lcCount} LeetCode questions.`);
    }

    // 4. Company directories
    const compCount = await Company.countDocuments();
    if (compCount === 0) {
      console.log('[Seed] Seeding company directories...');
      await Company.create([
        {
          name: 'Google India',
          normalizedName: normalizeCompanyName('Google India'),
          industry: 'Technology',
          tier: 'Super Dream',
          highestPackage: 55.0,
          averagePackage: 35.0,
          tags: ['MNC', 'Search', 'Cloud', 'Super Dream'],
        },
        {
          name: 'Microsoft',
          normalizedName: normalizeCompanyName('Microsoft'),
          industry: 'Technology',
          tier: 'Super Dream',
          highestPackage: 51.0,
          averagePackage: 30.0,
          tags: ['MNC', 'Product', 'Tier-1'],
        },
        {
          name: 'Amazon India',
          normalizedName: normalizeCompanyName('Amazon India'),
          industry: 'E-Commerce / Cloud',
          tier: 'Super Dream',
          highestPackage: 44.5,
          averagePackage: 28.0,
          tags: ['E-Commerce', 'AWS', 'MNC'],
        },
        {
          name: 'Uber',
          normalizedName: normalizeCompanyName('Uber'),
          industry: 'Transportation / Tech',
          tier: 'Super Dream',
          highestPackage: 38.0,
          averagePackage: 25.0,
          tags: ['MNC', 'Mobility', 'Fintech'],
        },
        {
          name: 'Adobe Systems',
          normalizedName: normalizeCompanyName('Adobe Systems'),
          industry: 'Software & Media',
          tier: 'Dream',
          highestPackage: 42.0,
          averagePackage: 24.0,
          tags: ['Creative Cloud', 'MNC'],
        },
      ]);
    } else {
      console.log(`[Seed] Database already contains ${compCount} company directory records.`);
    }

    console.log('[Seed] Complete database seed finished successfully!');
    await disconnectDB();
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedDatabase();
