import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhook extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  url: string;
  lastStatus: 'pending' | 'success' | 'failure';
  lastTriggeredAt: Date | null;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    lastStatus: { type: String, enum: ['pending', 'success', 'failure'], default: 'pending' },
    lastTriggeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IWebhook>('Webhook', WebhookSchema);