import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';

import Lead from '../models/Lead.js';
import LeadDocument from '../models/LeadDocument.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import {
  buildDocumentDeliveryUrl,
  buildDocumentPublicId,
  deleteDocumentAsset,
  uploadDocumentPdf,
} from './documentStorage.service.js';

const DOCUMENTS_DIR = path.resolve('uploads', 'documents');

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9.]+)\s*\}\}/g;

const stringify = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const valuesForLead = (lead) => ({
  'customer.fullName': stringify(lead.customer?.fullName),
  'customer.email': stringify(lead.customer?.email),
  'customer.phone': stringify(lead.customer?.phone),
  'moveDetails.movingFrom': stringify(lead.moveDetails?.movingFrom),
  'moveDetails.movingTo': stringify(lead.moveDetails?.movingTo),
  'moveDetails.movingDate': formatDate(lead.moveDetails?.movingDate),
  'moveDetails.moveType': stringify(lead.moveDetails?.moveType),
  'moveDetails.propertyType': stringify(lead.moveDetails?.propertyType),
  'moveDetails.bedrooms': stringify(lead.moveDetails?.bedrooms),
  'moveDetails.originFloor': stringify(lead.moveDetails?.originFloor),
  'moveDetails.elevator': stringify(lead.moveDetails?.elevator),
  'moveDetails.stairs': stringify(lead.moveDetails?.stairs),
  additionalInformation: stringify(lead.additionalInformation),
  'quote.amount': stringify(lead.quote?.amount),
  'quote.currency': stringify(lead.quote?.currency),
  'quote.notes': stringify(lead.quote?.notes),
});

export const renderTemplateContent = (templateContent, lead) => {
  const values = valuesForLead(lead);
  return templateContent.replace(PLACEHOLDER_PATTERN, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : ''
  );
};

const generatePdfFile = async ({ filePath, title, content }) => {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 60, bottom: 60, left: 72, right: 72 },
    info: { Title: title },
  });

  const stream = doc.pipe(fs.createWriteStream(filePath));

  doc.font('Helvetica-Bold').fontSize(18).text(title, { lineGap: 4 });
  doc.moveDown();
  doc.font('Helvetica').fontSize(12).text(content, { lineGap: 6, align: 'left' });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const loadLeadDocumentContext = async (leadId, documentId) => {
  const lead = await Lead.findById(leadId);
  if (!lead) return { error: 'Lead not found', status: 404 };

  const leadDocument = await LeadDocument.findOne({ lead: leadId, _id: documentId }).populate(
    'template'
  );
  if (!leadDocument) return { error: 'Lead document not found', status: 404 };
  if (!leadDocument.template) return { error: 'Document template not found', status: 404 };

  return { lead, leadDocument, template: leadDocument.template };
};

export const previewLeadDocument = async (leadId, documentId) => {
  const context = await loadLeadDocumentContext(leadId, documentId);
  if (context.error) return context;

  const content = renderTemplateContent(context.template.content, context.lead);

  return {
    documentId: context.leadDocument._id.toString(),
    template: {
      key: context.template.key,
      name: context.template.name,
    },
    content,
  };
};

export const generateLeadDocumentPdf = async (leadId, documentId) => {
  const context = await loadLeadDocumentContext(leadId, documentId);
  if (context.error) return context;

  if (context.leadDocument.status === 'COMPLETED') {
    return { error: 'Document is already completed and signed; regeneration is not allowed', status: 409 };
  }

  if (!isCloudinaryConfigured()) {
    return { error: 'Cloudinary is not configured', status: 500 };
  }

  const content = renderTemplateContent(context.template.content, context.lead);
  const publicId = buildDocumentPublicId(leadId, documentId);
  const fileName = `${context.template.key.toLowerCase()}_${documentId}.pdf`;
  const filePath = path.join(DOCUMENTS_DIR, fileName);

  await fsPromises.mkdir(DOCUMENTS_DIR, { recursive: true });

  let storage;
  try {
    await generatePdfFile({ filePath, title: context.template.name, content });
    storage = await uploadDocumentPdf({ filePath, publicId });
  } finally {
    await fsPromises.unlink(filePath).catch(() => {});
  }

  const previousPublicId = context.leadDocument.storage?.publicId || null;

  context.leadDocument.generatedFileName = fileName;
  context.leadDocument.generatedAt = new Date();
  context.leadDocument.storage = storage;
  await context.leadDocument.save();

  if (previousPublicId && previousPublicId !== storage.publicId) {
    try {
      await deleteDocumentAsset(previousPublicId);
    } catch (error) {
      console.error(
        `Failed to clean up previous Cloudinary asset "${previousPublicId}": ${error.message}`
      );
    }
  }

  return {
    documentId: context.leadDocument._id.toString(),
    fileName,
    generatedAt: context.leadDocument.generatedAt.toISOString(),
    storage: {
      provider: storage.provider,
      secureUrl: storage.secureUrl,
    },
  };
};

