import mongoose from 'mongoose';

const roundDetailSchema = new mongoose.Schema(
  {
    roundNumber: { type: Number, required: true },
    roundName: { type: String, default: '' },
    roundType: { type: String, default: 'Technical' }, // e.g. OA, Technical, System Design, HR
    topicsCovered: { type: [String], default: [] },
    questions: { type: [String], default: [] },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
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
    placementYear: {
      type: Number,
      required: [true, 'Placement year is required'],
      index: true,
    },
    originalNarrative: {
      type: String,
      required: [true, 'Original interview narrative must be preserved'],
    },
    extractedStructure: {
      roundsCount: { type: Number, default: 0 },
      rounds: { type: [roundDetailSchema], default: [] },
      dsaTopics: { type: [String], default: [] },
      csFundamentals: { type: [String], default: [] },
      projectDiscussion: { type: String, default: '' },
      hrQuestions: { type: [String], default: [] },
      difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', 'Variable'], default: 'Medium' },
      overallVerdict: { type: String, default: 'Selected' },
    },
    submissionType: {
      type: String,
      enum: ['narrative_llm', 'structured_direct'],
      default: 'narrative_llm',
    },
    studentConfirmed: {
      type: Boolean,
      default: true,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'verified', 'flagged'],
      default: 'verified',
      index: true,
    },
    isIndexed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

experienceSchema.index({ companyNormalized: 1, placementYear: -1 });
experienceSchema.index({ 'extractedStructure.dsaTopics': 1 });

export const Experience = mongoose.model('Experience', experienceSchema);
