import axios from 'axios';
import { wss } from '../index';
import { WebSocket } from 'ws';
import Webhook from '../models/Webhook';
import redisClient from '../config/redis';
import { invalidateCache } from './webhook.service';

const broadcast = (userId: string, payload: object) => {
  const message = JSON.stringify(payload);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

export const triggerWebhook = async (webhookId: string, userId: string): Promise<void> => {
  const webhook = await Webhook.findOne({ _id: webhookId, userId });

  if (!webhook) throw new Error('Webhook not found');

  // Notify: sending
  broadcast(userId, {
    type: 'WEBHOOK_STATUS',
    webhookId,
    status: 'sending',
    message: `Triggering ${webhook.name}...`,
  });

  try {
    await axios.post(
      webhook.url,
      { triggeredAt: new Date(), webhookId, name: webhook.name },
      { timeout: 10000 }
    );

    // Update DB
    webhook.lastStatus = 'success';
    webhook.lastTriggeredAt = new Date();
    await webhook.save();

    // Cache last delivery status in Redis
    await redisClient.setEx(
      `webhook:status:${webhookId}`,
      3600,
      JSON.stringify({ status: 'success', triggeredAt: new Date() })
    );

    // Invalidate webhook list cache
    await invalidateCache(userId);

    // Notify: success
    broadcast(userId, {
      type: 'WEBHOOK_STATUS',
      webhookId,
      status: 'success',
      message: `${webhook.name} delivered successfully!`,
    });
  } catch (error: any) {
    // Update DB
    webhook.lastStatus = 'failure';
    webhook.lastTriggeredAt = new Date();
    await webhook.save();

    // Cache failure status
    await redisClient.setEx(
      `webhook:status:${webhookId}`,
      3600,
      JSON.stringify({ status: 'failure', triggeredAt: new Date() })
    );

    await invalidateCache(userId);

    // Notify: failure
    broadcast(userId, {
      type: 'WEBHOOK_STATUS',
      webhookId,
      status: 'failure',
      message: `${webhook.name} failed: ${error.message}`,
    });

    throw new Error(error.message);
  }
};