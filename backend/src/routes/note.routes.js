import { Router } from 'express';
import noteController from '../controllers/note.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  noteLeadIdValidation,
  noteIdValidation,
  createNoteValidation,
  updateNoteValidation,
} from '../middleware/noteValidation.middleware.js';

const router = Router();

router.use(protect);

router.post('/:leadId/notes', noteLeadIdValidation, createNoteValidation, validate, noteController.createNote);
router.get('/:leadId/notes', noteLeadIdValidation, validate, noteController.listNotes);
router.patch('/:leadId/notes/:noteId', noteIdValidation, updateNoteValidation, validate, noteController.updateNote);
router.delete('/:leadId/notes/:noteId', noteIdValidation, validate, noteController.deleteNote);

export default router;