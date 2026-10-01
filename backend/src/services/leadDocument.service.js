import Lead from '../models/Lead.js';
import DocumentTemplate from '../models/DocumentTemplate.js';
import LeadDocument from '../models/LeadDocument.js';

const expandDocument = (document) => document.toJSON();

const templatesForLead = async (leadId) => {
  return DocumentTemplate.find({ isActive: true }).sort({ key: 1 });
};

export const initializeLeadDocuments = async (leadId) => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    return { error: 'Lead not found', status: 404 };
  }

  const templates = await templatesForLead(leadId);
  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    const result = await LeadDocument.updateOne(
      { lead: leadId, template: template._id },
      { $setOnInsert: { lead: leadId, template: template._id, status: 'PENDING', completedAt: null } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) {
      created += 1;
    } else {
      skipped += 1;
    }
  }

  const documents = await LeadDocument.find({ lead: leadId })
    .sort({ createdAt: 1 })
    .populate('template', 'key name description isActive');

  return {
    created,
    skipped,
    documents: documents.map(expandDocument),
  };
};

export const listLeadDocuments = async (leadId) => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    return { error: 'Lead not found', status: 404 };
  }

  const documents = await LeadDocument.find({ lead: leadId })
    .sort({ createdAt: 1 })
    .populate('template', 'key name description isActive');

  return { documents: documents.map(expandDocument) };
};

export const getLeadDocument = async (leadId, documentId) => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    return { error: 'Lead not found', status: 404 };
  }

  const document = await LeadDocument.findOne({ lead: leadId, _id: documentId }).populate(
    'template',
    'key name description isActive'
  );
  if (!document) {
    return { error: 'Lead document not found', status: 404 };
  }

  return { document: expandDocument(document) };
};

export const updateLeadDocumentStatus = async (leadId, documentId, payload) => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    return { error: 'Lead not found', status: 404 };
  }

  const document = await LeadDocument.findOne({ lead: leadId, _id: documentId });
  if (!document) {
    return { error: 'Lead document not found', status: 404 };
  }

  document.status = payload.status;
  if (payload.status === 'COMPLETED') {
    document.completedAt = payload.completedAt ? new Date(payload.completedAt) : new Date();
  } else if (payload.status === 'PENDING') {
    document.completedAt = null;
  }

  await document.save();

  const populated = await LeadDocument.findById(document._id).populate(
    'template',
    'key name description isActive'
  );

  return { document: expandDocument(populated) };
};
