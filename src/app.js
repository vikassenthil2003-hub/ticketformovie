const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust reverse proxy headers (e.g. Render, Vercel, Cloudflare) for accurate client IPs in rate limiters
app.set('trust proxy', 1);

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration - Strictly restrict to configured trusted frontend origins
const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultAllowedOrigins]));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/+$/, '');
    const isWildcard = configuredOrigins.includes('*');
    const isConfigured = allowedOrigins.includes(cleanOrigin);
    const isLocalDev =
      cleanOrigin.startsWith('http://localhost:') ||
      cleanOrigin.startsWith('http://127.0.0.1:');
    const isVercelDomain = cleanOrigin.endsWith('.vercel.app');

    if (isWildcard || isConfigured || isLocalDev || isVercelDomain) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Normalize redundant or duplicate /api prefixes to prevent 404 errors (e.g. /api/api/... or /api/v1/api/...)
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api\//, '/api/');
  } else if (req.url.startsWith('/api/v1/api/')) {
    req.url = req.url.replace(/^\/api\/v1\/api\//, '/api/v1/');
  }
  next();
});

// HTTP request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

// Apply rate limiting to API
app.use('/api', apiLimiter);

// Direct health check endpoints (support /health and /api/health)
app.get(['/health', '/api/health'], (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CineVerse AI API Server',
    version: '1.0.0',
    database: dbStatusMap[dbState] || 'unknown',
  });
});

// Root and API index endpoints (prevents 404 when navigating to http://localhost:5000 in browser)
app.get(['/', '/api', '/api/v1'], (req, res) => {
  const clientOrigin = configuredOrigins[0] || 'http://localhost:5173';
  res.status(200).json({
    success: true,
    message: '🎬 CineVerse AI Backend API is active and operational!',
    version: '1.0.0',
    status: 'healthy',
    frontend: {
      url: clientOrigin,
      loginUrl: `${clientOrigin}/login`,
      moviesUrl: `${clientOrigin}/movies`,
    },
    endpoints: {
      health: '/api/v1/health',
      movies: '/api/v1/movies',
      theatres: '/api/v1/theatres',
      shows: '/api/v1/shows',
      snacks: '/api/v1/snacks',
      trailers: '/api/v1/trailers',
      coupons: '/api/v1/coupons/active',
      location: '/api/v1/location/districts',
      authLogin: 'POST /api/v1/auth/login',
      authRegister: 'POST /api/v1/auth/register',
    },
  });
});

// Browser direct-navigation redirect handler for frontend auth routes on backend port
app.get(['/login', '/signin', '/admin/login', '/theatre/login', '/register', '/signup'], (req, res) => {
  const clientOrigin = configuredOrigins[0] || 'http://localhost:5173';
  const targetUrl = `${clientOrigin}${req.originalUrl}`;
  if (req.accepts('html')) {
    return res.redirect(302, targetUrl);
  }
  res.status(200).json({
    success: true,
    message: 'CineVerse login page is hosted on the frontend application.',
    frontendUrl: targetUrl,
    apiEndpoint: req.originalUrl.includes('register') ? 'POST /api/v1/auth/register' : 'POST /api/v1/auth/login',
  });
});

// Mount main API router under versioned and standard endpoints
app.use('/api/v1', routes);
app.use('/api', routes);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
