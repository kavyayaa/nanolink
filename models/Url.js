const mongoose = require('mongoose');

/**
 * Mongoose Schema representing a shortened URL mapping.
 * 
 * --- PRODUCTION OPTIMIZATION: DATABASE INDEXING ---
 * We define { unique: true } on the `shortCode` field. Mongoose (and MongoDB) will automatically
 * create an index on this field.
 * 
 * WHY INDEXES MATTER:
 * In a real-world system with millions of shortened links, looking up a record by its `shortCode`
 * without an index requires MongoDB to perform a Collection Scan (examining every document in the database
 * sequentially until it finds the matching one, which is O(N) time complexity).
 * 
 * Creating an index on `shortCode` creates a B-Tree structure. Redirection lookups can now traverse this
 * B-Tree in O(log N) time, reducing search latency from hundreds of milliseconds to under a millisecond.
 */
const UrlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: [true, 'Original URL is required'],
    trim: true
  },
  shortCode: {
    type: String,
    required: [true, 'Short code is required'],
    unique: true,
    index: true, // Creates a single-field index for ultra-fast query lookups
    trim: true
  },
  customAlias: {
    type: String,
    index: {
      unique: true,
      sparse: true
    },
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null means the link is permanent and never expires
  },
  totalClicks: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Url', UrlSchema);
