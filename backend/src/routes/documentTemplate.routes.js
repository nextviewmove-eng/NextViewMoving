import { Router } from 'express';
import documentTemplateController from '../controllers/documentTemplate.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  documentTemplateIdValidation,
  createDocumentTemplateValidation,
  updateDocumentTemplateValidation,
} from '../middleware/documentTemplateValidation.middleware.js';

const router = Router();

router.get('/', documentTemplateController.listTemplates);
router.get('/:id', documentTemplateController.getTemplate);
router.post('/', protect, createDocumentTemplateValidation, validate, documentTemplateController.createTemplate);
router.patch('/:id', protect, documentTemplateIdValidation, updateDocumentTemplateValidation, validate, documentTemplateController.updateTemplate);

export default router;
