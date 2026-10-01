import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { loginValidation, validate } from '../middleware/validation.middleware.js';

const router = Router();

router.post('/login', loginValidation, validate, authController.login);
router.get('/me', protect, authController.getMe);
router.post('/logout', authController.logout);
router.get('/test', protect, authController.testEndpoint);

export default router;