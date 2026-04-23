import mongoose, { Document, Schema } from 'mongoose';

export type PayloadStyle = 'snapshot' | 'thin';
export type DestinationType =
  | 'webhook_endpoint'
  | 'amazon_eventbridge'
  | 'azure_event_grid';

export interface IWebhook extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  url: string;
  destinationType: DestinationType;
  payloadStyle: PayloadStyle;
  events: string[];  // ✅ No enum — accepts any dot-notation string
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
    // ✅ Dynamic — no enum restriction, unlimited custom events
    events: {
      type: [String],
      default: [],
      validate: {
        validator: (events: string[]) => {
          // Validate dot notation format
          return events.every((e) => /^[a-z0-9]+(\.[a-z0-9_]+)*$/.test(e));
        },
        message: 'Events must be in dot notation format e.g. payment.success',
      },
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