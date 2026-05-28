require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    await connectDB();
    const existing = await User.findOne({ username: 'admin1' });
    if (existing) {
      console.log('admin1 already exists');
      process.exit(0);
    }
    const hashed = await bcrypt.hash('admin123', 10);
    const user = new User({ role: 'admin', username: 'admin1', password: hashed });
    await user.save();
    console.log('admin1 created');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
