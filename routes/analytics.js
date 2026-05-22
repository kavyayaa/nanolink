const express = require('express');
const router = express.Router();

// Import Models
const Url = require('../models/Url');
const Click = require('../models/Click');

/**
 * @route   GET /analytics/:code
 * @desc    Fetch analytics dashboard data for a given short code
 * @access  Public
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    // 1. Verify that the short code actually exists in the database
    const urlDoc = await Url.findOne({ shortCode: code });
    if (!urlDoc) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'The requested short code was not found. Cannot retrieve analytics.' 
      });
    }

    // 2. Define the date threshold (strictly the last 7 calendar days including today)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // Go back 6 days (giving 7 days total when including today)
    startDate.setHours(0, 0, 0, 0); // Start of day to get a clean boundaries range

    /**
     * --- MONGODB AGGREGATION PIPELINES ---
     * 
     * Why use MongoDB Aggregations?
     * Instead of fetching thousands of raw click documents into the Node.js server and sorting/grouping them in
     * memory (which wastes massive bandwidth and memory, causing server bottlenecks), we run Aggregations.
     * Mongoose sends the query commands to MongoDB, which performs high-speed, indexed counts and groupings close
     * to the database engine and returns only the finalized small summarized data.
     * 
     * Pipeline 1: Clicks per day for the last 7 days.
     * - $match: Filters click events matching our shortCode and starting from startDate.
     * - $group: Groups documents by transforming the timestamp to a YYYY-MM-DD date string.
     * - $sort: Arranges dates chronologically.
     */
    const clicksPerDayRaw = await Click.aggregate([
      {
        $match: {
          shortCode: code,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // --- PREMIUM FEATURE: ZERO-FILLING GAPS FOR THE GRAPH ---
    // If a short link had clicks on Day 1 and Day 3, but 0 clicks on Day 2, MongoDB will omit Day 2 entirely.
    // Chart.js requires a continuous array of dates to render labels nicely.
    // We map MongoDB's results into a fast Map, then iterate over the past 7 calendar dates, filling in 0 for gaps.
    const clicksMap = new Map();
    clicksPerDayRaw.forEach(item => {
      clicksMap.set(item._id, item.count);
    });

    const clicksPerDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      clicksPerDay.push({
        date: dateStr,
        count: clicksMap.get(dateStr) || 0
      });
    }

    /**
     * Pipeline 2: Top 5 Countries
     * Groups clicks by country name, counts them, sorts descending, and limits to 5.
     */
    const topCountries = await Click.aggregate([
      {
        $match: { shortCode: code }
      },
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    /**
     * Pipeline 3: Device Breakdown
     * Groups by device name (Mobile, Desktop, Tablet) to show layout distribution.
     */
    const deviceBreakdown = await Click.aggregate([
      {
        $match: { shortCode: code }
      },
      {
        $group: {
          _id: '$device',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    /**
     * Pipeline 4: Top 5 Browsers
     * Groups by browser name (Chrome, Safari, Firefox, etc.) to show user profile demographics.
     */
    const topBrowsers = await Click.aggregate([
      {
        $match: { shortCode: code }
      },
      {
        $group: {
          _id: '$browser',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // 3. Assemble and return the combined analytics packet
    return res.status(200).json({
      shortCode: code,
      originalUrl: urlDoc.originalUrl,
      createdAt: urlDoc.createdAt,
      expiresAt: urlDoc.expiresAt,
      totalClicks: urlDoc.totalClicks,
      analytics: {
        clicksPerDay,
        topCountries: topCountries.map(c => ({ country: c._id, count: c.count })),
        deviceBreakdown: deviceBreakdown.map(d => ({ device: d._id, count: d.count })),
        topBrowsers: topBrowsers.map(b => ({ browser: b._id, count: b.count }))
      }
    });

  } catch (error) {
    console.error(`Error gathering analytics for shortCode ${req.params.code}:`, error);
    return res.status(500).json({ 
      error: 'Server Error', 
      message: 'Failed to aggregate url click metrics. Please check server logs.' 
    });
  }
});

module.exports = router;
