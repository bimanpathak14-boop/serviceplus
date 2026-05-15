const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientType: { type: String, enum: ['user', 'provider', 'all_users', 'all_providers', 'everyone'], required: true },
    recipientId: { type: String }, // Optional, if specific user/provider
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'offer', 'alert'], default: 'info' },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
