const notFound = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid id';
  }

  const payload = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

export { notFound, errorHandler };