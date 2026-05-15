const mongoose = require('mongoose');

const busAlertSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    destinationName: { type: String, required: true },
    location: {
        latitude: Number,
        longitude: Number
    },
    radius: { type: Number, default: 0.5 }, // Alarm range in km
    status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BusAlert', busAlertSchema);
