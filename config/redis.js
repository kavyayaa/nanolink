const Redis = require('ioredis');

/**
 * Initializes and exports the Redis client instance using ioredis.
 * Redis is utilized in this architecture for two primary reasons:
 * 1. High-Performance Caching: Resolving active shortened links out of memory (Redis)
 *    is order-of-magnitude faster than querying disk-bound primary databases (MongoDB).
 * 2. High-Speed Rate Limiting: Performing atomic rate limiting counters without database overhead.
 */

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log(`Connecting to Redis at: ${redisUrl}...`);

// Create a new Redis client instance. ioredis handles reconnection automatically.
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay; // Backoff strategy for reconnect attempts
  }
});

// Redis connection event listeners
redis.on('connect', () => {
  console.log('Redis connected successfully.');
});

redis.on('error', (err) => {
  console.error('Redis Connection Error:', err.message);
});

redis.on('close', () => {
  console.warn('Redis connection closed.');
});

module.exports = redis;
