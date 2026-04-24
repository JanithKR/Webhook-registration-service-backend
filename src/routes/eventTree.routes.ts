import { Router } from 'express';
import { publishEventTreeUpdate, getEventTree } from '../controllers/eventTree.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getEventTree);
router.post('/publish', protect, publishEventTreeUpdate);

export default router;