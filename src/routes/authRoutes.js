const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get(['/profile', '/me'], protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
// Helpful GET handlers for browser address bar or GET requests (prevents 404 on port 5000)
router.get('/login', (req, res) => {
  const clientOrigin = (process.env.CLIENT_URL || '').split(',')[0]?.trim() || 'http://localhost:5173';
  if (req.accepts('html')) {
    return res.redirect(302, `${clientOrigin}/login`);
  }
  res.status(200).json({
    success: true,
    message: 'CineVerse Auth Login endpoint requires HTTP POST with { email, password, loginMode } credentials.',
    method: 'POST',
    endpoint: '/api/v1/auth/login',
    frontendLoginUrl: `${clientOrigin}/login`,
  });
});

router.get('/register', (req, res) => {
  const clientOrigin = (process.env.CLIENT_URL || '').split(',')[0]?.trim() || 'http://localhost:5173';
  if (req.accepts('html')) {
    return res.redirect(302, `${clientOrigin}/register`);
  }
  res.status(200).json({
    success: true,
    message: 'CineVerse Registration endpoint requires HTTP POST with { name, email, password, phone } payload.',
    method: 'POST',
    endpoint: '/api/v1/auth/register',
    frontendRegisterUrl: `${clientOrigin}/register`,
  });
});
module.exports = router;
