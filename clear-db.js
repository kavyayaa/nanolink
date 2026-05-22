require('dotenv').config();
const mongoose = require('mongoose');

async function clearDatabase() {
  console.log('\n=========================================');
  console.log('       RESETTING MONGODB DATABASE');
  console.log('=========================================');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/url_shortener';

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;

    // Drop the urls collection if it exists
    const urlCollectionExists = await db.listCollections({ name: 'urls' }).hasNext();
    if (urlCollectionExists) {
      await db.collection('urls').drop();
      console.log('✅ Dropped collection: urls');
    } else {
      console.log('ℹ️ Collection "urls" did not exist.');
    }

    // Drop the clicks collection if it exists
    const clickCollectionExists = await db.listCollections({ name: 'clicks' }).hasNext();
    if (clickCollectionExists) {
      await db.collection('clicks').drop();
      console.log('✅ Dropped collection: clicks');
    } else {
      console.log('ℹ️ Collection "clicks" did not exist.');
    }

    console.log('=========================================');
    console.log('🎉 MongoDB database reset complete!');
    console.log('=========================================\n');
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

clearDatabase();
