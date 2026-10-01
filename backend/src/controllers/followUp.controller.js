import Lead from '../models/Lead.js';
import FollowUp from '../models/FollowUp.js';
import asyncHandler from '../utils/asyncHandler.js';

const isLeadMissing = async (leadId) => !(await Lead.exists({ _id: leadId }));

const createFollowUp = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  if (await isLeadMissing(leadId)) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const followUp = await FollowUp.create({
    lead: leadId,
    note: req.body.note,
    dueAt: req.body.dueAt,
    createdBy: req.user._id,
  });

  return res.status(201).json({
    success: true,
    message: 'Follow-up created successfully',
    data: { followUp: followUp.toJSON() },
  });
});

const listFollowUps = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  if (await isLeadMissing(leadId)) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const followUps = await FollowUp.find({ lead: leadId })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');

  return res.status(200).json({
    success: true,
    data: { followUps: followUps.map((followUp) => followUp.toJSON()) },
  });
});

const updateFollowUp = asyncHandler(async (req, res) => {
  const { leadId, followUpId } = req.params;

  if (await isLeadMissing(leadId)) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const followUp = await FollowUp.findOne({ _id: followUpId, lead: leadId });

  if (!followUp) {
    return res.status(404).json({ success: false, message: 'Follow-up not found' });
  }

  if (req.body.note !== undefined) {
    followUp.note = req.body.note;
  }

  if (req.body.dueAt !== undefined) {
    followUp.dueAt = req.body.dueAt;
  }

  if (req.body.completed === true) {
    if (!followUp.completed) {
      followUp.completedAt = new Date();
    }
    followUp.completed = true;
  } else if (req.body.completed === false) {
    followUp.completed = false;
    followUp.completedAt = null;
  }

  await followUp.save();

  return res.status(200).json({
    success: true,
    message: 'Follow-up updated successfully',
    data: { followUp: followUp.toJSON() },
  });
});

const deleteFollowUp = asyncHandler(async (req, res) => {
  const { leadId, followUpId } = req.params;

  if (await isLeadMissing(leadId)) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const followUp = await FollowUp.findOneAndDelete({ _id: followUpId, lead: leadId });

  if (!followUp) {
    return res.status(404).json({ success: false, message: 'Follow-up not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Follow-up deleted successfully',
    data: { id: followUp.id },
  });
});

const listAllFollowUps = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = {};
  const sort = { createdAt: -1 };

  if (status === 'pending') {
    filter.completed = false;
    sort.dueAt = 1;
  } else if (status === 'completed') {
    filter.completed = true;
    sort.completedAt = -1;
  }

  const followUps = await FollowUp.find(filter)
    .sort(sort)
    .populate('lead', 'customer.fullName customer.phone customer.email status')
    .populate('createdBy', 'name email');

  return res.status(200).json({
    success: true,
    data: { followUps: followUps.map((followUp) => followUp.toJSON()) },
  });
});

export default { createFollowUp, listFollowUps, updateFollowUp, deleteFollowUp, listAllFollowUps };