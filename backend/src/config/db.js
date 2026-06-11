import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_wristband';
  
  // Disable command buffering so queries fail quickly if there's no connection
  // instead of hanging indefinitely.
  mongoose.set('bufferCommands', false);

  try {
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000 // 3 seconds timeout
    });
    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`\n[WARNING] MongoDB connection failed: ${error.message}`);
    console.warn('The server will start, but it will run in IN-MEMORY / SIMULATION mode.');
    console.warn('All changes will be lost when the server restarts.\n');
    isConnected = false;
  }
}

export function getDBStatus() {
  return isConnected;
}
