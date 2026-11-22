import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/errorHandler.js';
import jobRoutes from './routes/jobRoutes.js';
import experienceRoutes from './routes/experienceRoutes.js';
import leetcodeRoutes from './routes/leetcodeRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'DTU Placement Intelligence API',
      timestamp: new Date().toISOString(),
    });
  });

  // Core domain APIs
  app.use('/api/jobs', jobRoutes);
  app.use('/api/experiences', experienceRoutes);
  app.use('/api/leetcode', leetcodeRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/assistant', assistantRoutes);

  // Serve static frontend build if present
  const frontendDistPath = path.resolve('../frontend/dist');
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  // Error handling middleware
  app.use(errorHandler);

  return app;
};
