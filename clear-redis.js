const redis = require('./config/redis');

async function clearRedis() {
  console.log('\n=========================================');
  console.log('         RESETTING REDIS CACHE');
  console.log('=========================================');
  
  try {
    // Wait for redis connection
    await new Promise((resolve) => {
      if (redis.status === 'ready') resolve();
      redis.once('ready', resolve);
    });

    console.log('Sending FLUSHALL to Redis...');
    const result = await redis.flushall();
    console.log(`✅ Redis Flushed: ${result}`);
    
    console.log('=========================================');
    console.log('🎉 Redis cache reset complete!');
    console.log('=========================================\n');
  } catch (error) {
    console.error('❌ Error flushing Redis:', error.message);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
}

clearRedis();
