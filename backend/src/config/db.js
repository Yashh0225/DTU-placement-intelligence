import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let memoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dtu_placement_intelligence';

  try {
    // Attempt standard connection to specified URI (e.g., MongoDB Atlas or local daemon) with short timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] Connected to MongoDB at ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (primaryErr) {
    console.warn(`[Database] Direct connection to ${uri} failed: ${primaryErr.message}`);

    // If running in development or test and connection failed, use MongoMemoryServer to guarantee immediate local reliability
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[Database] Initializing fallback in-memory MongoDB server for development/testing...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const fallbackUri = memoryServer.getUri();
        await mongoose.connect(fallbackUri);
        console.log(`[Database] Successfully connected to in-memory MongoDB at ${fallbackUri}`);
        return mongoose.connection;
      } catch (fallbackErr) {
        console.error('[Database] Failed to initialize in-memory MongoDB fallback:', fallbackErr.message);
        throw fallbackErr;
      }
    } else {
      throw primaryErr;
    }
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};
