import Admin from '../models/Admin.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  const token = header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Not authorized, token expired' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }

  const admin = await Admin.findById(decoded.adminId);

  if (!admin) {
    return res.status(401).json({ success: false, message: 'Not authorized, admin not found' });
  }

  if (!admin.isActive) {
    return res.status(403).json({ success: false, message: 'Admin account is deactivated' });
  }

  req.user = admin;
  return next();
});