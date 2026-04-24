import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { connectPubSub, subscriber, CHANNELS } from './config/redisPubSub';

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  ws.on('close', () => console.log('🔌 WebSocket client disconnected'));
});

export { wss };

// ✅ Broadcast helper
const broadcastToAll = (message: object) => {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

const start = async () => {
  await connectDB();
  await connectRedis();
  await connectPubSub();

  // ✅ Subscribe to webhook events channel
  await subscriber.subscribe(CHANNELS.WEBHOOK_EVENTS, (message) => {
    try {
      const parsed = JSON.parse(message);
      console.log('📨 Redis Pub/Sub received:', parsed);
      // Broadcast to all WebSocket clients
      broadcastToAll(parsed);
    } catch (err) {
      console.error('Failed to parse pub/sub message:', err);
    }
  });

  // ✅ Subscribe to webhook status channel
  await subscriber.subscribe(CHANNELS.WEBHOOK_STATUS, (message) => {
    try {
      const parsed = JSON.parse(message);
      broadcastToAll(parsed);
    } catch (err) {
      console.error('Failed to parse pub/sub message:', err);
    }
  });

  // ✅ Subscribe to event tree updates channel
  await subscriber.subscribe(CHANNELS.EVENT_TREE, (message) => {
    try {
      const parsed = JSON.parse(message);
      broadcastToAll(parsed);
    } catch (err) {
      console.error('Failed to parse pub/sub message:', err);
    }
  });

  console.log('📡 Subscribed to Redis channels');

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

start();