import { Router } from 'express';
import {
  listCalls,
  dispatchCall,
  getCall,
  handleWebhook,
} from '../controllers/calls.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireWorkspaceAccess } from '../middlewares/workspace.middleware';
import { validate } from '../middlewares/validate.middleware';
import { dispatchCallSchema } from '../validators/lead.validator';

const router = Router();

// Webhook — no auth (LiveKit calls this directly)
router.post('/webhook', handleWebhook);

router.use(authenticate);
router.use(requireWorkspaceAccess);

router.get('/', listCalls);
router.post('/dispatch', validate(dispatchCallSchema), dispatchCall);
router.get('/:callId', getCall);

export default router;
