import { z } from 'zod';

export const jobPlanSchema = z.object({
  enabled: z.boolean(),
  company: z.string().nullable().optional(),
  minCtc: z.number().nullable().optional(),
  maxCtc: z.number().nullable().optional(),
  branch: z.string().nullable().optional(),
  batch: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  type: z.enum(['internship', 'full-time', 'internship+fte', 'other']).nullable().optional(),
  minCgpa: z.number().nullable().optional(),
  limit: z.number().min(0).max(50).default(10),
});

export const experiencePlanSchema = z.object({
  enabled: z.boolean(),
  queryText: z.string().optional().default(''),
  company: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  limit: z.number().min(0).max(20).default(5),
});

export const leetcodePlanSchema = z.object({
  enabled: z.boolean(),
  company: z.string().nullable().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).nullable().optional(),
  topics: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  limit: z.number().min(0).max(30).default(15),
});

export const retrievalPlanSchema = z.object({
  userQuery: z.string().min(1),
  intentSummary: z.string(),
  sources: z.array(z.enum(['jobs', 'experiences', 'leetcode'])).min(1),
  plan: z.object({
    jobs: jobPlanSchema.optional(),
    experiences: experiencePlanSchema.optional(),
    leetcode: leetcodePlanSchema.optional(),
  }),
});
