import mongoose from 'mongoose';

const documentTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Template key is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [50, 'Template key is too long'],
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [120, 'Template name is too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Template description is too long'],
    },
    content: {
      type: String,
      required: [true, 'Template content is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
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

documentTemplateSchema.index({ key: 1, isActive: 1 });
documentTemplateSchema.index({ isActive: 1 });

const DocumentTemplate = mongoose.model('DocumentTemplate', documentTemplateSchema);

export default DocumentTemplate;