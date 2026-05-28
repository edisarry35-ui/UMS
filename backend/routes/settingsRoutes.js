const express = require('express');
const router = express.Router();
const SiteSettings = require('../models/SiteSettings');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// GET all settings
router.get('/', async (req, res) => {
  try {
    const settings = await SiteSettings.getInstance();
    const out = settings.toObject();
    if (out.backgroundImage) {
      out.backgroundImage = new URL(out.backgroundImage, `${req.protocol}://${req.get('host')}`).toString();
    } else {
      out.backgroundImage = `${req.protocol}://${req.get('host')}/uploads/ACLC%20ASSET%20LIGHT%20MODE.png`;
    }
    res.json(out);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST upload background image
router.post('/upload/background', async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const image = req.files.image;
    const fileName = `background-${Date.now()}-${image.name}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file to uploads directory
    await image.mv(filePath);

    // Read file and convert to base64
    const fileData = fs.readFileSync(filePath);
    const base64Data = fileData.toString('base64');
    const mimeType = image.mimetype;

    // Update settings in database
    const settings = await SiteSettings.getInstance();
    settings.backgroundImage = `/uploads/${fileName}`;
    settings.backgroundImageBase64 = `data:${mimeType};base64,${base64Data}`;
    settings.backgroundImageFileName = image.name;
    settings.backgroundImageMimeType = mimeType;
    await settings.save();

    res.json({
      success: true,
      message: 'Background image uploaded successfully',
      backgroundImage: settings.backgroundImage ? new URL(settings.backgroundImage, `${req.protocol}://${req.get('host')}`).toString() : null,
      fileName: fileName
    });
  } catch (error) {
    console.error('Error uploading background:', error);
    res.status(500).json({ error: 'Failed to upload background image' });
  }
});

// PUT update settings
router.put('/', async (req, res) => {
  try {
    const { siteName, siteDescription, backgroundImage } = req.body;
    
    const settings = await SiteSettings.getInstance();
    
    if (siteName) settings.siteName = siteName;
    if (siteDescription) settings.siteDescription = siteDescription;
    if (backgroundImage) settings.backgroundImage = backgroundImage;
    
    await settings.save();
    const out = settings.toObject();
    if (out.backgroundImage) {
      out.backgroundImage = new URL(out.backgroundImage, `${req.protocol}://${req.get('host')}`).toString();
    }
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: out
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// DELETE background image
router.delete('/background', async (req, res) => {
  try {
    const settings = await SiteSettings.getInstance();
    
    // Delete file from uploads if it exists
    if (settings.backgroundImage) {
      const filePath = path.join(__dirname, '..', settings.backgroundImage);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    settings.backgroundImage = null;
    settings.backgroundImageBase64 = null;
    settings.backgroundImageFileName = null;
    await settings.save();
    
    res.json({ success: true, message: 'Background image removed' });
  } catch (error) {
    console.error('Error deleting background:', error);
    res.status(500).json({ error: 'Failed to delete background' });
  }
});

module.exports = router;
