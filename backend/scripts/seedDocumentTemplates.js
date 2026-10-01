import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DocumentTemplate from '../src/models/DocumentTemplate.js';

dotenv.config();

const SEED_TEMPLATES = [
  {
    key: 'DOCUMENT_1',
    name: 'Document 1',
    description: 'Development placeholder template. Final name and content to be provided later.',
    content:
      'DEVELOPMENT TEMPLATE 1 — NOT A LEGAL DOCUMENT\nPlaceholder content for development and testing only.\n\nCustomer: {{customer.fullName}}\nEmail: {{customer.email}}\nPhone: {{customer.phone}}',
  },
  {
    key: 'DOCUMENT_2',
    name: 'Document 2',
    description: 'Development placeholder template. Final name and content to be provided later.',
    content:
      'DEVELOPMENT TEMPLATE 2 — NOT A LEGAL DOCUMENT\nPlaceholder content for development and testing only.\n\nMoving from: {{moveDetails.movingFrom}}\nMoving to: {{moveDetails.movingTo}}\nMoving date: {{moveDetails.movingDate}}',
  },
  {
    key: 'DOCUMENT_3',
    name: 'Document 3',
    description: 'Development placeholder template. Final name and content to be provided later.',
    content:
      'DEVELOPMENT TEMPLATE 3 — NOT A LEGAL DOCUMENT\nPlaceholder content for development and testing only.\n\nMove type: {{moveDetails.moveType}}\nProperty type: {{moveDetails.propertyType}}\nBedrooms: {{moveDetails.bedrooms}}\nOrigin floor: {{moveDetails.originFloor}}\nElevator: {{moveDetails.elevator}}\nStairs: {{moveDetails.stairs}}',
  },
  {
    key: 'DOCUMENT_4',
    name: 'Document 4',
    description: 'Development placeholder template. Final name and content to be provided later.',
    content:
      'DEVELOPMENT TEMPLATE 4 — NOT A LEGAL DOCUMENT\nPlaceholder content for development and testing only.\n\nAdditional information: {{additionalInformation}}',
  },
  {
    key: 'DOCUMENT_5',
    name: 'Document 5',
    description: 'Development placeholder template. Final name and content to be provided later.',
    content:
      'DEVELOPMENT TEMPLATE 5 — NOT A LEGAL DOCUMENT\nPlaceholder content for development and testing only.\n\nQuote amount: {{quote.amount}}\nQuote currency: {{quote.currency}}\nQuote notes: {{quote.notes}}',
  },
];

const run = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Refusing to run the development document template seed in production.');
    process.exit(1);
  }

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined in the environment variables');
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  let created = 0;
  let skipped = 0;

  for (const seed of SEED_TEMPLATES) {
    const result = await DocumentTemplate.updateOne(
      { key: seed.key },
      { $setOnInsert: seed },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      created += 1;
      console.log(`Template created: ${seed.key}`);
    } else {
      skipped += 1;
      console.log(`Template ${seed.key} already exists. Skipped (content not overwritten).`);
    }
  }

  console.log(`Document templates seed complete. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
});