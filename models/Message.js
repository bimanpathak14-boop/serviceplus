const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    rideId: { type: String, required: true },
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    senderType: { type: String, enum: ['user', 'driver'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('Message', messageSchema);
