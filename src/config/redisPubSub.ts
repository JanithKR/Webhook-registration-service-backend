import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Publisher client — sends messages to channels
export const publisher = createClient({
  url: process.env.REDIS_URL as string,
});

// ✅ Subscriber client — listens to channels
// Must be a SEPARATE client from publisher
export const subscriber = createClient({
  url: process.env.REDIS_URL as string,
});

export const connectPubSub = async (): Promise<void> => {
  await publisher.connect();
  await subscriber.connect();
  console.log('✅ Redis Pub/Sub connected');
};

// Channel names
export const CHANNELS = {
  WEBHOOK_EVENTS: 'webhook:events',
  WEBHOOK_STATUS: 'webhook:status',
  EVENT_TREE: 'event:tree',
};