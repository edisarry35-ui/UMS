const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function addAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/caps_db');
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ username: 'admin1', role: 'admin' });
    if (existing) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const hashed = await bcrypt.hash('admin123', 10);
    const admin = new User({ role: 'admin', username: 'admin1', password: hashed, name: 'Admin User' });
    await admin.save();
    console.log('Admin user created');
  } catch (err) {
    console.error('Error adding admin:', err);
  } finally {
    mongoose.connection.close();
  }
}

addAdmin();
