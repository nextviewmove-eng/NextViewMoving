import DocumentTemplate from '../models/DocumentTemplate.js';
import asyncHandler from '../utils/asyncHandler.js';

const listTemplates = asyncHandler(async (_req, res) => {
  const templates = await DocumentTemplate.find().sort({ key: 1 });

  return res.status(200).json({
    success: true,
    data: { templates: templates.map((template) => template.toJSON()) },
  });
});

const getTemplate = asyncHandler(async (req, res) => {
  const template = await DocumentTemplate.findById(req.params.id);

  if (!template) {
    return res.status(404).json({ success: false, message: 'Document template not found' });
  }

  return res.status(200).json({
    success: true,
    data: { template: template.toJSON() },
  });
});

const createTemplate = asyncHandler(async (req, res) => {
  const { key } = req.body;

  const existing = await DocumentTemplate.exists({ key });

  if (existing) {
    return res.status(400).json({ success: false, message: 'A template with this key already exists' });
  }

  const template = await DocumentTemplate.create({
    key,
    name: req.body.name,
    description: req.body.description,
    content: req.body.content,
    isActive: req.body.isActive,
  });

  return res.status(201).json({
    success: true,
    message: 'Document template created successfully',
    data: { template: template.toJSON() },
  });
});

const updateTemplate = asyncHandler(async (req, res) => {
  const template = await DocumentTemplate.findById(req.params.id);

  if (!template) {
    return res.status(404).json({ success: false, message: 'Document template not found' });
  }

  if (req.body.key !== undefined && req.body.key !== template.key) {
    const existing = await DocumentTemplate.exists({ key: req.body.key, _id: { $ne: template._id } });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A template with this key already exists' });
    }
  }

  if (req.body.key !== undefined) {
    template.key = req.body.key;
  }
  if (req.body.name !== undefined) {
    template.name = req.body.name;
  }
  if (req.body.description !== undefined) {
    template.description = req.body.description;
  }
  if (req.body.content !== undefined) {
    template.content = req.body.content;
  }
  if (req.body.isActive !== undefined) {
    template.isActive = req.body.isActive;
  }

  await template.save();

  return res.status(200).json({
    success: true,
    message: 'Document template updated successfully',
    data: { template: template.toJSON() },
  });
});

export default { listTemplates, getTemplate, createTemplate, updateTemplate };