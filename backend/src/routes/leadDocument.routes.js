import express, { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  leadDocumentsListParamsValidation,
  leadDocumentParamsValidation,
  updateLeadDocumentStatusValidation,
  signDocumentValidation,
} from '../middleware/leadDocumentValidation.middleware.js';
import {
  initializeDocuments,
  listDocuments,
  getDocument,
  updateStatus,
  getPreview,
  generateDocument,
  getDocumentFile,
  signDocument,
} from '../controllers/leadDocument.controller.js';

const router = Router();

router.use(protect);

router.post(
  '/:leadId/documents/initialize',
  leadDocumentsListParamsValidation,
  validate,
  initializeDocuments
);
router.get(
  '/:leadId/documents/:documentId/preview',
  leadDocumentParamsValidation,
  validate,
  getPreview
);
router.post(
  '/:leadId/documents/:documentId/generate',
  leadDocumentParamsValidation,
  validate,
  generateDocument
);
router.get(
  '/:leadId/documents/:documentId/file',
  leadDocumentParamsValidation,
  validate,
  getDocumentFile
);
router.post(
  '/:leadId/documents/:documentId/sign',
  express.json({ limit: '5mb' }),
  leadDocumentParamsValidation,
  signDocumentValidation,
  validate,
  signDocument
);
router.get('/:leadId/documents', leadDocumentsListParamsValidation, validate, listDocuments);
router.get(
  '/:leadId/documents/:documentId',
  leadDocumentParamsValidation,
  validate,
  getDocument
);
router.patch(
  '/:leadId/documents/:documentId/status',
  leadDocumentParamsValidation,
  updateLeadDocumentStatusValidation,
  validate,
  updateStatus
);

export default router;
