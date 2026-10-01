import Admin from '../models/Admin.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin || !admin.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const isMatch = await admin.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const token = signToken(admin);

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      admin: admin.toJSON(),
      token,
    },
  });
});

const getMe = (req, res) =>
  res.status(200).json({
    success: true,
    data: {
      admin: req.user.toJSON(),
    },
  });

const logout = (_req, res) =>
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. The client should remove the stored token.',
  });

const testEndpoint = (req, res) =>
  res.status(200).json({
    success: true,
    message: 'Authentication middleware is working',
    data: {
      adminId: req.user.id,
      role: req.user.role,
    },
  });

export default { login, getMe, logout, testEndpoint };