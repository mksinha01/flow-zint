import { Router } from 'express';
import multer from 'multer';
import {
  upsertBusinessContext,
  getBusinessContext,
  uploadDocument,
  listDocuments,
  deleteDocument,
} from '../controllers/business.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireWorkspaceAccess } from '../middlewares/workspace.middleware';
import { validate } from '../middlewares/validate.middleware';
import { businessContextSchema } from '../validators/business.validator';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

router.use(authenticate);
router.use(requireWorkspaceAccess);

router.get('/context', getBusinessContext);
router.post('/context', validate(businessContextSchema), upsertBusinessContext);
router.get('/documents', listDocuments);
router.post('/documents', upload.single('file'), uploadDocument);
router.delete('/documents/:documentId', deleteDocument);

export default router;
