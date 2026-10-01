import Lead from '../models/Lead.js';
import Note from '../models/Note.js';
import asyncHandler from '../utils/asyncHandler.js';

const isLeadMissing = async (leadId) => !(await Lead.exists({ _id: leadId }));

const createNote = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  if (await isLeadMissing(leadId)) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const note = await Note.create({
    lead: leadId,
    text: req.body.text,
    createdBy: req.user._id,
  });

  return res.status(201).json({
    success: true,
    message: 'Note added successfully',
    data: { note: note.toJSON() },
  });
});

const listNotes = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  if (await isLeadMissing(leadId)) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const notes = await Note.find({ lead: leadId })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');

  return res.status(200).json({
    success: true,
    data: { notes: notes.map((note) => note.toJSON()) },
  });
});

const updateNote = asyncHandler(async (req, res) => {
  const { leadId, noteId } = req.params;

  if (await isLeadMissing(leadId)) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const note = await Note.findOne({ _id: noteId, lead: leadId });

  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  if (req.body.text !== undefined) {
    note.text = req.body.text;
  }

  await note.save();

  return res.status(200).json({
    success: true,
    message: 'Note updated successfully',
    data: { note: note.toJSON() },
  });
});

const deleteNote = asyncHandler(async (req, res) => {
  const { leadId, noteId } = req.params;

  if (await isLeadMissing(leadId)) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const note = await Note.findOneAndDelete({ _id: noteId, lead: leadId });

  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Note deleted successfully',
    data: { id: note.id },
  });
});

export default { createNote, listNotes, updateNote, deleteNote };