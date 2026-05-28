#!/usr/bin/env node
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const API = process.env.API_URL || 'http://localhost:5000';
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node scripts/upload-background.js <image-path>');
  process.exit(1);
}

(async () => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      process.exit(1);
    }

    const form = new FormData();
    form.append('image', fs.createReadStream(filePath));

    const headers = form.getHeaders();

    console.log(`Uploading ${filePath} to ${API}/api/settings/upload/background ...`);
    const res = await axios.post(`${API}/api/settings/upload/background`, form, { headers, maxContentLength: Infinity, maxBodyLength: Infinity });

    console.log('Upload response:', res.data);
    if (res.data && res.data.backgroundImage) {
      console.log('Background image URL:', res.data.backgroundImage);
    }
  } catch (err) {
    console.error('Upload failed:', err.response?.data || err.message || err);
    process.exit(1);
  }
})();
