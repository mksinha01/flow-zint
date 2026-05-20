import { Router } from 'express';
import {
  listLeads,
  createLead,
  getLead,
  updateLead,
  deleteLead,
  bulkImportLeads,
} from '../controllers/leads.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireWorkspaceAccess } from '../middlewares/workspace.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createLeadSchema, updateLeadSchema, leadsQuerySchema } from '../validators/lead.validator';

const router = Router();

router.use(authenticate);
router.use(requireWorkspaceAccess);

router.get('/', validate(leadsQuerySchema), listLeads);
router.post('/', validate(createLeadSchema), createLead);
router.post('/bulk', bulkImportLeads);
router.get('/:leadId', getLead);
router.put('/:leadId', validate(updateLeadSchema), updateLead);
router.delete('/:leadId', deleteLead);

export default router;
