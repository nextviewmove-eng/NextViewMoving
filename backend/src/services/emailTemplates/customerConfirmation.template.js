import { escapeHtml } from './format.js';

export const renderCustomerConfirmation = (lead) => {
  const firstName = (lead.customer.fullName || '').trim().split(/\s+/)[0] || 'there';
  const safeName = escapeHtml(firstName);

  const subject = 'Quote Request Received — Let\'s Get Moving';

  const text = [
    `Hi ${firstName},`,
    '',
    'Thank you for requesting a moving quote with Let\'s Get Moving.',
    'We have received your request. Our team will contact you within 24 hours to discuss the details of your move.',
    '',
    'No payment is needed at this stage and nothing has been committed.',
    '',
    'If you have any questions in the meantime, just reply to this email.',
    '',
    'Best regards,',
    'The Let\'s Get Moving Team',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Quote Request Received</title>
</head>
<body>
  <h2>We received your quote request</h2>
  <p>Hi ${safeName},</p>
  <p>Thank you for requesting a moving quote with <strong>Let's Get Moving</strong>.</p>
  <p>We have received your request. Our team will contact you <strong>within 24 hours</strong> to discuss the details of your move.</p>
  <p>No payment is needed at this stage and nothing has been committed.</p>
  <p>If you have any questions in the meantime, just reply to this email.</p>
  <p>Best regards,<br>The Let's Get Moving Team</p>
</body>
</html>`;

  return { subject, text, html };
};