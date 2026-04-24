import { Router } from 'express';
import {
  getDestinations,
  addDestination,
  removeDestination,
} from '../controllers/destination.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getDestinations);
router.post('/', addDestination);
router.delete('/:type', removeDestination);

export default router;