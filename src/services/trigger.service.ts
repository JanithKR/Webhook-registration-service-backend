import axios from 'axios';
import { wss } from '../index';
import { WebSocket } from 'ws';
import Webhook from '../models/Webhook';
import redisClient from '../config/redis';
import { publisher, CHANNELS } from '../config/redisPubSub';
import { invalidateCache } from './webhook.service';

// ✅ Now publishes to Redis instead of direct WebSocket
const publishEvent = async (payload: object) => {
  await publisher.publish(
    CHANNELS.WEBHOOK_STATUS,
    JSON.stringify(payload)
  );
};

const buildPayload = (webhook: any, style: 'snapshot' | 'thin', event: string) => {
  if (style === 'thin') {
    return {
      event,
      webhookId: webhook._id,
      triggeredAt: new Date(),
    };
  }
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

  const triggerEvent = event || webhook.events[0] || 'manual.trigger';

  // ✅ Publish sending status via Redis
  await publishEvent({
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

    // ✅ Publish success via Redis
    await publishEvent({
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

    // ✅ Publish failure via Redis
    await publishEvent({
      type: 'WEBHOOK_STATUS',
      webhookId,
      status: 'failure',
      message: `${webhook.name} failed: ${error.message}`,
    });

    throw new Error(error.message);
  }
};