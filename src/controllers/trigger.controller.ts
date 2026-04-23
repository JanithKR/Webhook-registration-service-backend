// backend/src/controllers/trigger.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { triggerWebhook } from '../services/trigger.service'; // Fixed import path

export const trigger = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Fix: Ensure id is a string, not string[]
    const id = req.params.id as string; // Type assertion
    // OR: const id = String(req.params.id);
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!id) {
      res.status(400).json({ message: 'Webhook ID is required' });
      return;
    }

    await triggerWebhook(id, userId);

    res.status(200).json({ 
      success: true,
      message: 'Webhook triggered successfully' 
    });
  } catch (error: any) {
    if (error.message === 'Webhook not found') {
      res.status(404).json({ 
        success: false,
        message: 'Webhook not found' 
      });
    } else {
      console.error('Trigger error:', error);
      res.status(502).json({ 
        success: false,
        message: `Trigger failed: ${error.message}` 
      });
    }
  }
};