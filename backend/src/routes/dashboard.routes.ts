import { Router } from 'express';
import { getDashboardStats, getDashboardCharts } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireWorkspaceAccess } from '../middlewares/workspace.middleware';

const router = Router();

router.use(authenticate);
router.use(requireWorkspaceAccess);

router.get('/stats', getDashboardStats);
router.get('/charts', getDashboardCharts);

export default router;
