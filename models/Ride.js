const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    rideId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    driverId: { type: String, required: false }, // Optional initially
    pickupLocation: {
        address: { type: String, required: true },
        latitude: { type: Number },
        longitude: { type: Number }
    },
    dropLocation: {
        address: { type: String, required: true },
        latitude: { type: Number },
        longitude: { type: Number }
    },
    vehicleType: {
        id: { type: String },
        name: { type: String },
        icon: { type: String }
    },
    fare: { type: Number, required: true },
    status: {
        type: String,
        enum: ['searching', 'accepted', 'ongoing', 'completed', 'cancelled'],
        default: 'searching'
    },
    otp: { type: String },
    distance: { type: String, required: true },
    duration: String,
    rating: Number,
    paymentStatus: { type: String, default: 'pending' },
    startTime: Date,
    endTime: Date,
    // New fields for Courier
    type: { type: String, default: 'ride', enum: ['ride', 'courier'] }, // Distinguish between Ride and Courier
    parcelImage: String,
    parcelDetails: String,
    weight: String,
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);
