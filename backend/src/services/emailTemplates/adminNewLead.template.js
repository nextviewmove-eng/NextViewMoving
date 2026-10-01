import { escapeHtml, formatEnum, formatDate } from './format.js';

const fieldText = (label, value) => `${label}: ${value || '—'}`;

const fieldRow = (label, value) => `
  <tr>
    <td style="padding: 6px 0; color: #555; white-space: nowrap; vertical-align: top;">${label}</td>
    <td style="padding: 6px 0; vertical-align: top;">${value || '—'}</td>
  </tr>`;

export const renderAdminNewLead = (lead) => {
  const { customer } = lead;
  const { moveDetails } = lead;

  const servicesText = (lead.services || []).length
    ? lead.services.map(formatEnum).join(', ')
    : '';

  const subject = `New Lead: ${customer.fullName}`;

  const text = [
    'New lead received',
    '',
    fieldText('Customer name', customer.fullName),
    fieldText('Phone', customer.phone),
    fieldText('Email', customer.email),
    '',
    fieldText('Moving from', moveDetails.movingFrom),
    fieldText('Moving to', moveDetails.movingTo),
    fieldText('Moving date', formatDate(moveDetails.movingDate)),
    fieldText('Move type', formatEnum(moveDetails.moveType)),
    fieldText('Property type', formatEnum(moveDetails.propertyType)),
    fieldText('Bedrooms', formatEnum(moveDetails.bedrooms)),
    fieldText('Services', servicesText),
    fieldText('Additional information', lead.additionalInformation),
    '',
    'Please follow up with this customer to prepare a quote.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Lead</title>
</head>
<body>
  <h2>New moving quote request</h2>
  <table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;">
    <tbody>
      <tr><td colspan="2" style="padding: 8px 0 4px; font-size: 16px; font-weight: bold; border-bottom: 1px solid #eee;">Customer</td></tr>
      ${fieldRow('Name', escapeHtml(customer.fullName))}
      ${fieldRow('Phone', escapeHtml(customer.phone))}
      ${fieldRow('Email', escapeHtml(customer.email))}
      <tr><td colspan="2" style="padding: 8px 0 4px; font-size: 16px; font-weight: bold; border-bottom: 1px solid #eee;">Move details</td></tr>
      ${fieldRow('Moving from', escapeHtml(moveDetails.movingFrom))}
      ${fieldRow('Moving to', escapeHtml(moveDetails.movingTo))}
      ${fieldRow('Moving date', escapeHtml(formatDate(moveDetails.movingDate)))}
      ${fieldRow('Move type', escapeHtml(formatEnum(moveDetails.moveType)))}
      ${fieldRow('Property type', escapeHtml(formatEnum(moveDetails.propertyType)))}
      ${fieldRow('Bedrooms', escapeHtml(formatEnum(moveDetails.bedrooms)))}
      ${fieldRow('Services', escapeHtml(servicesText))}
      ${fieldRow('Additional information', escapeHtml(lead.additionalInformation))}
    </tbody>
  </table>
  <p style="color: #777;">Please follow up with this customer to prepare a quote.</p>
</body>
</html>`;

  return { subject, text, html };
};