export const getLeadDocumentFile = async (leadId, documentId) => {
  const context = await loadLeadDocumentContext(leadId, documentId);
  if (context.error) return context;

  const storage = context.leadDocument.storage;
  if (!storage || !storage.secureUrl) {
    return { error: 'Generated file not found', status: 404 };
  }

  return {
    documentId: context.leadDocument._id.toString(),
    fileName: context.leadDocument.generatedFileName || null,
    generatedAt: context.leadDocument.generatedAt
      ? context.leadDocument.generatedAt.toISOString()
      : null,
    storage: {
      provider: storage.provider,
      secureUrl: buildDocumentDeliveryUrl({
        publicId: storage.publicId,
        format: storage.format,
        resourceType: storage.resourceType,
      }),
    },
  };
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const readPngDimensions = (buffer) => {
  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(PNG_SIGNATURE) &&
    buffer.toString('latin1', 12, 16) === 'IHDR'
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  return null;
};

const generateSignedPdfFile = async ({
  filePath,
  title,
  content,
  signatureImagePath,
  signatureWidth,
  signatureHeight,
  signedDateText,
}) => {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 60, bottom: 60, left: 72, right: 72 },
    info: { Title: title },
  });

  const stream = doc.pipe(fs.createWriteStream(filePath));

  doc.font('Helvetica-Bold').fontSize(18).text(title, { lineGap: 4 });
  doc.moveDown();
  doc.font('Helvetica').fontSize(12).text(content, { lineGap: 6, align: 'left' });

  doc.moveDown(2);
  doc.font('Helvetica-Bold').fontSize(12).text('Customer Signature:');
  doc.moveDown();
  doc.image(signatureImagePath, {
    fit: [signatureWidth, signatureHeight],
  });
  doc.moveDown();
  doc.font('Helvetica').fontSize(12).text(`Signed Date: ${signedDateText}`);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

export const signLeadDocument = async (leadId, documentId, { signatureData }) => {
  const context = await loadLeadDocumentContext(leadId, documentId);
  if (context.error) return context;

  if (context.leadDocument.status === 'COMPLETED') {
    return { error: 'Document is already completed and signed', status: 409 };
  }

  if (!isCloudinaryConfigured()) {
    return { error: 'Cloudinary is not configured', status: 500 };
  }

  const prefix = 'data:image/png;base64,';
  const signatureImageBuffer = Buffer.from(signatureData.slice(prefix.length), 'base64');

  if (signatureImageBuffer.length === 0 || !readPngDimensions(signatureImageBuffer)) {
    return { error: 'Invalid signature image', status: 400 };
  }

  const { width: pngWidth, height: pngHeight } = readPngDimensions(signatureImageBuffer);
  const scale = Math.min(1, 280 / pngWidth, 150 / pngHeight);
  const signatureWidth = Math.max(1, Math.round(pngWidth * scale));
  const signatureHeight = Math.max(1, Math.round(pngHeight * scale));

  const content = renderTemplateContent(context.template.content, context.lead);
  const publicId = buildDocumentPublicId(leadId, documentId);
  const fileName = `${context.template.key.toLowerCase()}_${documentId}_signed.pdf`;
  const signedFilePath = path.join(DOCUMENTS_DIR, fileName);
  const signatureFilePath = path.join(DOCUMENTS_DIR, `signature_${documentId}.png`);

  await fsPromises.mkdir(DOCUMENTS_DIR, { recursive: true });
  await fsPromises.writeFile(signatureFilePath, signatureImageBuffer);

  let storage;
  try {
    await generateSignedPdfFile({
      filePath: signedFilePath,
      title: context.template.name,
      content,
      signatureImagePath: signatureFilePath,
      signatureWidth,
      signatureHeight,
      signedDateText: formatDate(new Date()),
    });
    storage = await uploadDocumentPdf({ filePath: signedFilePath, publicId });
  } finally {
    await fsPromises.unlink(signedFilePath).catch(() => {});
    await fsPromises.unlink(signatureFilePath).catch(() => {});
  }

  const previousPublicId = context.leadDocument.storage?.publicId || null;

  const now = new Date();
  context.leadDocument.status = 'COMPLETED';
  context.leadDocument.completedAt = now;
  context.leadDocument.signature = { signedAt: now, signedBy: 'CUSTOMER' };
  context.leadDocument.storage = storage;
  context.leadDocument.generatedFileName = fileName;
  context.leadDocument.generatedAt = now;
  await context.leadDocument.save();

  if (previousPublicId && previousPublicId !== storage.publicId) {
    try {
      await deleteDocumentAsset(previousPublicId);
    } catch (error) {
      console.error(
        `Failed to clean up previous Cloudinary asset "${previousPublicId}": ${error.message}`
      );
    }
  }

  return {
    documentId: context.leadDocument._id.toString(),
    status: 'COMPLETED',
    completedAt: now.toISOString(),
    signature: {
      signedAt: now.toISOString(),
      signedBy: 'CUSTOMER',
    },
    storage: {
      provider: storage.provider,
      secureUrl: storage.secureUrl,
    },
  };
};