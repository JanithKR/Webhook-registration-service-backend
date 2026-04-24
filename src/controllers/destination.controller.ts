import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import DestinationConfig from '../models/DestinationConfig';
import redisClient from '../config/redis';
import { publisher, CHANNELS } from '../config/redisPubSub';

const getCacheKey = (userId: string) => `destinations:${userId}`;

const DEFAULT_DESTINATION = {
  type: 'webhook_endpoint',
  label: 'Webhook endpoint',
  description: 'Send events to a hosted endpoint.',
  icon: '🔗',
  isDefault: true,
  removable: false,
};

// ✅ GET — load destinations (cache → DB → default)
export const getDestinations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;

    // Check Redis cache first
    const cached = await redisClient.get(getCacheKey(userId));
    if (cached) {
      res.json({ source: 'cache', destinations: JSON.parse(cached) });
      return;
    }

    // Check MongoDB
    let config = await DestinationConfig.findOne({ userId });

    if (!config) {
      // ✅ First time — create with default only
      config = await DestinationConfig.create({
        userId,
        destinations: [DEFAULT_DESTINATION],
      });
    }

    // Cache for 1 hour
    await redisClient.setEx(
      getCacheKey(userId),
      3600,
      JSON.stringify(config.destinations)
    );

    res.json({ source: 'db', destinations: config.destinations });
  } catch (error) {
    console.error('getDestinations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ POST — add new destination
export const addDestination = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { type, label, description, icon } = req.body;

    if (!type || !label || !description || !icon) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    let config = await DestinationConfig.findOne({ userId });

    if (!config) {
      config = await DestinationConfig.create({
        userId,
        destinations: [DEFAULT_DESTINATION],
      });
    }

    // Check duplicate
    const exists = config.destinations.find((d) => d.type === type);
    if (exists) {
      res.status(409).json({ message: 'Destination type already exists' });
      return;
    }

    const newDestination = {
      type,
      label,
      description,
      icon,
      isDefault: false,
      removable: true,
    };

    config.destinations.push(newDestination);
    await config.save();

    // Invalidate cache
    await redisClient.del(getCacheKey(userId));

    // ✅ Publish update via Redis Pub/Sub
    await publisher.publish(
      CHANNELS.WEBHOOK_EVENTS,
      JSON.stringify({
        type: 'DESTINATION_UPDATE',
        destinations: config.destinations,
        updatedBy: userId,
        updatedAt: new Date(),
      })
    );

    res.status(201).json({
      message: 'Destination added',
      destinations: config.destinations,
    });
  } catch (error) {
    console.error('addDestination error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ DELETE — remove a destination
export const removeDestination = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { type } = req.params;

    const config = await DestinationConfig.findOne({ userId });
    if (!config) {
      res.status(404).json({ message: 'No destinations found' });
      return;
    }

    const destination = config.destinations.find((d) => d.type === type);
    if (!destination) {
      res.status(404).json({ message: 'Destination not found' });
      return;
    }

    if (!destination.removable) {
      res.status(403).json({ message: 'Default destination cannot be removed' });
      return;
    }

    config.destinations = config.destinations.filter((d) => d.type !== type);
    await config.save();

    // Invalidate cache
    await redisClient.del(getCacheKey(userId));

    // ✅ Publish update
    await publisher.publish(
      CHANNELS.WEBHOOK_EVENTS,
      JSON.stringify({
        type: 'DESTINATION_UPDATE',
        destinations: config.destinations,
        updatedBy: userId,
        updatedAt: new Date(),
      })
    );

    res.json({
      message: 'Destination removed',
      destinations: config.destinations,
    });
  } catch (error) {
    console.error('removeDestination error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};