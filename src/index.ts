import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// WebSocket server attached to same HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
});

// Export wss so other modules can broadcast events
export { wss };

const start = async () => {
  await connectDB();
  await connectRedis();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

start();