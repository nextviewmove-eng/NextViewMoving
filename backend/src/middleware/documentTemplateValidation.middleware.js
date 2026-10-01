import { body, param } from 'express-validator';

const KEY_PATTERN = /^[A-Z0-9_]+$/;

export const documentTemplateIdValidation = [param('id').isMongoId().withMessage('Invalid document template id')];

export const createDocumentTemplateValidation = [
  body('key')
    .trim()
    .customSanitizer((value) => String(value).toUpperCase())
    .notEmpty()
    .withMessage('Template key is required')
    .isLength({ max: 50 })
    .withMessage('Template key is too long')
    .matches(KEY_PATTERN)
    .withMessage('Template key can only contain uppercase letters, numbers, and underscores'),
  body('name').trim().notEmpty().withMessage('Template name is required').isLength({ max: 120 }).withMessage('Template name is too long'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Template description is too long'),
  body('content').notEmpty().withMessage('Template content is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const updateDocumentTemplateValidation = [
  body('key')
    .optional()
    .trim()
    .customSanitizer((value) => String(value).toUpperCase())
    .notEmpty()
    .withMessage('Template key cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Template key is too long')
    .matches(KEY_PATTERN)
    .withMessage('Template key can only contain uppercase letters, numbers, and underscores'),
  body('name').optional().trim().notEmpty().withMessage('Template name cannot be empty').isLength({ max: 120 }).withMessage('Template name is too long'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Template description is too long'),
  body('content').optional().notEmpty().withMessage('Template content cannot be empty'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];