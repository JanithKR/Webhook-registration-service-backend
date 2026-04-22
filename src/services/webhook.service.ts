import redisClient from '../config/redis';
import Webhook from '../models/Webhook';

const getCacheKey = (userId: string) => `webhooks:${userId}`;

export const getCachedWebhooks = async (userId: string) => {
  const cached = await redisClient.get(getCacheKey(userId));
  if (cached) return JSON.parse(cached);
  return null;
};

export const setCachedWebhooks = async (userId: string, data: any) => {
  // Cache for 5 minutes
  await redisClient.setEx(getCacheKey(userId), 300, JSON.stringify(data));
};

export const invalidateCache = async (userId: string) => {
  await redisClient.del(getCacheKey(userId));
};

export const getWebhooksFromDB = async (userId: string) => {
  return Webhook.find({ userId }).sort({ createdAt: -1 });
};