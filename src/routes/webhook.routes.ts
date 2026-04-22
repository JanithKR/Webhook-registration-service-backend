import { Router } from 'express';
import { getWebhooks, createWebhook, deleteWebhook } from '../controllers/webhook.controller';
import { trigger } from '../controllers/trigger.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getWebhooks);
router.post('/', createWebhook);
router.delete('/:id', deleteWebhook);
router.post('/:id/trigger', trigger);  // ← new

export default router;