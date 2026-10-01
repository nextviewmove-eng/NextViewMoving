import { body, param } from 'express-validator';

export const leadDocumentsListParamsValidation = [
  param('leadId').isMongoId().withMessage('Invalid lead id'),
];

export const leadDocumentParamsValidation = [
  param('leadId').isMongoId().withMessage('Invalid lead id'),
  param('documentId').isMongoId().withMessage('Invalid lead document id'),
];

export const updateLeadDocumentStatusValidation = [
  body('status').isIn(['PENDING', 'COMPLETED']).withMessage('Status must be PENDING or COMPLETED'),
  body('completedAt').optional({ nullable: true }).isISO8601().withMessage('completedAt must be a valid date'),
];

export const signDocumentValidation = [
  body('signature')
    .trim()
    .notEmpty()
    .withMessage('Signature is required')
    .custom((value) => {
      const prefix = 'data:image/png;base64,';
      return (
        typeof value === 'string' &&
        value.startsWith(prefix) &&
        value.length > prefix.length
      );
    })
    .withMessage('Unsupported signature format. Expected a PNG data URL'),
];
