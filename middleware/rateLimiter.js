const redis = require('../config/redis');

/**
 * --- PRODUCTION-GRADE ATOMIC RATE LIMITING ---
 * 
 * Why use Redis for rate limiting?
 * Rate limiting is extremely high-frequency—it runs on every incoming request of a specific type.
 * Doing rate-limit tracking in MongoDB would cause massive write overhead and database locking.
 * Redis is an in-memory database that executes commands in nanoseconds, making it perfect for this task.
 * 
 * The INCR + EXPIRE Pattern:
 * 1. `INCR` is atomic: Multiple parallel requests from the same IP will be sequenced strictly
 *    by Redis, eliminating race conditions.
 * 2. Key Expiry: By calling `EXPIRE` only when the counter is initialized to 1, we ensure the window
 *    runs for exactly 1 hour, and Redis will automatically garbage collect the key once the hour expires,
 *    preventing memory leaks.
 * 3. Fail-Safe Fallback: If the Redis server experiences a hiccup, we catch the error, log it, and let
 *    the request proceed (fail-open strategy) so that cache issues do not crash the user-facing application.
 */
const rateLimiter = async (req, res, next) => {
  try {
    // Extract the client's IP, checking common proxy headers in case the app is hosted behind Nginx,
    // Cloudflare, or another load balancer.
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    
    // Clean IP string (in case it returns comma-separated proxies or IPv6 mapping)
    const ip = rawIp.split(',')[0].trim();
    
    // Key structured with namespaces to avoid overlap with URL cache
    const redisKey = `rate-limit:shorten:${ip}`;
    
    // Increment request count atomically
    const currentRequests = await redis.incr(redisKey);
    
    // If it's the very first request in this 1-hour window, set the key to expire in 3600 seconds (1 hour)
    if (currentRequests === 1) {
      await redis.expire(redisKey, 3600);
    }
    
    // Fetch remaining time (TTL) to supply back in the response headers
    const ttl = await redis.ttl(redisKey);
    
    // Set standard industry rate limit headers
    res.setHeader('X-RateLimit-Limit', 10);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, 10 - currentRequests));
    res.setHeader('X-RateLimit-Reset', ttl > 0 ? ttl : 0);

    // If rate limit is breached, abort request with 429 Too Many Requests
    if (currentRequests > 10) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `You have exceeded the rate limit of 10 URL shortening requests per hour. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
        retryAfterSeconds: ttl
      });
    }
    
    // Proceed to the next middleware/route handler
    next();
  } catch (error) {
    // Fail-open: log the error but do not block the user. Service availability is prioritized.
    console.error('Rate Limiter Middleware Error (Failing Open):', error.message);
    next();
  }
};

module.exports = rateLimiter;
