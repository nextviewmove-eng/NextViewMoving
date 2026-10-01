import mongoose from 'mongoose';

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

const healthCheck = (_req, res) => {
  const readyState = mongoose.connection.readyState;
  const database = DB_STATES[readyState] ?? 'unknown';

  res.status(200).json({
    success: true,
    message: 'API is running',
    environment: process.env.NODE_ENV || 'development',
    database,
  });
};

export default { healthCheck };