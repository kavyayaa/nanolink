const mongoose = require('mongoose');

/**
 * Mongoose Schema representing a click event.
 * Stores geo-location, browser, device, and referral information for analytics.
 * 
 * --- PRODUCTION OPTIMIZATION: COMPOUND INDEX ---
 * We define an explicit compound index on: { shortCode: 1, timestamp: -1 }
 * 
 * WHY A COMPOUND INDEX IS VITAL HERE:
 * 1. Filtering + Sorting: Analytics queries operate strictly on a single `shortCode` and then filter
 *    and group click records by the `timestamp` field (specifically over the last 7 days).
 * 2. Sequential Access: By joining `shortCode` and `timestamp` into a single index, MongoDB can
 *    fetch the relevant clicks for a shortCode in chronological or reverse-chronological order
 *    without loading unneeded records or performing expensive, blocking in-memory sorts (called 'Stage SORT').
 * 3. Memory Savings: Compound indexes dramatically speed up aggregations, reducing server CPU and Memory load.
 */
const ClickSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: [true, 'Short code is required'],
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  country: {
    type: String,
    default: 'Unknown',
    trim: true
  },
  city: {
    type: String,
    default: 'Unknown',
    trim: true
  },
  device: {
    type: String,
    default: 'Desktop', // E.g., Desktop, Mobile, Tablet
    trim: true
  },
  browser: {
    type: String,
    default: 'Unknown', // E.g., Chrome, Safari, Firefox
    trim: true
  },
  referrer: {
    type: String,
    default: 'Direct',
    trim: true
  }
});

// Define the compound index on shortCode (ascending) and timestamp (descending)
// This is perfectly aligned with fetching most recent clicks for a specific shortCode.
ClickSchema.index({ shortCode: 1, timestamp: -1 });

module.exports = mongoose.model('Click', ClickSchema);
