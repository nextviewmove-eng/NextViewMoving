import jwt from 'jsonwebtoken';

const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment variables');
  }
  return process.env.JWT_SECRET;
};

export const signToken = (admin) =>
  jwt.sign(
    { adminId: admin._id, role: admin.role },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

export const verifyToken = (token) => jwt.verify(token, getSecret());