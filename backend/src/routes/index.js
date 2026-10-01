import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import leadRoutes from './lead.routes.js';
import noteRoutes from './note.routes.js';
import followUpRoutes from './followUp.routes.js';
import followUpGlobalRoutes from './followUpGlobal.routes.js';
import emailRoutes from './email.routes.js';
import documentTemplateRoutes from './documentTemplate.routes.js';
import leadDocumentRoutes from './leadDocument.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/leads', leadRoutes);
router.use('/leads', noteRoutes);
router.use('/leads', followUpRoutes);
router.use('/follow-ups', followUpGlobalRoutes);
router.use('/email', emailRoutes);
router.use('/document-templates', documentTemplateRoutes);
router.use('/leads', leadDocumentRoutes);

export default router;
