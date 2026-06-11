import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDBStatus } from './config/db.js';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend interface communication
app.use(cors({
  origin: '*', // In production, replace with specific domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Socket.io initialization for real-time tracking streams
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let ioInstance = null;

io.on('connection', (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`WebSocket client disconnected: ${socket.id}`);
  });
});

ioInstance = io;

// Export function so controllers can broadcast events easily
export function getIo() {
  return ioInstance;
}

// Default API welcome landing
app.get('/', (req, res) => {
  res.json({
    message: 'AuraGuard IoT API Server is online.',
    consoleUrl: 'http://localhost:5173',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// Health Check and Status check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    database: getDBStatus() ? 'connected' : 'in-memory simulation',
    timestamp: new Date()
  });
});

// Mount API routes
app.use('/api', apiRouter);

// Database connection & Server Startup
const PORT = process.env.PORT || 5001;

async function startServer() {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`   SMART WRISTBAND IoT SERVER RUNNING ON PORT ${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   API Endpoint: http://localhost:${PORT}/api`);
    console.log(`==================================================`);
  });
}

startServer();
