import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';


const app = express();

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const allowedOrigins = [...parseOrigins(process.env.CLIENT_URL), ...parseOrigins(process.env.ADMIN_URL)];

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api', apiRoutes);

app.use(notFound);

app.use(errorHandler);

export default app;