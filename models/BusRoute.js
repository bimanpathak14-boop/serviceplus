const mongoose = require('mongoose');

const busRouteSchema = new mongoose.Schema({
    routeId: { type: String, required: true, unique: true },
    number: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['Local', 'Express', 'AC', 'Intercity'], default: 'Local' },
    status: { type: String, enum: ['Active', 'Delayed', 'Suspended'], default: 'Active' },
    freq: { type: String },
    stopsCount: { type: Number },
    baseFare: { type: String },
    nextBus: { type: String },
    congestion: { type: String, enum: ['Low', 'Moderate', 'High'], default: 'Low' },
    stops: [{
        name: { type: String },
        time: { type: String }, // e.g., "+5 min" from start
        location: {
            latitude: Number,
            longitude: Number
        }
    }],
    schedule: [String], // Array of daily timings
    activeBuses: [{
        busId: String,
        currentLocation: {
            latitude: Number,
            longitude: Number
        },
        lastUpdated: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('BusRoute', busRouteSchema);
