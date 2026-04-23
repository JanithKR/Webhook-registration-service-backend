import axios from 'axios';
import { wss } from '../index';
import { WebSocket } from 'ws';
import Webhook from '../models/Webhook';
import redisClient from '../config/redis';
import { invalidateCache } from './webhook.service';

const broadcast = (payload: object) => {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Build payload based on style
const buildPayload = (webhook: any, style: 'snapshot' | 'thin', event: string) => {
  if (style === 'thin') {
    // ✅ Thin — minimal payload, just IDs and event type
    return {
      event,
      webhookId: webhook._id,
      triggeredAt: new Date(),
    };
  }

  // ✅ Snapshot — full payload with all data
  return {
    event,
    webhookId: webhook._id,
    name: webhook.name,
    url: webhook.url,
    destinationType: webhook.destinationType,
    payloadStyle: webhook.payloadStyle,
    events: webhook.events,
    triggeredAt: new Date(),
    data: {
      message: `Event ${event} was triggered`,
      timestamp: Date.now(),
    },
  };
};

export const triggerWebhook = async (
  webhookId: string,
  userId: string,
  event?: string
): Promise<void> => {
  const webhook = await Webhook.findOne({ _id: webhookId, userId });
  if (!webhook) throw new Error('Webhook not found');

  // Use first registered event or provided event
  const triggerEvent = event || webhook.events[0] || 'manual.trigger';

  broadcast({
    type: 'WEBHOOK_STATUS',
    webhookId,
    status: 'sending',
    message: `Triggering ${webhook.name} [${triggerEvent}]...`,
  });

  try {
    const payload = buildPayload(webhook, webhook.payloadStyle, triggerEvent);

    await axios.post(webhook.url, payload, { timeout: 10000 });

    webhook.lastStatus = 'success';
    webhook.lastTriggeredAt = new Date();
    await webhook.save();

    await redisClient.setEx(
      `webhook:status:${webhookId}`,
      3600,
      JSON.stringify({ status: 'success', triggeredAt: new Date() })
    );

    await invalidateCache(userId);

    broadcast({
      type: 'WEBHOOK_STATUS',
      webhookId,
      status: 'success',
      message: `${webhook.name} delivered successfully! [${triggerEvent}]`,
    });
  } catch (error: any) {
    webhook.lastStatus = 'failure';
    webhook.lastTriggeredAt = new Date();
    await webhook.save();

    await redisClient.setEx(
      `webhook:status:${webhookId}`,
      3600,
      JSON.stringify({ status: 'failure', triggeredAt: new Date() })
    );

    await invalidateCache(userId);

    broadcast({
      type: 'WEBHOOK_STATUS',
      webhookId,
      status: 'failure',
      message: `${webhook.name} failed: ${error.message}`,
    });

    throw new Error(error.message);
  }
};