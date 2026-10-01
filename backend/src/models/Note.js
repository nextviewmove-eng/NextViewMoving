import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead reference is required'],
    },
    text: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
      maxlength: [5000, 'Note text is too long'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Created by admin is required'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete ret.__v;
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

noteSchema.index({ lead: 1, createdAt: -1 });

const Note = mongoose.model('Note', noteSchema);

export default Note;