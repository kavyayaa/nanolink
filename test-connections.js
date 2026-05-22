require('dotenv').config();

const mongoose = require('mongoose');
const Redis = require('ioredis');

async function testConnections() {
  console.log('\n=========================================');
  console.log('   STARTING DB & CACHE CONNECTION CHECKS');
  console.log('=========================================');
  
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/url_shortener';
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  
  // 1. Test MongoDB Mongoose Connection
  console.log(`Testing MongoDB at: ${mongoUri}`);
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB: CONNECTION ESTABLISHED SUCCESSFULLY!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ MongoDB: CONNECTION FAILED!');
    console.error(`   Error details: ${error.message}`);
    console.error('   Please verify that your MongoDB local service (mongod) is active.');
  }
  
  // 2. Test ioredis connection
  console.log(`Testing Redis at: ${redisUrl}`);
  try {
    const redis = new Redis(redisUrl, { 
      maxRetriesPerRequest: 0, // Fail immediately for quick checks
      connectTimeout: 5000 
    });

    await new Promise((resolve, reject) => {
      redis.on('connect', () => {
        console.log('✅ Redis: CONNECTION ESTABLISHED SUCCESSFULLY!');
        redis.disconnect();
        resolve();
      });
      redis.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('❌ Redis: CONNECTION FAILED!');
    console.error(`   Error details: ${error.message}`);
    console.error('   Please verify that your Redis Server (redis-server) is active on port 6379.');
  }
  
  console.log('=========================================\n');
}

testConnections();
