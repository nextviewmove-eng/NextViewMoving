import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../src/models/Admin.js';

dotenv.config();

const SEED_ADMIN = {
  name: 'Test Admin',
  email: 'admin@test.com',
  password: 'Admin@123',
  role: 'admin',
};

const run = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Refusing to run the development admin seed in production.');
    process.exit(1);
  }

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined in the environment variables');
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  const existing = await Admin.findOne({ email: SEED_ADMIN.email });

  if (existing) {
    console.log(`Admin ${SEED_ADMIN.email} already exists. No duplicate created.`);
  } else {
    const admin = await Admin.create(SEED_ADMIN);
    console.log(`Admin created: ${admin.email} (name: ${admin.name}, role: ${admin.role})`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
});