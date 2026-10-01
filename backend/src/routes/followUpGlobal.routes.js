import { Router } from 'express';
import followUpController from '../controllers/followUp.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { followUpStatusQueryValidation } from '../middleware/followUpValidation.middleware.js';

const router = Router();

router.get('/', protect, followUpStatusQueryValidation, validate, followUpController.listAllFollowUps);

export default router;