import { Router } from 'express';
import leadController from '../controllers/lead.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  leadIdValidation,
  createLeadValidation,
  updateLeadValidation,
} from '../middleware/leadValidation.middleware.js';

const router = Router();

router.post('/', createLeadValidation, validate, leadController.createLead);
router.get('/', protect, leadController.listLeads);
router.get('/:id', protect, leadIdValidation, validate, leadController.getLead);
router.patch('/:id', protect, leadIdValidation, updateLeadValidation, validate, leadController.updateLead);
router.delete('/:id', protect, leadIdValidation, validate, leadController.deleteLead);

export default router;