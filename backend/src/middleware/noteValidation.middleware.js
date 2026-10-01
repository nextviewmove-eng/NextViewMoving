import { body, param } from 'express-validator';

export const noteLeadIdValidation = [param('leadId').isMongoId().withMessage('Invalid lead id')];

export const noteIdValidation = [
  param('leadId').isMongoId().withMessage('Invalid lead id'),
  param('noteId').isMongoId().withMessage('Invalid note id'),
];

export const createNoteValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Note text is required')
    .isLength({ max: 5000 })
    .withMessage('Note text is too long'),
];

export const updateNoteValidation = [
  body('text')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Note text cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Note text is too long'),
];