import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Webhook from '../models/Webhook';
import {
  getCachedWebhooks,
  setCachedWebhooks,
  invalidateCache,
  getWebhooksFromDB,
} from '../services/webhook.service';

// GET /api/webhooks
export const getWebhooks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Try cache first
    const cached = await getCachedWebhooks(userId);
    if (cached) {
      res.json({ source: 'cache', webhooks: cached });
      return;
    }

    // Fall back to DB
    const webhooks = await getWebhooksFromDB(userId);
    await setCachedWebhooks(userId, webhooks);

    res.json({ source: 'db', webhooks });
  } catch (error) {
    console.error('getWebhooks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/webhooks
export const createWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, url } = req.body;
    const userId = req.userId!;

    if (!name || !url) {
      res.status(400).json({ message: 'Name and URL are required' });
      return;
    }

    const webhook = await Webhook.create({ userId, name, url });

    // Invalidate cache so next GET fetches fresh data
    await invalidateCache(userId);

    res.status(201).json({ webhook });
  } catch (error) {
    console.error('createWebhook error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/webhooks/:id
export const deleteWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const webhook = await Webhook.findOneAndDelete({ _id: id, userId });

    if (!webhook) {
      res.status(404).json({ message: 'Webhook not found' });
      return;
    }

    await invalidateCache(userId);

    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    console.error('deleteWebhook error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};