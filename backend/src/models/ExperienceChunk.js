import mongoose from 'mongoose';

const experienceChunkSchema = new mongoose.Schema(
  {
    experienceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experience',
      required: [true, 'Parent experience reference is required'],
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    totalChunks: {
      type: Number,
      required: true,
    },
    chunkText: {
      type: String,
      required: [true, 'Chunk text content is required'],
    },
    section: {
      type: String,
      default: 'Full Experience',
    },
    embedding: {
      type: [Number],
      required: [true, 'Vector embedding is required'],
      // Dimension corresponds to Gemini text-embedding-004 (typically 768 float dimensions)
    },
    metadata: {
      company: { type: String, required: true },
      companyNormalized: { type: String, required: true, index: true },
      role: { type: String, required: true },
      placementYear: { type: Number, required: true, index: true },
      topics: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
  }
);

experienceChunkSchema.index({ 'metadata.companyNormalized': 1, 'metadata.placementYear': -1 });
experienceChunkSchema.index({ experienceId: 1, chunkIndex: 1 });

export const ExperienceChunk = mongoose.model('ExperienceChunk', experienceChunkSchema);
