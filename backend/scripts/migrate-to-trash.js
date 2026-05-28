#!/usr/bin/env node
require('dotenv').config();
const connectDB = require("../config/db");
const Notification = require("../models/Notification");
const Announcement = require("../models/Announcement");
const TrashItem = require("../models/TrashItem");

const migrate = async () => {
  await connectDB();
  try {
    // Notifications
    const trashedNotifications = await Notification.find({ deletedAt: { $ne: null } });
    console.log(`Found ${trashedNotifications.length} trashed notifications`);
    let notifCount = 0;
    for (const n of trashedNotifications) {
      const exists = await TrashItem.findOne({ originalCollection: 'Notification', originalId: n._id });
      if (!exists) {
        await TrashItem.create({ originalCollection: 'Notification', originalId: n._id, data: n.toObject(), deletedAt: n.deletedAt });
        notifCount++;
      }
    }
    console.log(`Migrated ${notifCount} notifications to TrashItem`);

    // Announcements
    const trashedAnnouncements = await Announcement.find({ deletedAt: { $ne: null } });
    console.log(`Found ${trashedAnnouncements.length} trashed announcements`);
    let annCount = 0;
    for (const a of trashedAnnouncements) {
      const exists = await TrashItem.findOne({ originalCollection: 'Announcement', originalId: a._id });
      if (!exists) {
        await TrashItem.create({ originalCollection: 'Announcement', originalId: a._id, data: a.toObject(), deletedAt: a.deletedAt });
        annCount++;
      }
    }
    console.log(`Migrated ${annCount} announcements to TrashItem`);

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration error', err);
    process.exit(1);
  }
};

migrate();
