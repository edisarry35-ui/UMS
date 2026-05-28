const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema(
  {
    backgroundImage: {
      type: String,
      default: null, // URL or base64 of the background image
      description: "Background image for the landing page (can be URL or base64)"
    },
    backgroundImageBase64: {
      type: String,
      default: null, // Full base64 encoded image
      description: "Full base64 encoded background image"
    },
    backgroundImageFileName: {
      type: String,
      default: null,
      description: "Original filename of uploaded background"
    },
    backgroundImageMimeType: {
      type: String,
      default: "image/png",
      description: "MIME type of the background image"
    },
    siteName: {
      type: String,
      default: "UAQTEA Management System"
    },
    siteDescription: {
      type: String,
      default: "A centralized platform to manage students, staff, payments, and announcements"
    }
  },
  { timestamps: true }
);

// Ensure only one document exists (singleton pattern)
SiteSettingsSchema.statics.getInstance = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      siteName: "UAQTEA Management System",
      siteDescription: "A centralized platform to manage students, staff, payments, and announcements"
    });
  }
  return settings;
};

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);
