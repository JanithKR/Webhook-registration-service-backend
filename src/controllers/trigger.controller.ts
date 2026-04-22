import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { triggerWebhook } from '../services/trigger.service';

export const trigger = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await triggerWebhook(id, userId);

    res.json({ message: 'Webhook triggered successfully' });
  } catch (error: any) {
    if (error.message === 'Webhook not found') {
      res.status(404).json({ message: 'Webhook not found' });
      return;
    }
    res.status(502).json({ message: `Trigger failed: ${error.message}` });
  }
};