import mongoose, { Document, Schema } from 'mongoose';

export interface IDestination {
  type: string;
  label: string;
  description: string;
  icon: string;
  isDefault: boolean;
  removable: boolean;
}

export interface IDestinationConfig extends Document {
  userId: mongoose.Types.ObjectId;
  destinations: IDestination[];
}

const DestinationSchema = new Schema<IDestinationConfig>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    destinations: [
      {
        type: { type: String, required: true },
        label: { type: String, required: true },
        description: { type: String, required: true },
        icon: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
        removable: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IDestinationConfig>(
  'DestinationConfig',
  DestinationSchema
);