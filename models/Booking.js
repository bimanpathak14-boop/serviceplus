const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    bookingId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    providerId: { type: String, required: true },
    category: { type: String },
    subCategory: { type: String },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled'],
        default: 'confirmed'
    },
    otp: { type: String, required: true },
    address: { type: String },
    price: { type: Number },
    providerLocation: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    userLocation: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    isProject: { type: Boolean, default: false },
    expectedDuration: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
