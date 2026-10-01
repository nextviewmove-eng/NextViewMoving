import nodemailer from 'nodemailer';
import { renderCustomerConfirmation } from './emailTemplates/customerConfirmation.template.js';
import { renderAdminNewLead } from './emailTemplates/adminNewLead.template.js';

const getSmtpConfig = () => {
  const port = Number(process.env.SMTP_PORT) || 587;
  return {
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  };
};

const assertConfig = () => {
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP_HOST is not configured');
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is not configured');
  }
};

const sendMail = async ({ to, subject, text, html }) => {
  assertConfig();

  const transporter = nodemailer.createTransport(getSmtpConfig());
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  return info;
};

export const sendCustomerConfirmationEmail = async (lead) => {
  if (!lead?.customer?.email) {
    throw new Error('Customer email is missing');
  }

  const { subject, text, html } = renderCustomerConfirmation(lead);
  return sendMail({
    to: lead.customer.email,
    subject,
    text,
    html,
  });
};

export const sendAdminNewLeadEmail = async (lead) => {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!to) {
    throw new Error('ADMIN_NOTIFICATION_EMAIL is not configured');
  }

  const { subject, text, html } = renderAdminNewLead(lead);
  return sendMail({
    to,
    subject,
    text,
    html,
  });
};

export const notifyNewLead = async (lead) => {
  try {
    const info = await sendCustomerConfirmationEmail(lead);
    console.log(`[email] Customer confirmation sent to ${lead.customer.email} (messageId: ${info.messageId})`);
  } catch (error) {
    console.error(`[email] Customer confirmation FAILED for ${lead.customer.email}: ${error.message}`);
  }

  try {
    const info = await sendAdminNewLeadEmail(lead);
    console.log(`[email] Admin new-lead notification sent to ${process.env.ADMIN_NOTIFICATION_EMAIL} (messageId: ${info.messageId})`);
  } catch (error) {
    console.error(`[email] Admin new-lead notification FAILED: ${error.message}`);
  }
};