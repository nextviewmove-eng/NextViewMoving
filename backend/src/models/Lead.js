import mongoose from 'mongoose';

export const MOVE_TYPES = ['LOCAL', 'LONG_DISTANCE', 'INTER_PROVINCIAL'];
export const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'CONDO', 'TOWNHOUSE', 'OFFICE', 'COMMERCIAL', 'STORAGE_UNIT'];
export const BEDROOM_TYPES = ['STUDIO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE_PLUS'];
export const ORIGIN_FLOORS = ['GROUND_MAIN', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIX_PLUS'];
export const ELEVATOR_OPTIONS = ['YES', 'NO', 'BOTH_LOCATIONS', 'ORIGIN_ONLY', 'DESTINATION_ONLY'];
export const STAIR_OPTIONS = ['NO_STAIRS', 'A_FEW_STEPS', 'ONE_FULL_FLIGHT', 'MULTIPLE_FLIGHTS'];
export const SERVICES = ['MOVING', 'PACKING', 'UNPACKING', 'FURNITURE_ASSEMBLY', 'HEAVY_ITEM_MOVING', 'LOADING_ONLY', 'UNLOADING_ONLY'];
export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUOTE_SENT', 'BOOKED', 'COMPLETED'];

const leadSchema = new mongoose.Schema(
  {
    customer: {
      fullName: {
        type: String,
        required: [true, 'Customer full name is required'],
        trim: true,
      },
      phone: {
        type: String,
        required: [true, 'Customer phone is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Customer email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      },
    },
    moveDetails: {
      movingFrom: {
        type: String,
        required: [true, 'Moving from is required'],
        trim: true,
      },
      movingTo: {
        type: String,
        required: [true, 'Moving to is required'],
        trim: true,
      },
      movingDate: {
        type: Date,
        required: [true, 'Moving date is required'],
      },
      moveType: {
        type: String,
        enum: MOVE_TYPES,
      },
      propertyType: {
        type: String,
        enum: PROPERTY_TYPES,
      },
      bedrooms: {
        type: String,
        enum: BEDROOM_TYPES,
      },
      originFloor: {
        type: String,
        enum: ORIGIN_FLOORS,
      },
      elevator: {
        type: String,
        enum: ELEVATOR_OPTIONS,
      },
      stairs: {
        type: String,
        enum: STAIR_OPTIONS,
      },
    },
    services: [
      {
        type: String,
        enum: SERVICES,
      },
    ],
    additionalInformation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'NEW',
    },
    quote: {
      amount: {
        type: Number,
      },
      currency: {
        type: String,
        default: 'CAD',
      },
      notes: {
        type: String,
        trim: true,
      },
      sentAt: {
        type: Date,
      },
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

leadSchema.index({ 'customer.email': 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;