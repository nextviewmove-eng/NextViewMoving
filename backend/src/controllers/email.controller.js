import asyncHandler from '../utils/asyncHandler.js';
import { sendCustomerConfirmationEmail, sendAdminNewLeadEmail } from '../services/email.service.js';

const SAMPLE_LEAD = {
  customer: {
    fullName: 'Test Customer',
    phone: '416-000-0000',
    email: 'test.customer@example.com',
  },
  moveDetails: {
    movingFrom: 'Toronto, ON',
    movingTo: 'Ottawa, ON',
    movingDate: '2026-12-01',
    moveType: 'LOCAL',
    propertyType: 'APARTMENT',
    bedrooms: 'TWO',
  },
  services: ['MOVING', 'PACKING'],
  additionalInformation: 'Sample move used for email testing.',
};

const testEmails = asyncHandler(async (_req, res) => {
  const data = {};

  try {
    await sendCustomerConfirmationEmail(SAMPLE_LEAD);
    data.customerConfirmation = {
      success: true,
      to: SAMPLE_LEAD.customer.email,
    };
  } catch (error) {
    data.customerConfirmation = {
      success: false,
      error: error.message,
    };
  }

  try {
    await sendAdminNewLeadEmail(SAMPLE_LEAD);
    data.adminNotification = {
      success: true,
      to: process.env.ADMIN_NOTIFICATION_EMAIL || 'not configured',
    };
  } catch (error) {
    data.adminNotification = {
      success: false,
      error: error.message,
    };
  }

  return res.status(200).json({
    success: true,
    message: 'Email test completed',
    data,
  });
});

export default { testEmails };