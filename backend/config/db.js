const dns = require("dns");
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (process.env.DNS_SERVERS) {
      const servers = process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean);
      if (servers.length) {
        dns.setServers(servers);
        console.log(`Using DNS servers: ${servers.join(", ")}`);
      }
    }

    // Use MONGO_URI from .env, fallback to local MongoDB if not set
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/caps_db";

    const conn = await mongoose.connect(mongoURI); // no options needed in Mongoose 7+
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
