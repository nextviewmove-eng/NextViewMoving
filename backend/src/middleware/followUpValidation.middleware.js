import { body, param, query } from 'express-validator';

export const followUpLeadIdValidation = [param('leadId').isMongoId().withMessage('Invalid lead id')];

export const followUpIdValidation = [
  param('leadId').isMongoId().withMessage('Invalid lead id'),
  param('followUpId').isMongoId().withMessage('Invalid follow-up id'),
];

export const createFollowUpValidation = [
  body('dueAt')
    .notEmpty()
    .withMessage('Follow-up due date is required')
    .isISO8601()
    .withMessage('Follow-up due date must be a valid date'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Follow-up note is too long'),
];

export const updateFollowUpValidation = [
  body('dueAt').optional().isISO8601().withMessage('Follow-up due date must be a valid date'),
  body('note').optional().trim().isLength({ max: 5000 }).withMessage('Follow-up note is too long'),
  body('completed').optional().isBoolean().withMessage('completed must be a boolean'),
];

export const followUpStatusQueryValidation = [
  query('status').optional().isIn(['pending', 'completed']).withMessage("status must be 'pending' or 'completed'"),
];