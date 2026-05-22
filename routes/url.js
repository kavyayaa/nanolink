const express = require('express');
const router = express.Router();
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

// Import configurations and models
const Url = require('../models/Url');
const Click = require('../models/Click');
const redis = require('../config/redis');
const { generateShortCode } = require('../utils/encode');
const rateLimiter = require('../middleware/rateLimiter');

// Reserved custom aliases that are blocked to avoid overriding backend endpoint routes
const RESERVED_ALIASES = new Set([
  'analytics',
  'shorten',
  'api',
  'admin',
  'public',
  'config',
  'models',
  'routes',
  'middleware',
  'utils',
  'assets',
  'static'
]);

/**
 * --- PRODUCTION-GRADE ASYNC CLICK TRACKING (NON-BLOCKING) ---
 * 
 * Why run analytics asynchronously without awaiting?
 * Redirection speed is the most critical metric for a URL shortener. If a user clicks a link,
 * we want to send them to their destination in milliseconds.
 * 
 * If we awaited the database writes (saving a Click document and incrementing totalClicks in the Url collection),
 * the client would be blocked waiting for these disk writes to complete. This adds significant latency.
 * By spawning `trackClick` in the background and immediately returning the 302 Redirect header, we decouple
 * analytics logging from redirection latency.
 * 
 * Fault Tolerance:
 * Adding a `.catch()` block ensures that if MongoDB is slow, locked, or temporarily offline,
 * the redirect completes successfully. We log the analytics error safely without crashing the client's request.
 */
const trackClick = async (shortCode, req) => {
  try {
    // 1. Parse User Agent for browser and device metrics
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();

    // Extract device type (defaults to 'Desktop' if not mobile/tablet)
    const deviceType = uaResult.device.type
      ? uaResult.device.type.charAt(0).toUpperCase() + uaResult.device.type.slice(1)
      : 'Desktop';
    
    // Extract browser name
    const browserName = uaResult.browser.name || 'Unknown Browser';

    // 2. Parse IP and extract GeoIP location data (country + city)
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ip = rawIp.split(',')[0].trim();

    let country = 'Unknown';
    let city = 'Unknown';

    // geoip-lite handles local/private IPs by returning null. We wrap this to catch exceptions gracefully.
    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        country = geo.country || 'Unknown';
        city = geo.city || 'Unknown';
      } else if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || ip === '::ffff:127.0.0.1') {
        country = 'Localhost';
        city = 'Localhost';
      }
    } catch (geoError) {
      console.error('GeoIP lookup failed:', geoError.message);
    }

    // 3. Extract referrer information
    const referrer = req.headers['referer'] || req.headers['referrer'] || 'Direct';

    // 4. Save the click entry to MongoDB
    const clickEvent = new Click({
      shortCode,
      country,
      city,
      device: deviceType,
      browser: browserName,
      referrer
    });
    await clickEvent.save();

    // 5. Atomically increment the totalClicks count in MongoDB
    await Url.updateOne({ shortCode }, { $inc: { totalClicks: 1 } });
    
  } catch (error) {
    console.error(`[CRITICAL] Async analytics tracking failed for code ${shortCode}:`, error.message);
  }
};

/**
 * @route   POST /shorten
 * @desc    Create a shortened URL
 * @access  Public (Rate-limited to 10 requests/hour)
 */
