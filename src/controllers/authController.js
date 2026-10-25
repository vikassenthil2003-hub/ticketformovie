const mongoose = require('mongoose');
const User = require('../models/User');
const AuditEvent = require('../models/AuditEvent');
const { generateToken } = require('../utils/jwtHelper');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Register User (Public)
 * Critical Security Rule: Public registration MUST ALWAYS assign role: 'user'.
 * Any incoming 'role' field in req.body is completely ignored / discarded.
 */
const register = async (req, res, next) => {
  try {
    const rawName = (req.body.name || req.body.fullName || '').toString().trim();
    const rawEmail = (req.body.email || '').toString().toLowerCase().trim();
    const rawPassword = req.body.password ? req.body.password.toString() : '';
    const rawPhone = (req.body.phone || req.body.mobileNumber || '').toString().trim();
    const preferredCity = req.body.preferredCity || req.body.city || 'Chennai';
    const preferences = req.body.preferences || { city: preferredCity };
    const referredBy = req.body.referredBy || null;

    const errors = {};

    if (!rawName) {
      errors.name = 'Full name is required';
    } else if (rawName.length < 2) {
      errors.name = 'Full name must be at least 2 characters long';
    }

    if (!rawEmail) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(rawEmail)) {
      errors.email = 'Please provide a valid email address';
    }

    if (!rawPassword) {
      errors.password = 'Password is required';
    } else if (rawPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (rawPhone && !/^[0-9+\s-]{7,15}$/.test(rawPhone)) {
      errors.phone = 'Please provide a valid phone number';
    }

    if (Object.keys(errors).length > 0) {
      const firstErrorMessage = Object.values(errors)[0];
      return errorResponse(res, firstErrorMessage, 400, errors);
    }

    const existingUser = await User.findOne({ email: rawEmail });
    if (existingUser) {
      return errorResponse(
        res,
        'An account with this email address already exists. Please sign in instead.',
        409,
        { email: 'An account with this email address already exists' }
      );
    }

    // Force role to 'user' strictly - ignoring any role provided in request body
    const newUser = new User({
      name: rawName,
      email: rawEmail,
      password: rawPassword,
      phone: rawPhone,
      role: 'user', // Enforce 'user' role strictly
      preferences,
      referredBy,
      rewardPoints: 50, // Welcome points
    });

    await newUser.save();

    // Check if referral code was used
    if (referredBy) {
      const referrer = await User.findOne({ referralCode: referredBy.toUpperCase().trim() });
      if (referrer) {
        referrer.rewardPoints += 50;
        await referrer.save();
      }
    }

    const token = generateToken({ id: newUser._id, role: newUser.role });

    return successResponse(
      res,
      'Registration successful! Welcome to CineVerse AI.',
      {
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          rewardPoints: newUser.rewardPoints,
          membershipTier: newUser.membershipTier,
          referralCode: newUser.referralCode,
          preferences: newUser.preferences,
        },
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Unified Login Controller
 * Supports 'mode': 'user' | 'admin' | 'theatre'
 * Server-side checks:
 * - If mode === 'admin', real user role in DB MUST be 'admin'. If not, reject with 403 Forbidden!
 * - If mode === 'theatre', real user role in DB MUST be 'theatre'.
 * - If mode === 'user', user with role 'admin' is warned or guided to use Admin Login mode.
 */
const login = async (req, res, next) => {
  try {
    // 1. Verify database connectivity
    if (mongoose.connection.readyState !== 1) {
      return errorResponse(
        res,
        'Database service is temporarily unavailable. Please try again later.',
        503
      );
    }

    const { email, password } = req.body || {};
    const loginMode = (req.body?.loginMode || req.body?.mode || 'user').toLowerCase().trim();

    const trimmedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const trimmedPassword = typeof password === 'string' ? password : '';

    if (!trimmedEmail || !trimmedPassword) {
      return errorResponse(res, 'Please provide both email and password', 400);
    }

    // 2. Explicitly query user with password field
    const user = await User.findOne({ email: trimmedEmail }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid email or password credentials', 401);
    }

    const isMatch = await user.comparePassword(trimmedPassword);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password credentials', 401);
    }

    const userRole = (user.role || '').toLowerCase().trim();

    // 3. Strict Server-Side Role Verification against requested loginMode
    if (loginMode === 'admin') {
      if (userRole !== 'admin') {
        // Record audit event for suspicious admin login attempt
        try {
          await AuditEvent.create({
            userId: user._id,
            userEmail: user.email,
            userRole: user.role,
            action: 'FAILED_ADMIN_LOGIN_UNAUTHORIZED_ROLE',
            entity: 'Auth',
            ipAddress: req.ip,
            details: { attemptedRole: 'admin', actualRole: user.role },
          });
        } catch (auditErr) {
          // Non-blocking audit error
        }

        return errorResponse(
          res,
          'Access denied. This account does not have administrator privileges.',
          403
        );
      }
    } else if (loginMode === 'theatre') {
      if (userRole !== 'theatre') {
        if (userRole === 'admin') {
          return errorResponse(
            res,
            'This is an Administrator account. Please select "Admin Login" mode to sign in.',
            403
          );
        }
        return errorResponse(
          res,
          'Access denied. This account does not have theatre management privileges.',
          403
        );
      }
    } else {
      // Customer / User login mode: must strictly possess role 'user'
      if (userRole !== 'user') {
        if (userRole === 'admin') {
          return errorResponse(
            res,
            'This is an Administrator account. Please select "Admin Login" mode to sign in.',
            403
          );
        }
        if (userRole === 'theatre') {
          return errorResponse(
            res,
            'This is a Theatre Partner account. Please select "Theatre" mode to sign in.',
            403
          );
        }
        return errorResponse(
          res,
          'Access denied. Customer login requires a customer account.',
          403
        );
      }
    }

    const token = generateToken({ id: user._id, role: userRole });

    // Record successful login audit event for admins
    if (user.role === 'admin' || user.role === 'theatre') {
      await AuditEvent.create({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'SUCCESSFUL_PRIVILEGED_LOGIN',
        entity: 'Auth',
        ipAddress: req.ip,
        details: { loginMode },
      });
    }

    return successResponse(res, `Login successful. Welcome back, ${user.name}!`, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rewardPoints: user.rewardPoints,
        membershipTier: user.membershipTier,
        referralCode: user.referralCode,
        preferences: user.preferences,
        assignedTheatre: user.assignedTheatre,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User Profile (Protected)
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedTheatre');
    return successResponse(res, 'User profile fetched successfully', user);
  } catch (error) {
    next(error);
  }
};

/**
 * Update Profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, preferences } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();
    return successResponse(res, 'Profile updated successfully', user);
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password Flow
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 'Please provide an email address', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't leak whether user exists
      return successResponse(
        res,
        'If an account with this email exists, password reset instructions have been generated.'
      );
    }

    // Generate random 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    console.log(`[Dev Auth] Password reset code for ${email}: ${resetCode}`);

    return successResponse(
      res,
      'Password reset code generated. In development mode, check server logs or use code: ' + resetCode,
      { devResetCode: resetCode }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password Flow
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return errorResponse(res, 'Email, reset code, and new password are required', 400);
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return errorResponse(res, 'Invalid or expired password reset code', 400);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return successResponse(res, 'Password reset successful! You can now log in with your new password.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
};
