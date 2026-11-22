import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      unique: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    industry: {
      type: String,
      default: 'Technology',
    },
    tier: {
      type: String,
      enum: ['Super Dream', 'Dream', 'Core', 'Mass / Normal', 'Other'],
      default: 'Dream',
    },
    totalHires: {
      type: Number,
      default: 0,
    },
    highestPackage: {
      type: Number,
      default: null, // in LPA
    },
    averagePackage: {
      type: Number,
      default: null, // in LPA
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Company = mongoose.model('Company', companySchema);
