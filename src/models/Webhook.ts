import mongoose, { Document, Schema } from 'mongoose';

export type PayloadStyle = 'snapshot' | 'thin';
export type DestinationType = 'webhook_endpoint' | 'amazon_eventbridge' | 'azure_event_grid';

export type EventType =
  | 'payment.success'
  | 'payment.failed'
  | 'customer.created'
  | 'customer.deleted'
  | 'order.created'
  | 'order.updated'
  | 'order.cancelled'
  | 'user.created'
  | 'user.deleted'
  | 'balance.available';

export interface IWebhook extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  url: string;
  destinationType: DestinationType;
  payloadStyle: PayloadStyle;
  events: EventType[];
  lastStatus: 'pending' | 'success' | 'failure';
  lastTriggeredAt: Date | null;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    destinationType: {
      type: String,
      enum: ['webhook_endpoint', 'amazon_eventbridge', 'azure_event_grid'],
      default: 'webhook_endpoint',
    },
    payloadStyle: {
      type: String,
      enum: ['snapshot', 'thin'],
      default: 'snapshot',
    },
    events: {
      type: [String],
      enum: [
        'payment.success',
        'payment.failed',
        'customer.created',
        'customer.deleted',
        'order.created',
        'order.updated',
        'order.cancelled',
        'user.created',
        'user.deleted',
        'balance.available',
      ],
      default: [],
    },
    lastStatus: {
      type: String,
      enum: ['pending', 'success', 'failure'],
      default: 'pending',
    },
    lastTriggeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IWebhook>('Webhook', WebhookSchema);