import { Router } from 'express';
import emailController from '../controllers/email.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/test', protect, emailController.testEmails);

export default router;