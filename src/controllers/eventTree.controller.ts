import { Request, Response } from 'express';
import { publisher, CHANNELS } from '../config/redisPubSub';
import redisClient from '../config/redis';
import { AuthRequest } from '../middleware/auth.middleware';

const EVENT_TREE_CACHE_KEY = 'event:tree:global';

// ✅ Publish event tree update to all clients
export const publishEventTreeUpdate = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { tree } = req.body;

    if (!tree) {
      res.status(400).json({ message: 'Event tree is required' });
      return;
    }

    // ✅ Cache the latest tree in Redis
    await redisClient.setEx(
      EVENT_TREE_CACHE_KEY,
      3600,
      JSON.stringify(tree)
    );

    // ✅ Publish to Redis channel — all subscribers get it
    await publisher.publish(
      CHANNELS.EVENT_TREE,
      JSON.stringify({
        type: 'EVENT_TREE_UPDATE',
        tree,
        updatedBy: req.userId,
        updatedAt: new Date(),
      })
    );

    res.json({ message: 'Event tree updated and published' });
  } catch (error) {
    console.error('publishEventTreeUpdate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get latest cached event tree
export const getEventTree = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const cached = await redisClient.get(EVENT_TREE_CACHE_KEY);
    if (cached) {
      res.json({ source: 'cache', tree: JSON.parse(cached) });
      return;
    }
    res.json({ source: 'default', tree: null });
  } catch (error) {
    console.error('getEventTree error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};