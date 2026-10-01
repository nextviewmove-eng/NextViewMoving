import { body, param } from 'express-validator';
import {
  MOVE_TYPES,
  PROPERTY_TYPES,
  BEDROOM_TYPES,
  ORIGIN_FLOORS,
  ELEVATOR_OPTIONS,
  STAIR_OPTIONS,
  SERVICES,
  LEAD_STATUSES,
} from '../models/Lead.js';

const isNonNegativeNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isValidServices = (values) => Array.isArray(values) && values.every((value) => SERVICES.includes(value));

const ENUM_FIELD_CHECKS = [
  body('moveDetails.moveType').optional().isIn(MOVE_TYPES).withMessage('Invalid moveType'),
  body('moveDetails.propertyType').optional().isIn(PROPERTY_TYPES).withMessage('Invalid propertyType'),
  body('moveDetails.bedrooms').optional().isIn(BEDROOM_TYPES).withMessage('Invalid bedrooms'),
  body('moveDetails.originFloor').optional().isIn(ORIGIN_FLOORS).withMessage('Invalid originFloor'),
  body('moveDetails.elevator').optional().isIn(ELEVATOR_OPTIONS).withMessage('Invalid elevator'),
  body('moveDetails.stairs').optional().isIn(STAIR_OPTIONS).withMessage('Invalid stairs'),
];

const SERVICES_CHECK = body('services')
  .optional()
  .isArray()
  .withMessage('Services must be an array')
  .custom(isValidServices)
  .withMessage('Contains an invalid service');

const QUOTE_CHECKS = [
  body('quote.amount').optional().custom(isNonNegativeNumber).withMessage('Quote amount must be a non-negative number'),
  body('quote.currency').optional().isString().withMessage('Quote currency must be a string'),
  body('quote.notes').optional().trim(),
  body('quote.sentAt').optional().isISO8601().withMessage('Quote sentAt must be a valid date'),
];

export const leadIdValidation = [param('id').isMongoId().withMessage('Invalid lead id')];

export const createLeadValidation = [
  body('customer.fullName').trim().notEmpty().withMessage('Customer full name is required').isLength({ max: 120 }).withMessage('Customer full name is too long'),
  body('customer.phone').trim().notEmpty().withMessage('Customer phone is required'),
  body('customer.email').trim().notEmpty().withMessage('Customer email is required').isEmail().withMessage('Please provide a valid email'),
  body('moveDetails.movingFrom').trim().notEmpty().withMessage('Moving from is required'),
  body('moveDetails.movingTo').trim().notEmpty().withMessage('Moving to is required'),
  body('moveDetails.movingDate').notEmpty().withMessage('Moving date is required').isISO8601().withMessage('Moving date must be a valid date'),
  ...ENUM_FIELD_CHECKS,
  SERVICES_CHECK,
  body('additionalInformation').optional().trim(),
  ...QUOTE_CHECKS,
];

export const updateLeadValidation = [
  body('customer.fullName').optional().trim().notEmpty().withMessage('Customer full name cannot be empty').isLength({ max: 120 }).withMessage('Customer full name is too long'),
  body('customer.phone').optional().trim().notEmpty().withMessage('Customer phone cannot be empty'),
  body('customer.email').optional().trim().notEmpty().withMessage('Customer email cannot be empty').isEmail().withMessage('Please provide a valid email'),
  body('moveDetails.movingFrom').optional().trim().notEmpty().withMessage('Moving from cannot be empty'),
  body('moveDetails.movingTo').optional().trim().notEmpty().withMessage('Moving to cannot be empty'),
  body('moveDetails.movingDate').optional().isISO8601().withMessage('Moving date must be a valid date'),
  ...ENUM_FIELD_CHECKS,
  SERVICES_CHECK,
  body('additionalInformation').optional().trim(),
  body('status').optional().isIn(LEAD_STATUSES).withMessage('Invalid status'),
  ...QUOTE_CHECKS,
];