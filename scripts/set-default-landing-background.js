#!/usr/bin/env node
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const SiteSettings = require('../backend/models/SiteSettings');

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/caps_db';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const imageRelativePath = '/uploads/background-1779605379383-ACLC ASSET LIGHT MODE.png';
    const imageFile = path.join(__dirname, '..', 'backend', imageRelativePath);

    if (!fs.existsSync(imageFile)) {
      throw new Error(`Image file not found: ${imageFile}`);
    }

    const fileData = fs.readFileSync(imageFile);
    const mimeType = 'image/png';
    const base64Data = fileData.toString('base64');
    const imageBase64 = `data:${mimeType};base64,${base64Data}`;

    const settings = await SiteSettings.getInstance();
    settings.backgroundImage = imageRelativePath;
    settings.backgroundImageBase64 = imageBase64;
    settings.backgroundImageFileName = 'ACLC ASSET LIGHT MODE.png';
    settings.backgroundImageMimeType = mimeType;
    await settings.save();

    console.log('Updated SiteSettings with default landing page background.');
    console.log('backgroundImage:', settings.backgroundImage);
    mongoose.connection.close();
  } catch (err) {
    console.error('Failed to update default background:', err.message || err);
    process.exit(1);
  }
})();