router.post('/shorten', rateLimiter, async (req, res) => {
  try {
    const { originalUrl, customAlias, expiresIn } = req.body;

    // --- FEATURE 1: STRONG URL VALIDATION ---
    // Why use native URL constructor?
    // Regex checks for URLs are notoriously complex and error-prone (vulnerable to ReDoS attacks
    // and bypasses). Using the standard 'new URL()' constructor relies on the browser/Node standard engine,
    // which thoroughly validates protocol, host, and structure.
    if (!originalUrl) {
      return res.status(400).json({ error: 'Validation Error', message: 'Original URL is required.' });
    }

    let validatedUrl;
    try {
      validatedUrl = new URL(originalUrl);
    } catch (urlError) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        message: 'Invalid URL format. Please provide a well-formed absolute URL (e.g., https://example.com).' 
      });
    }

    // Strict protocol verification: block scripts (javascript:), local files (file:), or transfers (ftp:)
    if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
      return res.status(400).json({ 
        error: 'Validation Error', 
        message: 'Only HTTP and HTTPS protocols are allowed. Scripts (javascript:) and FTP protocols are blocked for security.' 
      });
    }

    // --- FEATURE 6: ALIAS LENGTH & SECURITY VALIDATION ---
    let shortCode = '';
    
    if (customAlias) {
      const alias = customAlias.trim();

      // Rule A: Prevent reserved names
      if (RESERVED_ALIASES.has(alias.toLowerCase())) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `The alias '${alias}' is a reserved system keyword. Please choose a different alias.`
        });
      }

      // Rule B: Enforce character set (alphanumeric, hyphen, underscore)
      const aliasRegex = /^[a-zA-Z0-9_-]+$/;
      if (!aliasRegex.test(alias)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Custom alias must only contain alphanumeric characters, hyphens (-), and underscores (_).'
        });
      }

      // Rule C: Length constraint
      if (alias.length > 20) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Custom alias cannot exceed 20 characters.'
        });
      }

      // Rule D: Check uniqueness in MongoDB
      const existingAlias = await Url.findOne({ shortCode: alias });
      if (existingAlias) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'This custom alias is already taken. Please try a different one.'
        });
      }

      shortCode = alias;
    } else {
      // --- FEATURE 4: COLLISION-PROOF SHORT CODE GENERATION ---
      // Why guard against collisions?
      // Even with a large permutation size (~56.8 Billion), random generators can collide,
      // especially under high concurrency or pseudo-random distribution. A retry loop guarantees uniqueness.
      let exists = true;
      let retries = 0;
      const maxRetries = 10;

      while (exists && retries < maxRetries) {
        shortCode = generateShortCode();
        // Check if the shortCode already exists in MongoDB
        const codeCheck = await Url.findOne({ shortCode });
        if (!codeCheck) {
          exists = false; // Code is unique, exit loop
        }
        retries++;
      }

      if (exists) {
        return res.status(500).json({
          error: 'Generation Error',
          message: 'Server failed to generate a unique short link. Please try again.'
        });
      }
    }

    // Calculate expiration date if expiresIn (in days) is provided
    let expiresAt = null;
    if (expiresIn) {
      const days = parseInt(expiresIn, 10);
      if (isNaN(days) || days <= 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Expiration parameter (expiresIn) must be a positive integer representing days.'
        });
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    // Save mapping to database
    const urlPayload = {
      originalUrl: validatedUrl.href,
      shortCode,
      expiresAt
    };

    // Omit customAlias if not provided so MongoDB sparse unique index ignores it
    if (customAlias) {
      urlPayload.customAlias = shortCode;
    }

    const newUrl = new Url(urlPayload);
    await newUrl.save();

    // --- FEATURE 3: UPGRADED REDIS CACHE STRUCTURE ---
    // We store the FULL Url record as a JSON-serialized string in Redis.
    // This allows the redirect GET endpoint to fully check limits, original links,
    // and expiration dates entirely inside Redis memory without touching MongoDB on cache hits.
    const cacheData = {
      originalUrl: newUrl.originalUrl,
      shortCode: newUrl.shortCode,
      expiresAt: newUrl.expiresAt,
      totalClicks: newUrl.totalClicks
    };

    // Cache the document in Redis with a 24-hour Time To Live (TTL) of 86400 seconds.
    // Wrap in try/catch to ensure that if Redis is offline, it fails silently and lets the shortening succeed.
    try {
      const cacheKey = `url:${shortCode}`;
      await redis.set(cacheKey, JSON.stringify(cacheData), 'EX', 86400);
    } catch (cacheError) {
      console.warn('Redis Cache Set Failed (Failing open to MongoDB):', cacheError.message);
    }

    // Return the response containing the shortened URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const shortUrl = `${baseUrl}/${shortCode}`;

    return res.status(201).json({
      message: 'URL shortened successfully',
      shortCode,
      shortUrl,
      originalUrl: newUrl.originalUrl,
      expiresAt: newUrl.expiresAt
    });

  } catch (error) {
    console.error('Error shortening URL:', error);
    return res.status(500).json({ error: 'Server Error', message: 'An unexpected database error occurred.' });
  }
});

/**
 * @route   GET /:code
 * @desc    Redirect to original URL with cache lookup and async analytics
 * @access  Public
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const cacheKey = `url:${code}`;

    let urlData = null;

    // --- FEATURE 3: REDIS READ-THROUGH CACHE LOOKUP ---
    // Step 1: Check Redis memory cache first, wrapping in try/catch in case Redis is offline.
    let cachedRecord = null;
    try {
      cachedRecord = await redis.get(cacheKey);
    } catch (cacheError) {
      console.warn('Redis Cache Get Failed (Falling back to MongoDB):', cacheError.message);
    }

    if (cachedRecord) {
      urlData = JSON.parse(cachedRecord);
    } else {
      // Step 2: Cache Miss. Query MongoDB (optimized via index).
      const dbRecord = await Url.findOne({ shortCode: code });

      if (!dbRecord) {
        return res.status(404).send('<h1>404 Not Found</h1><p>The shortened URL does not exist.</p>');
      }

      // Format full URL object for caching
      urlData = {
        originalUrl: dbRecord.originalUrl,
        shortCode: dbRecord.shortCode,
        expiresAt: dbRecord.expiresAt,
        totalClicks: dbRecord.totalClicks
      };

      // Set cache key with 24h TTL, wrapping in try/catch to absorb Redis failures
      try {
        await redis.set(cacheKey, JSON.stringify(urlData), 'EX', 86400);
      } catch (cacheError) {
        console.warn('Redis Cache Set Failed (Failing open):', cacheError.message);
      }
    }

    // Step 3: Verify expiration constraints
    if (urlData.expiresAt) {
      const expirationDate = new Date(urlData.expiresAt);
      if (expirationDate < new Date()) {
        return res.status(410).send('<h1>410 Gone</h1><p>This shortened link has expired.</p>');
      }
    }

    // --- FEATURE 5: SAFE BACKGROUND ANALYTICS REDIRECT ---
    // Start the asynchronous tracking process in the background.
    // Crucially: we do NOT prefix this with 'await'.
    // The .catch() block ensures that any tracking failures are logged safely
    // and never cause a server crash or block the redirect response.
    trackClick(urlData.shortCode, req).catch((err) => {
      console.error(`[BACKGROUND LOGGER ERROR] Failed to record click metadata for ${urlData.shortCode}:`, err);
    });

    // Step 4: Instantly redirect the client to the destination website
    return res.redirect(302, urlData.originalUrl);

  } catch (error) {
    console.error('Redirection endpoint crash:', error);
    return res.status(500).send('<h1>500 Internal Server Error</h1><p>Something went wrong processing your request.</p>');
  }
});

module.exports = router;
