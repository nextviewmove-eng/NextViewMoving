import Lead from '../models/Lead.js';
import asyncHandler from '../utils/asyncHandler.js';
import { notifyNewLead } from '../services/email.service.js';

const CUSTOMER_FIELDS = ['fullName', 'phone', 'email'];
const MOVE_FIELDS = ['movingFrom', 'movingTo', 'movingDate', 'moveType', 'propertyType', 'bedrooms', 'originFloor', 'elevator', 'stairs'];
const QUOTE_FIELDS = ['amount', 'currency', 'notes', 'sentAt'];
const TOP_FIELDS = ['additionalInformation', 'services', 'status'];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyTo = (target, source, fields) => {
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      target[field] = source[field];
    }
  });
};

const applyUpdate = (lead, body) => {
  if (body.customer) {
    applyTo(lead.customer, body.customer, CUSTOMER_FIELDS);
  }
  if (body.moveDetails) {
    applyTo(lead.moveDetails, body.moveDetails, MOVE_FIELDS);
  }
  if (body.quote) {
    applyTo(lead.quote, body.quote, QUOTE_FIELDS);
  }
  applyTo(lead, body, TOP_FIELDS);
};

const createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create({
    customer: req.body.customer,
    moveDetails: req.body.moveDetails,
    services: req.body.services || [],
    additionalInformation: req.body.additionalInformation,
    status: 'NEW',
    quote: req.body.quote,
  });

  await notifyNewLead(lead);

  return res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: { lead: lead.toJSON() },
  });
});

const listLeads = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const { status, search } = req.query;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { 'customer.fullName': pattern },
      { 'customer.email': pattern },
      { 'customer.phone': pattern },
    ];
  }

  const total = await Lead.countDocuments(filter);
  const leads = await Lead.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    data: {
      leads: leads.map((lead) => lead.toJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
});

const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  return res.status(200).json({
    success: true,
    data: { lead: lead.toJSON() },
  });
});

const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  applyUpdate(lead, req.body);
  await lead.save();

  return res.status(200).json({
    success: true,
    message: 'Lead updated successfully',
    data: { lead: lead.toJSON() },
  });
});

const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Lead deleted successfully',
    data: { id: lead.id },
  });
});

export default { createLead, listLeads, getLead, updateLead, deleteLead };