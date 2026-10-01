import mongoose from 'mongoose';

export const LEAD_DOCUMENT_STATUSES = ['PENDING', 'COMPLETED'];

const leadDocumentSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead reference is required'],
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentTemplate',
      required: [true, 'Document template reference is required'],
    },
    status: {
      type: String,
      enum: LEAD_DOCUMENT_STATUSES,
      default: 'PENDING',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    generatedFileName: {
      type: String,
      trim: true,
      default: null,
    },
    generatedAt: {
      type: Date,
      default: null,
    },
    storage: {
      provider: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
      secureUrl: {
        type: String,
        default: null,
      },
      resourceType: {
        type: String,
        default: null,
      },
      format: {
        type: String,
        default: null,
      },
      bytes: {
        type: Number,
        default: null,
      },
    },
    signature: {
      type: new mongoose.Schema(
        {
          signedAt: {
            type: Date,
            default: null,
          },
          signedBy: {
            type: String,
            enum: ['CUSTOMER', 'STAFF'],
            default: null,
          },
        },
        { _id: false }
      ),
      default: null,
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
  }
);

leadDocumentSchema.index({ lead: 1, template: 1 }, { unique: true });
leadDocumentSchema.index({ lead: 1, status: 1 });
leadDocumentSchema.index({ template: 1 });

const LeadDocument = mongoose.model('LeadDocument', leadDocumentSchema);

export default LeadDocument;
