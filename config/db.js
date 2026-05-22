const mongoose = require('mongoose');

/**
 * Establishes a connection to the MongoDB instance using Mongoose.
 * Wrapping the connection logic in an async function with try/catch ensures
 * that any failures (e.g. database not running, invalid credentials) are caught
 * gracefully, preventing the entire application process from crashing silently.
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/url_shortener';

    console.log(`Connecting to MongoDB at: ${mongoUri}...`);

    // We do not require deprecated options (like useNewUrlParser, useUnifiedTopology) in Mongoose v6/v7/v8
    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure code if connection is critical for application startup
    process.exit(1);
  }
};

// Set up connection event listeners to track connection state during execution
mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect or waiting for recovery...');
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connection active');
});

module.exports = connectDB;
