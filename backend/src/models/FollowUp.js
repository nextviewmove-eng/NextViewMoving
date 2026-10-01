import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead reference is required'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [5000, 'Follow-up note is too long'],
    },
    dueAt: {
      type: Date,
      required: [true, 'Follow-up due date is required'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
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

followUpSchema.index({ lead: 1, createdAt: -1 });
followUpSchema.index({ dueAt: 1 });
followUpSchema.index({ completed: 1, dueAt: -1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);

export default FollowUp;