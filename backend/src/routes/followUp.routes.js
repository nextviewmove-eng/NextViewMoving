import { Router } from 'express';
import followUpController from '../controllers/followUp.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  followUpLeadIdValidation,
  followUpIdValidation,
  createFollowUpValidation,
  updateFollowUpValidation,
} from '../middleware/followUpValidation.middleware.js';

const router = Router();

router.use(protect);

router.post('/:leadId/follow-ups', followUpLeadIdValidation, createFollowUpValidation, validate, followUpController.createFollowUp);
router.get('/:leadId/follow-ups', followUpLeadIdValidation, validate, followUpController.listFollowUps);
router.patch('/:leadId/follow-ups/:followUpId', followUpIdValidation, updateFollowUpValidation, validate, followUpController.updateFollowUp);
router.delete('/:leadId/follow-ups/:followUpId', followUpIdValidation, validate, followUpController.deleteFollowUp);

export default router;