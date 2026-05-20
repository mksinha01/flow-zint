import { Router } from 'express';
import {
  triggerLearning,
  listInsights,
  getLearningHistory,
} from '../controllers/learning.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireWorkspaceAccess } from '../middlewares/workspace.middleware';

const router = Router();

router.use(authenticate);
router.use(requireWorkspaceAccess);

router.post('/run', triggerLearning);
router.get('/insights', listInsights);
router.get('/history', getLearningHistory);

export default router;
