const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/caps_db';
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const toDrop = ['1st_2025-2026', '2nd_2025-2026', '1st_2026-2027', '2nd_2026-2027'];
    const collections = await mongoose.connection.db.listCollections().toArray();
    const existing = collections.map(c => c.name);

    for (const name of toDrop) {
      if (existing.includes(name)) {
        await mongoose.connection.db.dropCollection(name);
        console.log('Dropped collection', name);
      } else {
        console.log('Collection not found', name);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
})();
