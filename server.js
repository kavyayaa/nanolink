// Load environment variables from .env file first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database and cache connectors
const connectDB = require('./config/db');
const redis = require('./config/redis');

// Import routes
const urlRoutes = require('./routes/url');
const analyticsRoutes = require('./routes/analytics');

// Initialize the Express framework
const app = express();

// Establishes a connection to the MongoDB Database
connectDB();

// --- GLOBAL MIDDLEWARES ---
// Enable Cross-Origin Resource Sharing (CORS) for external frontend integration
app.use(cors());

// Parse incoming request bodies with JSON payloads
app.use(express.json());

// Parse incoming request bodies with URL-encoded payloads
app.use(express.urlencoded({ extended: true }));

// Serve static assets (HTML/CSS/JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// --- ROUTE MOUNTING (ORDER SENSITIVITY) ---
// We mount the analytics routes first under '/analytics'.
// Example: GET /analytics/abc123
app.use('/analytics', analyticsRoutes);

// We mount general url shortening and catch-all redirect routes last at '/' (root).
// Express routes are matched sequentially in the order they are registered.
// Placing the catch-all 'GET /:code' redirect at the bottom ensures that calls to other API
// paths (like '/analytics' or static file directories) are not intercepted by the redirect wildcard.
app.use('/', urlRoutes);

// Catch-all route to serve the SPA frontend for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configure listener port
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  URL Shortener Server running on Port: ${PORT}`);
  console.log(`  Local Environment: http://localhost:${PORT}`);
  console.log(`====================================================`);
});

// Handle unhandled promise rejections globally to prevent silent crashes
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // In a real production setup, consider running graceful shutdown here
});

module.exports = { app, server };

/**
 * ============================================================================
 *                       FUTURE ENHANCEMENTS ROADMAP
 * ============================================================================
 * 
 * To evolve this application into a enterprise-grade SaaS product,
 * the following architectural upgrades can be implemented:
 * 
 * 1. USER AUTHENTICATION & SECURITY
 *    - Tech: JWT (JSON Web Tokens), bcryptjs, and HttpOnly cookies.
 *    - Value: Allow users to sign up, log in, manage their personal dashboard,
 *             and preserve their shortening history across devices.
 * 
 * 2. INTERACTIVE QR CODES
 *    - Tech: node-qrcode package.
 *    - Value: Generate a downloadable, high-resolution QR code dynamically
 *             for every shortened URL created. Let users scan them on the fly.
 * 
 * 3. EXPIRING LINKS VIA REDIS KEYSPACE NOTIFICATIONS
 *    - Tech: Redis KEA config (Keyspace Events).
 *    - Value: Instead of periodic database sweeps, configure Redis to send
 *             a callback to Node.js when an expiring key deletes itself. Node.js
 *             can then mark the database document as expired in real-time.
 * 
 * 4. CUSTOM ANALYTICS DATE RANGES & FILTERS
 *    - Tech: Extended MongoDB $match aggregations, flatpickr on frontend.
 *    - Value: Give users a date-range picker on the frontend to select specific
 *             dates (e.g. last 30 days, last 6 months) instead of a hardcoded 7-day view.
 * 
 * 5. LINK PASSWORD PROTECTION
 *    - Tech: bcrypt-hashed link passwords.
 *    - Value: Let users specify a password when shortening. When visiting the short
 *             link, serve a security gate page requesting the password before directing.
 * 
 * 6. CONTAINERIZATION & ORCHESTRATION (DOCKER + KUBERNETES)
 *    - Tech: Docker, Docker-compose, Helm, Kubernetes.
 *    - Value: Package Node.js, MongoDB, and Redis into separate container services.
 *             Use Kubernetes horizontal pod autoscaling (HPA) to scale Node.js instances
 *             up or down automatically based on traffic spikes.
 */
