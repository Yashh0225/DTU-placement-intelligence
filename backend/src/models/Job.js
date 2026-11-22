import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    companyNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['internship', 'full-time', 'internship+fte', 'other'],
      default: 'full-time',
    },
    eligibleBranches: {
      type: [String],
      default: [],
      index: true,
    },
    minCgpa: {
      type: Number,
      default: null,
      index: true,
    },
    class10Percentage: {
      type: Number,
      default: null,
    },
    class12Percentage: {
      type: Number,
      default: null,
    },
    allowedBacklogs: {
      type: Number,
      default: 0,
    },
    batch: {
      type: String,
      default: null,
      index: true,
    },
    stipend: {
      type: String,
      default: null,
    },
    ctc: {
      type: Number,
      default: null,
      index: true, // In LPA (Lakhs per annum)
    },
    ctcBreakup: {
      type: String,
      default: null,
    },
    ppo: {
      type: Boolean,
      default: false,
    },
    location: {
      type: [String],
      default: [],
    },
    applicationDeadline: {
      type: Date,
      default: null,
    },
    announcementDate: {
      type: Date,
      default: Date.now,
    },
    originalMessage: {
      type: String,
      required: [true, 'Original announcement message is required to preserve data provenance'],
    },
    source: {
      channel: { type: String, default: 'WhatsApp' },
      verifiedBy: { type: String, default: 'admin' },
    },
    status: {
      type: String,
      enum: ['draft', 'reviewed', 'published'],
      default: 'published',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for structured queries
jobSchema.index({ companyNormalized: 1, ctc: -1 });
jobSchema.index({ ctc: -1, eligibleBranches: 1 });
jobSchema.index({ companyNormalized: 1, batch: 1 });

export const Job = mongoose.model('Job', jobSchema);
