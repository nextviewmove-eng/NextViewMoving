import asyncHandler from '../utils/asyncHandler.js';
import {
  initializeLeadDocuments,
  listLeadDocuments,
  getLeadDocument,
  updateLeadDocumentStatus,
} from '../services/leadDocument.service.js';
import {
  previewLeadDocument,
  generateLeadDocumentPdf,
  getLeadDocumentFile,
  signLeadDocument,
} from '../services/documentGeneration.service.js';

export const initializeDocuments = asyncHandler(async (req, res) => {
  const result = await initializeLeadDocuments(req.params.leadId);

  if (result.error) {
    return res.status(result.status).json({ success: false, message: result.error });
  }

  return res.status(200).json({
    success: true,
    message: 'Lead documents initialized successfully',
    data: result,
  });
});

export const listDocuments = asyncHandler(async (req, res) => {
  const result = await listLeadDocuments(req.params.leadId);

  if (result.error) {
    return res.status(result.status).json({ success: false, message: result.error });
  }

  return res.status(200).json({
    success: true,
    data: { documents: result.documents },
  });
});

export const getDocument = asyncHandler(async (req, res) => {
  const result = await getLeadDocument(req.params.leadId, req.params.documentId);

  if (result.error) {
    return res.status(result.status).json({ success: false, message: result.error });
  }

  return res.status(200).json({
    success: true,
    data: { document: result.document },
  });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const result = await updateLeadDocumentStatus(
    req.params.leadId,
    req.params.documentId,
    req.body
  );

  if (result.error) {
    return res.status(result.status).json({ success: false, message: result.error });
  }

  return res.status(200).json({
    success: true,
    data: { document: result.document },
  });
});

export const getPreview = asyncHandler(async (req, res) => {
  const result = await previewLeadDocument(req.params.leadId, req.params.documentId);

  if (result.error) {
    return res.status(result.status).json({ success: false, message: result.error });
  }

  return res.status(200).json({
    success: true,
    data: result,
  });
});

export const generateDocument = asyncHandler(async (req, res) => {
  const result = await generateLeadDocumentPdf(req.params.leadId, req.params.documentId);

  if (result.error) {
    return res.status(result.status).json({ success: false, message: result.error });
  }

  return res.status(200).json({
    success: true,
    message: 'Document generated successfully',
    data: result,
  });
});

export const getDocumentFile = asyncHandler(async (req, res) => {
  const result = await getLeadDocumentFile(req.params.leadId, req.params.documentId);

  if (result.error) {
    return res.status(result.status).json({ success: false, message: result.error });
  }

  return res.status(200).json({
    success: true,
    data: result,
  });
});

export const signDocument = asyncHandler(async (req, res) => {
  const result = await signLeadDocument(req.params.leadId, req.params.documentId, {
    signatureData: req.body.signature,
  });

  if (result.error) {
    return res.status(result.status).json({ success: false, message: result.error });
  }

  return res.status(200).json({
    success: true,
    message: 'Document signed successfully',
    data: result,
  });
});
