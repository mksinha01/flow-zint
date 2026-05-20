import { Router } from 'express';
import {
  generateAgent,
  listAgentConfigs,
  getAgentConfig,
  getActiveConfig,
  activateConfig,
} from '../controllers/agent.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireWorkspaceAccess } from '../middlewares/workspace.middleware';

const router = Router();

router.use(authenticate);
router.use(requireWorkspaceAccess);

router.post('/generate', generateAgent);
router.get('/active', getActiveConfig);
router.get('/configs', listAgentConfigs);
router.get('/configs/:configId', getAgentConfig);
router.post('/configs/:configId/activate', activateConfig);

export default router;
