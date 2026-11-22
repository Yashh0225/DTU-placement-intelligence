import mongoose from 'mongoose';

const leetCodeQuestionSchema = new mongoose.Schema(
  {
    problemId: {
      type: Number,
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
    },
    titleSlug: {
      type: String,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    companyNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    acceptanceRate: {
      type: String,
      default: '',
    },
    frequency: {
      type: Number,
      default: 0,
      index: true,
    },
    url: {
      type: String,
      default: '',
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    sourceDataset: {
      type: String,
      default: 'Yashh0225/leetcode-company-wise-problems',
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to support repeatable, idempotent imports without duplicate records
leetCodeQuestionSchema.index({ companyNormalized: 1, title: 1 }, { unique: true });
leetCodeQuestionSchema.index({ companyNormalized: 1, difficulty: 1, frequency: -1 });

export const LeetCodeQuestion = mongoose.model('LeetCodeQuestion', leetCodeQuestionSchema);
