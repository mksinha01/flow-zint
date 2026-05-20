import { Router } from 'express';
import { createWorkspace, getWorkspace, getUserWorkspaces } from '../controllers/workspace.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireWorkspaceAccess } from '../middlewares/workspace.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createWorkspaceSchema } from '../validators/workspace.validator';

const router = Router();

router.use(authenticate);

router.get('/', getUserWorkspaces);
router.post('/', validate(createWorkspaceSchema), createWorkspace);
router.get('/:workspaceId', requireWorkspaceAccess, getWorkspace);

export default router;
